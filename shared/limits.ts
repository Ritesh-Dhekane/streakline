// Per-visitor lookup allowance, shared by the Worker (enforces it) and the site (explains it).

export const DAILY_LOOKUPS = 10
export const LOOKUP_WINDOW_SECONDS = 24 * 60 * 60

export const OWNER_LOGIN = 'Ritesh-Dhekane'

// Profiles on the landing page (the owner's first). They never count against the allowance.
export const EXAMPLE_LOGINS = [
  OWNER_LOGIN,
  'torvalds',
  'gaearon',
  'sindresorhus',
  'antfu',
  'yyx990803',
]

// Once this few lookups are left, the site warns the visitor.
export const LOW_LOOKUPS = 3

const EXEMPT = new Set(EXAMPLE_LOGINS.map((login) => login.toLowerCase()))

export function isExempt(login: string): boolean {
  return EXEMPT.has(login.toLowerCase())
}

export interface Lookup {
  login: string // lower-case
  at: number // unix seconds
}

// Refusals carry `retryAt`: unix seconds when the visitor's oldest lookup expires.
export type LookupDecision =
  { allowed: true; counts: boolean; remaining: number } | { allowed: false; retryAt: number }

// Decides whether `login` may be looked up given the visitor's lookups in the last window.
// `counts` = this lookup is new and should be recorded once it succeeds.
export function decideLookup(login: string, recent: Lookup[], now: number): LookupDecision {
  const since = now - LOOKUP_WINDOW_SECONDS
  const active = recent.filter((lookup) => lookup.at > since)
  const distinct = new Map<string, number>() // login → first time in window
  for (const lookup of active) {
    const first = distinct.get(lookup.login)
    if (first === undefined || lookup.at < first) distinct.set(lookup.login, lookup.at)
  }
  const used = distinct.size
  const key = login.toLowerCase()

  if (isExempt(key) || distinct.has(key)) {
    return { allowed: true, counts: false, remaining: Math.max(0, DAILY_LOOKUPS - used) }
  }
  if (used >= DAILY_LOOKUPS) {
    const oldest = Math.min(...distinct.values())
    return { allowed: false, retryAt: oldest + LOOKUP_WINDOW_SECONDS }
  }
  return { allowed: true, counts: true, remaining: DAILY_LOOKUPS - used - 1 }
}
