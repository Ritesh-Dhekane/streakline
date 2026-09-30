import { fetchUserStats, GitHubError, isValidUsername } from '../shared/github/client'
import {
  DAILY_LOOKUPS,
  decideLookup,
  LOOKUP_WINDOW_SECONDS,
  type Lookup,
  type LookupDecision,
} from '../shared/limits'

export interface Env {
  GITHUB_TOKEN?: string
  ALLOWED_ORIGINS?: string // comma-separated
  VISITOR_SALT?: string // optional secret mixed into visitor hashes
}

// Where each visitor's recent lookups are kept (D1 in production, a fake in tests).
export interface LookupStore {
  recent(visitor: string, since: number): Promise<Lookup[]>
  record(visitor: string, login: string, at: number): Promise<void>
}

// Just the parts of the Cache API the handler uses, so tests can pass a Map-backed fake.
export interface ResponseCache {
  match(key: Request): Promise<Response | undefined>
  put(key: Request, response: Response): Promise<void>
}

export interface Deps {
  cache: ResponseCache
  fetch: typeof fetch
  now: () => Date
  waitUntil: (promise: Promise<unknown>) => void
  lookups?: LookupStore // no store = no limit
}

const ROUTE = /^\/api\/user\/([^/]+)\/?$/
const FIRST_YEAR = 2008 // GitHub launched in 2008
const CACHE_SECONDS = 6 * 60 * 60
const NOT_FOUND_CACHE_SECONDS = 10 * 60
const BROWSER_CACHE_SECONDS = 5 * 60

interface Quota {
  store: LookupStore
  visitor: string
  decision: Extract<LookupDecision, { allowed: true }>
}

const ERROR_STATUS = { bad_request: 400, not_found: 404, rate_limited: 429, upstream: 502 } as const

export async function handle(request: Request, env: Env, deps: Deps): Promise<Response> {
  const cors = corsHeaders(request, env)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'GET') {
    return withHeaders(errorResponse(405, 'method_not_allowed', 'Only GET is supported'), cors)
  }

  const url = new URL(request.url)
  const match = ROUTE.exec(url.pathname)
  if (!match) return withHeaders(errorResponse(404, 'not_found', 'Unknown endpoint'), cors)

  const login = decodeURIComponent(match[1] ?? '')
  if (!isValidUsername(login)) {
    return withHeaders(errorResponse(400, 'bad_request', 'Not a valid GitHub username'), cors)
  }
  const now = deps.now()
  const year = parseYear(url.searchParams.get('year'), now)
  if (year === null) {
    return withHeaders(errorResponse(400, 'bad_request', 'Not a valid year'), cors)
  }
  if (!env.GITHUB_TOKEN) {
    return withHeaders(errorResponse(500, 'not_configured', 'The API is not configured'), cors)
  }

  // Each visitor gets DAILY_LOOKUPS different profiles per rolling day (see shared/limits.ts).
  const seconds = Math.floor(now.getTime() / 1000)
  let quota: Quota | null = null
  if (deps.lookups) {
    const visitor = await visitorId(request, env)
    const recent = await deps.lookups.recent(visitor, seconds - LOOKUP_WINDOW_SECONDS)
    const decision = decideLookup(login, recent, seconds)
    if (!decision.allowed) {
      const response = errorResponse(
        429,
        'quota_exceeded',
        `Each visitor can look up ${DAILY_LOOKUPS} profiles a day`,
      )
      response.headers.set('Retry-After', String(Math.max(1, decision.retryAt - seconds)))
      return withHeaders(response, {
        ...cors,
        ...quotaHeaders(0),
        'X-Lookups-Reset': new Date(decision.retryAt * 1000).toISOString(),
      })
    }
    quota = { store: deps.lookups, visitor, decision }
  }

  const cacheKey = new Request(
    `https://streakline.cache/api/user/${login.toLowerCase()}?year=${year}`,
  )
  const cached = await deps.cache.match(cacheKey)
  if (cached) {
    return withHeaders(cached, {
      ...cors,
      ...charge(cached.status, login, seconds, quota, deps),
      'X-Streakline-Cache': 'hit',
    })
  }

  let response: Response
  let cacheSeconds = 0
  try {
    const stats = await fetchUserStats(login, year, {
      token: env.GITHUB_TOKEN,
      fetch: deps.fetch,
      now,
    })
    response = jsonResponse(200, stats)
    cacheSeconds = CACHE_SECONDS
  } catch (err) {
    if (!(err instanceof GitHubError)) throw err
    response = errorResponse(ERROR_STATUS[err.kind], err.kind, err.message)
    if (err.kind === 'not_found') cacheSeconds = NOT_FOUND_CACHE_SECONDS
    if (err.kind === 'rate_limited') response.headers.set('Retry-After', '60')
  }

  if (cacheSeconds > 0) {
    const stored = response.clone()
    stored.headers.set('Cache-Control', `public, max-age=${cacheSeconds}`)
    deps.waitUntil(deps.cache.put(cacheKey, stored))
  }
  return withHeaders(response, {
    ...cors,
    ...charge(response.status, login, seconds, quota, deps),
    'X-Streakline-Cache': 'miss',
  })
}

// Only successful lookups use up the allowance, so typos and missing users are free.
function charge(
  status: number,
  login: string,
  seconds: number,
  quota: Quota | null,
  deps: Deps,
): Record<string, string> {
  if (!quota) return {}
  const { store, visitor, decision } = quota
  if (status !== 200 || !decision.counts) {
    return quotaHeaders(decision.counts ? decision.remaining + 1 : decision.remaining)
  }
  deps.waitUntil(store.record(visitor, login.toLowerCase(), seconds))
  return quotaHeaders(decision.remaining)
}

function quotaHeaders(remaining: number): Record<string, string> {
  return { 'X-Lookups-Limit': String(DAILY_LOOKUPS), 'X-Lookups-Remaining': String(remaining) }
}

// A salted hash of the caller's IP: enough to tell visitors apart, without storing the IP.
async function visitorId(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const data = new TextEncoder().encode(`${env.VISITOR_SALT ?? 'streakline'}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest).slice(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function parseYear(value: string | null, now: Date): number | null {
  const current = now.getUTCFullYear()
  if (value === null || value === '') return current
  if (!/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= FIRST_YEAR && year <= current ? year : null
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin')
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    headers['Access-Control-Max-Age'] = '86400'
    headers['Access-Control-Expose-Headers'] =
      'X-Lookups-Limit, X-Lookups-Remaining, X-Lookups-Reset'
  }
  return headers
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } })
}

// Responses from the cache are immutable, so copy before adding per-request headers.
function withHeaders(response: Response, headers: Record<string, string>): Response {
  const copy = new Response(response.body, response)
  for (const [key, value] of Object.entries(headers)) copy.headers.set(key, value)
  if (copy.status === 200)
    copy.headers.set('Cache-Control', `public, max-age=${BROWSER_CACHE_SECONDS}`)
  else if (!copy.headers.has('Cache-Control')) copy.headers.set('Cache-Control', 'no-store')
  return copy
}
