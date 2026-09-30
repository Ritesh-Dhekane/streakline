import { fetchUserStats, GitHubError, isValidUsername } from '../shared/github/client'

export interface Env {
  GITHUB_TOKEN?: string
  ALLOWED_ORIGINS?: string // comma-separated
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
}

const ROUTE = /^\/api\/user\/([^/]+)\/?$/
const FIRST_YEAR = 2008 // GitHub launched in 2008
const CACHE_SECONDS = 6 * 60 * 60
const NOT_FOUND_CACHE_SECONDS = 10 * 60
const BROWSER_CACHE_SECONDS = 5 * 60

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

  const cacheKey = new Request(
    `https://streakline.cache/api/user/${login.toLowerCase()}?year=${year}`,
  )
  const cached = await deps.cache.match(cacheKey)
  if (cached) return withHeaders(cached, { ...cors, 'X-Streakline-Cache': 'hit' })

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
  return withHeaders(response, { ...cors, 'X-Streakline-Cache': 'miss' })
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
