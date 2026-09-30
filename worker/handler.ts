import { fetchUserStats, GitHubError, isValidUsername } from '../shared/github/client'
import {
  DAILY_LOOKUPS,
  decideLookup,
  LOOKUP_WINDOW_SECONDS,
  type Lookup,
  type LookupDecision,
} from '../shared/limits'
import type { UserStats } from '../shared/types'
import { esc, renderCard, renderMessageCard, type CardLayout, type CardTheme } from './card'

export interface Env {
  GITHUB_TOKEN?: string // personal token; used when no GitHub App is configured
  ALLOWED_ORIGINS?: string // comma-separated
  VISITOR_SALT?: string // optional secret mixed into visitor hashes
  SITE_URL?: string // the website, for share links (no trailing slash)
}

// Cloudflare's Rate Limiting binding (or a fake in tests).
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
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
  appToken?: () => Promise<string> // GitHub App installation tokens (worker/githubApp.ts)
  limiter?: RateLimiter // per-IP limit for cards and share pages (they skip the visitor allowance)
}

const API_ROUTE = /^\/api\/user\/([^/]+)\/?$/
const CARD_ROUTE = /^\/card\/([^/]+?)(?:\.svg)?\/?$/
const SHARE_ROUTE = /^\/u\/([^/]+)\/?$/
const DEFAULT_SITE = 'https://ritesh-dhekane.github.io/streakline'
const FIRST_YEAR = 2008 // GitHub launched in 2008
const CACHE_SECONDS = 6 * 60 * 60
const NOT_FOUND_CACHE_SECONDS = 10 * 60
const BROWSER_CACHE_SECONDS = 5 * 60
const CARD_ERROR_CACHE_SECONDS = 10 * 60
const CARD_VERSION = 2 // bump when the card design changes, so cached cards refresh

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
  const card = CARD_ROUTE.exec(url.pathname)
  if (card) return handleCard(request, url, decodeURIComponent(card[1] ?? ''), env, deps)
  const share = SHARE_ROUTE.exec(url.pathname)
  if (share) return handleShare(request, url, decodeURIComponent(share[1] ?? ''), env, deps)
  const match = API_ROUTE.exec(url.pathname)
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
  if (!tokenSource(env, deps)) {
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

  const { response, hit } = await loadStats(login, year, env, deps)
  return withHeaders(response, {
    ...cors,
    ...charge(response.status, login, seconds, quota, deps),
    'X-Streakline-Cache': hit ? 'hit' : 'miss',
  })
}

function tokenSource(env: Env, deps: Deps): (() => Promise<string>) | undefined {
  const personalToken = env.GITHUB_TOKEN
  return personalToken ? async () => personalToken : deps.appToken
}

// Stats for one user and year as an API response, from the cache or GitHub (then cached).
async function loadStats(
  login: string,
  year: number,
  env: Env,
  deps: Deps,
): Promise<{ response: Response; hit: boolean }> {
  const cacheKey = new Request(
    `https://streakline.cache/api/user/${login.toLowerCase()}?year=${year}`,
  )
  const cached = await deps.cache.match(cacheKey)
  if (cached) return { response: cached, hit: true }

  const getToken = tokenSource(env, deps)
  let response: Response
  let cacheSeconds = 0
  try {
    if (!getToken) throw new GitHubError('upstream', 'The API is not configured')
    let token: string
    try {
      token = await getToken()
    } catch {
      throw new GitHubError('upstream', 'Could not authenticate with GitHub')
    }
    const stats = await fetchUserStats(login, year, { token, fetch: deps.fetch, now: deps.now() })
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
  return { response, hit: false }
}

// README badge / social preview image: GET /card/<user>.svg?theme=dark|light&layout=badge|og
async function handleCard(
  request: Request,
  url: URL,
  login: string,
  env: Env,
  deps: Deps,
): Promise<Response> {
  const theme: CardTheme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark'
  const layout: CardLayout = url.searchParams.get('layout') === 'og' ? 'og' : 'badge'
  if (!isValidUsername(login)) {
    return svgResponse(renderMessageCard('Not a valid GitHub username', theme), 0)
  }
  const year = deps.now().getUTCFullYear()
  const cacheKey = new Request(
    `https://streakline.cache/card/${login.toLowerCase()}?theme=${theme}&layout=${layout}&year=${year}&v=${CARD_VERSION}`,
  )
  const cached = await deps.cache.match(cacheKey)
  if (cached) return svgResponse(await cached.text(), CACHE_SECONDS)
  if (!(await allowed(request, deps))) {
    return svgResponse(renderMessageCard('Busy right now, try again in a minute', theme), 0)
  }

  const stats = await statsFor(login, year, env, deps)
  if (!stats) {
    const message = renderMessageCard(`No public GitHub data for @${login}`, theme)
    return svgResponse(message, CARD_ERROR_CACHE_SECONDS)
  }
  const svg = renderCard(stats, {
    theme,
    layout,
    avatar: await avatarDataUri(stats.profile.avatarUrl, deps),
    siteLabel: siteUrl(env).replace(/^https?:\/\//, ''),
  })
  deps.waitUntil(
    deps.cache.put(
      cacheKey,
      new Response(svg, { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } }),
    ),
  )
  return svgResponse(svg, CACHE_SECONDS)
}

// Share link with a rich preview: GET /u/<user> → Open Graph tags, then on to the profile page.
async function handleShare(
  request: Request,
  url: URL,
  login: string,
  env: Env,
  deps: Deps,
): Promise<Response> {
  const site = siteUrl(env)
  if (!isValidUsername(login)) return Response.redirect(`${site}/`, 302)
  const profileUrl = `${site}/${login}`
  const year = deps.now().getUTCFullYear()
  const stats = (await allowed(request, deps)) ? await statsFor(login, year, env, deps) : null

  const name = stats?.profile.name?.trim() || login
  const title = `${name} (@${login}) · Streakline`
  const description = stats ? shareDescription(stats) : 'Public GitHub activity, beautifully.'
  // Social sites need PNG; wsrv.nl turns the SVG card into one (and caches it). Changes daily.
  const day = deps.now().toISOString().slice(0, 10)
  const cardUrl = `${url.origin}/card/${encodeURIComponent(login)}.svg?layout=og&d=${day}`
  const image = `https://wsrv.nl/?url=${encodeURIComponent(cardUrl)}&output=png&w=1200`
  const redirect = JSON.stringify(profileUrl).replace(/</g, '\\u003c')
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Streakline">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url.origin + url.pathname)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(`${name}'s GitHub activity`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(profileUrl)}">
<meta http-equiv="refresh" content="0; url=${esc(profileUrl)}">
</head>
<body>
<p><a href="${esc(profileUrl)}">Open ${esc(name)} on Streakline</a></p>
<script>location.replace(${redirect})</script>
</body>
</html>`
  return new Response(html, {
    status: stats ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': `public, max-age=${stats ? 60 * 60 : 60}`,
    },
  })
}

export function shareDescription(stats: UserStats): string {
  const parts = [
    `${stats.totals.contributions.toLocaleString('en-US')} contributions in ${stats.year}`,
  ]
  const streak = stats.streaks.current?.length ?? 0
  if (streak > 1) parts.push(`${streak}-day streak`)
  else if (stats.streaks.longest.length > 1)
    parts.push(`longest streak ${stats.streaks.longest.length} days`)
  const langs = stats.languages.filter((l) => l.name !== 'Other').slice(0, 3)
  if (langs.length) parts.push(langs.map((l) => l.name).join(', '))
  return parts.join(' · ')
}

async function statsFor(
  login: string,
  year: number,
  env: Env,
  deps: Deps,
): Promise<UserStats | null> {
  const { response } = await loadStats(login, year, env, deps)
  if (response.status !== 200) return null
  return (await response.clone().json()) as UserStats
}

// Cards and share pages skip the visitor allowance (image proxies and link crawlers share IPs),
// so fresh GitHub lookups through them are rate limited per IP instead.
async function allowed(request: Request, deps: Deps): Promise<boolean> {
  if (!deps.limiter) return true
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  return (await deps.limiter.limit({ key: ip })).success
}

async function avatarDataUri(avatarUrl: string, deps: Deps): Promise<string | null> {
  try {
    const sized = `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}s=96`
    const response = await deps.fetch(sized)
    const type = response.headers.get('Content-Type') ?? 'image/png'
    if (!response.ok || !type.startsWith('image/')) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.length > 150_000) return null
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return `data:${type};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

function siteUrl(env: Env): string {
  return (env.SITE_URL ?? DEFAULT_SITE).replace(/\/+$/, '')
}

function svgResponse(svg: string, maxAge: number): Response {
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
      // Public images: any page may load them (the site downloads them as PNG).
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
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
