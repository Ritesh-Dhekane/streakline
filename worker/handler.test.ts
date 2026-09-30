import { describe, expect, it, vi } from 'vitest'

import { rawEvents, rawUser } from '../shared/github/fixtures'
import { DAILY_LOOKUPS } from '../shared/limits'
import { handle, type Deps, type Env, type LookupStore, type ResponseCache } from './handler'

const ORIGIN = 'https://ritesh-dhekane.github.io'
const ENV: Env = { GITHUB_TOKEN: 't0ken', ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5173` }
const NOW = new Date('2026-01-05T12:00:00Z')

class MemoryCache implements ResponseCache {
  store = new Map<string, Response>()
  async match(key: Request) {
    return this.store.get(key.url)?.clone()
  }
  async put(key: Request, response: Response) {
    this.store.set(key.url, response)
  }
}

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init })

function setup(graphql: () => Response = () => json({ data: { user: rawUser() } })) {
  const cache = new MemoryCache()
  const pending: Promise<unknown>[] = []
  const fetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) =>
    String(input).endsWith('/graphql') ? graphql() : json(rawEvents),
  )
  const deps: Deps = { cache, fetch, now: () => NOW, waitUntil: (p) => pending.push(p) }
  const call = async (path: string, init: RequestInit = {}, env: Env = ENV) => {
    const response = await handle(
      new Request(`https://api.example${path}`, { headers: { Origin: ORIGIN }, ...init }),
      env,
      deps,
    )
    await Promise.all(pending)
    return response
  }
  return { call, cache, fetch }
}

describe('handle', () => {
  it('returns shaped stats with CORS for the site', async () => {
    const { call } = setup()
    const response = await call('/api/user/octo?year=2026')
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(response.headers.get('X-Streakline-Cache')).toBe('miss')
    const body = (await response.json()) as { profile: { login: string }; year: number }
    expect(body.profile.login).toBe('octo')
    expect(body.year).toBe(2026)
  })

  it('defaults to the current year', async () => {
    const { call } = setup()
    const body = (await (await call('/api/user/octo')).json()) as { year: number }
    expect(body.year).toBe(2026)
  })

  it('serves repeat requests from the cache, case-insensitively', async () => {
    const { call, fetch } = setup()
    await call('/api/user/octo?year=2026')
    const calls = fetch.mock.calls.length
    const second = await call('/api/user/OCTO?year=2026')
    expect(second.status).toBe(200)
    expect(second.headers.get('X-Streakline-Cache')).toBe('hit')
    expect(second.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(fetch.mock.calls.length).toBe(calls)
  })

  it('rejects bad input before calling GitHub', async () => {
    const { call, fetch } = setup()
    expect((await call('/api/user/bad_name')).status).toBe(400)
    expect((await call('/api/user/octo?year=1999')).status).toBe(400)
    expect((await call('/api/user/octo?year=2027')).status).toBe(400)
    expect((await call('/api/user/octo?year=twenty')).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps GitHub errors and caches only not-found', async () => {
    const notFound = setup(() =>
      json({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }),
    )
    const missing = await notFound.call('/api/user/ghost')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'not_found' } })
    expect(notFound.cache.store.size).toBe(1)

    const limited = setup(() => new Response('', { status: 429 }))
    const tooMany = await limited.call('/api/user/octo')
    expect(tooMany.status).toBe(429)
    expect(tooMany.headers.get('Retry-After')).toBe('60')
    expect(limited.cache.store.size).toBe(0)

    const down = setup(() => new Response('', { status: 503 }))
    expect((await down.call('/api/user/octo')).status).toBe(502)
    expect(down.cache.store.size).toBe(0)
  })

  it('answers preflight and refuses other origins and methods', async () => {
    const { call } = setup()
    const preflight = await call('/api/user/octo', { method: 'OPTIONS' })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Methods')).toContain('GET')

    const other = await call('/api/user/octo', { headers: { Origin: 'https://evil.example' } })
    expect(other.headers.get('Access-Control-Allow-Origin')).toBe(null)

    expect((await call('/api/user/octo', { method: 'POST' })).status).toBe(405)
    expect((await call('/api/other')).status).toBe(404)
  })

  it('reports a missing token instead of calling GitHub', async () => {
    const { call, fetch } = setup()
    const response = await call('/api/user/octo', {}, { ALLOWED_ORIGINS: ORIGIN })
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ error: { code: 'not_configured' } })
    expect(fetch).not.toHaveBeenCalled()
  })
})

class MemoryLookups implements LookupStore {
  rows: { visitor: string; login: string; at: number }[] = []
  async recent(visitor: string, since: number) {
    return this.rows.filter((row) => row.visitor === visitor && row.at > since)
  }
  async record(visitor: string, login: string, at: number) {
    this.rows.push({ visitor, login, at })
  }
}

describe('per-visitor lookup limit', () => {
  function limited(graphql?: () => Response) {
    const base = setup(graphql)
    const lookups = new MemoryLookups()
    const pending: Promise<unknown>[] = []
    const deps: Deps = {
      cache: base.cache,
      fetch: base.fetch,
      now: () => NOW,
      waitUntil: (p) => pending.push(p),
      lookups,
    }
    const call = async (login: string, ip = '203.0.113.7') => {
      const response = await handle(
        new Request(`https://api.example/api/user/${login}`, {
          headers: { Origin: ORIGIN, 'CF-Connecting-IP': ip },
        }),
        ENV,
        deps,
      )
      await Promise.all(pending)
      return response
    }
    return { call, lookups, fetch: base.fetch }
  }

  it(`allows ${DAILY_LOOKUPS} different users a day, then refuses new ones`, async () => {
    const { call, fetch } = limited()
    for (let i = 0; i < DAILY_LOOKUPS; i++) {
      const response = await call(`user${i}`)
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Lookups-Remaining')).toBe(String(DAILY_LOOKUPS - 1 - i))
    }
    const calls = fetch.mock.calls.length
    const refused = await call('one-more')
    expect(refused.status).toBe(429)
    expect(await refused.json()).toMatchObject({ error: { code: 'quota_exceeded' } })
    expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(refused.headers.get('X-Lookups-Reset')).toBe('2026-01-06T12:00:00.000Z')
    expect(refused.headers.get('Access-Control-Expose-Headers')).toContain('X-Lookups-Remaining')
    expect(fetch.mock.calls.length).toBe(calls)
  })

  it('keeps repeats, exempt profiles and other visitors free', async () => {
    const { call, lookups } = limited()
    for (let i = 0; i < DAILY_LOOKUPS; i++) await call(`user${i}`)
    expect((await call('USER3')).status).toBe(200)
    expect((await call('Ritesh-Dhekane')).status).toBe(200)
    expect((await call('torvalds')).status).toBe(200)
    const other = await call('one-more', '198.51.100.9')
    expect(other.status).toBe(200)
    expect(other.headers.get('X-Lookups-Remaining')).toBe(String(DAILY_LOOKUPS - 1))
    expect(lookups.rows).toHaveLength(DAILY_LOOKUPS + 1)
  })

  it('does not charge for users that do not exist', async () => {
    const { call, lookups } = limited(() =>
      json({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }),
    )
    const response = await call('ghost')
    expect(response.status).toBe(404)
    expect(response.headers.get('X-Lookups-Remaining')).toBe(String(DAILY_LOOKUPS))
    expect(lookups.rows).toHaveLength(0)
  })

  it('charges for cached profiles too, and never stores the IP', async () => {
    const { call, lookups } = limited()
    await call('octo', '203.0.113.7')
    const cached = await call('octo', '198.51.100.9')
    expect(cached.headers.get('X-Streakline-Cache')).toBe('hit')
    expect(cached.headers.get('X-Lookups-Remaining')).toBe(String(DAILY_LOOKUPS - 1))
    expect(lookups.rows).toHaveLength(2)
    expect(JSON.stringify(lookups.rows)).not.toContain('203.0.113.7')
  })
})
