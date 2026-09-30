import { describe, expect, it, vi } from 'vitest'

import { fetchUserStats, GitHubError, isValidUsername } from './client'
import { rawEvents, rawUser } from './fixtures'

const NOW = new Date('2026-01-05T12:00:00Z')

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init })

function fakeGitHub(
  graphql: () => Response | Promise<Response>,
  events: () => Response = () => json(rawEvents),
) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input)
    return url.endsWith('/graphql') ? graphql() : events()
  })
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
    return 'ok'
  } catch (err) {
    return err instanceof GitHubError ? err.kind : 'unexpected'
  }
}

describe('fetchUserStats', () => {
  it('returns shaped stats and sends the token and year range', async () => {
    const fetch = fakeGitHub(() => json({ data: { user: rawUser() } }))
    const stats = await fetchUserStats('octo', 2026, { token: 't0ken', fetch, now: NOW })

    expect(stats.profile.login).toBe('octo')
    expect(stats.recentActivity).toHaveLength(1)
    const [url, init] = fetch.mock.calls.find(([u]) => String(u).endsWith('/graphql'))!
    expect(String(url)).toBe('https://api.github.com/graphql')
    expect((init?.headers as Record<string, string>).Authorization).toBe('bearer t0ken')
    const body = JSON.parse(String(init?.body))
    expect(body.variables).toMatchObject({
      login: 'octo',
      from: '2026-01-01T00:00:00Z',
      to: NOW.toISOString(),
      previousFrom: '2025-01-01T00:00:00Z',
    })
  })

  it('reads up to three pages of public events', async () => {
    const page = Array.from({ length: 100 }, () => rawEvents[0]!)
    const fetch = fakeGitHub(
      () => json({ data: { user: rawUser() } }),
      () => json(page),
    )
    const stats = await fetchUserStats('octo', 2026, { token: 't', fetch, now: NOW })
    expect(stats.recentActivity).toHaveLength(300)
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('still works when events fail', async () => {
    const fetch = fakeGitHub(
      () => json({ data: { user: rawUser() } }),
      () => new Response('nope', { status: 500 }),
    )
    const stats = await fetchUserStats('octo', 2026, { token: 't', fetch, now: NOW })
    expect(stats.recentActivity).toEqual([])
  })

  it('maps GitHub failures to clear error kinds', async () => {
    const run = (graphql: () => Response | Promise<Response>) =>
      kindOf(fetchUserStats('octo', 2026, { token: 't', fetch: fakeGitHub(graphql), now: NOW }))

    expect(
      await run(() =>
        json({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'x' }] }),
      ),
    ).toBe('not_found')
    expect(await run(() => json({ errors: [{ type: 'RATE_LIMITED', message: 'x' }] }))).toBe(
      'rate_limited',
    )
    expect(
      await run(() => new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })),
    ).toBe('rate_limited')
    expect(await run(() => new Response('', { status: 429 }))).toBe('rate_limited')
    expect(await run(() => new Response('', { status: 502 }))).toBe('upstream')
    expect(await run(() => Promise.reject(new TypeError('network down')))).toBe('upstream')
    expect(await run(() => json({ errors: [{ message: 'something else' }] }))).toBe('upstream')
  })

  it('rejects invalid usernames before calling GitHub', async () => {
    const fetch = fakeGitHub(() => json({}))
    expect(await kindOf(fetchUserStats('bad name!', 2026, { token: 't', fetch }))).toBe(
      'bad_request',
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('isValidUsername', () => {
  it('follows GitHub username rules', () => {
    for (const ok of ['octo', 'a', 'Octo-Cat', 'a1-b2', 'x'.repeat(39)])
      expect(isValidUsername(ok)).toBe(true)
    for (const bad of ['', '-octo', 'octo-', 'oc--to', 'oc_to', 'x'.repeat(40), '../etc'])
      expect(isValidUsername(bad)).toBe(false)
  })
})
