import { buildUserStats } from './shape'
import { USER_QUERY, yearRange, type RawEvent, type RawUser } from './query'
import type { UserStats } from '../types'

const GRAPHQL_URL = 'https://api.github.com/graphql'
const EVENTS_PAGES = 3 // GitHub serves at most 300 public events (~90 days)
const USER_AGENT = 'streakline'

export type GitHubErrorKind = 'not_found' | 'rate_limited' | 'bad_request' | 'upstream'

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind

  constructor(kind: GitHubErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export interface ClientOptions {
  token: string
  fetch?: typeof fetch
  now?: Date
}

const USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

export function isValidUsername(login: string): boolean {
  return USERNAME.test(login)
}

export async function fetchUserStats(
  login: string,
  year: number,
  options: ClientOptions,
): Promise<UserStats> {
  if (!isValidUsername(login)) {
    throw new GitHubError('bad_request', `"${login}" is not a valid GitHub username`)
  }
  const now = options.now ?? new Date()
  const doFetch = options.fetch ?? fetch
  const headers = {
    Authorization: `bearer ${options.token}`,
    'User-Agent': USER_AGENT,
  }

  const [user, events] = await Promise.all([
    fetchUser(login, year, now, headers, doFetch),
    fetchPublicEvents(login, headers, doFetch),
  ])
  return buildUserStats(user, events, { year, now })
}

async function fetchUser(
  login: string,
  year: number,
  now: Date,
  headers: Record<string, string>,
  doFetch: typeof fetch,
): Promise<RawUser> {
  let response: Response
  try {
    response = await doFetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: USER_QUERY, variables: { login, ...yearRange(year, now) } }),
    })
  } catch (err) {
    throw new GitHubError('upstream', `GitHub could not be reached: ${String(err)}`)
  }
  if (isRateLimited(response)) {
    throw new GitHubError('rate_limited', 'GitHub rate limit reached')
  }
  if (!response.ok) {
    throw new GitHubError('upstream', `GitHub responded ${response.status}`)
  }

  const body = (await response.json()) as {
    data?: { user: RawUser | null }
    errors?: { type?: string; message: string }[]
  }
  const errorTypes = (body.errors ?? []).map((e) => e.type)
  if (errorTypes.includes('RATE_LIMITED')) {
    throw new GitHubError('rate_limited', 'GitHub rate limit reached')
  }
  if (!body.data?.user) {
    if (errorTypes.includes('NOT_FOUND') || body.data?.user === null) {
      throw new GitHubError('not_found', `No GitHub user named "${login}"`)
    }
    throw new GitHubError('upstream', body.errors?.[0]?.message ?? 'Unexpected GitHub response')
  }
  return body.data.user
}

// Optional: without events the rhythm chart is simply empty, never an error.
async function fetchPublicEvents(
  login: string,
  headers: Record<string, string>,
  doFetch: typeof fetch,
): Promise<RawEvent[]> {
  const events: RawEvent[] = []
  try {
    for (let page = 1; page <= EVENTS_PAGES; page++) {
      const response = await doFetch(
        `https://api.github.com/users/${login}/events/public?per_page=100&page=${page}`,
        { headers: { ...headers, Accept: 'application/vnd.github+json' } },
      )
      if (!response.ok) break
      const batch = (await response.json()) as RawEvent[]
      events.push(...batch)
      if (batch.length < 100) break
    }
  } catch {
    // keep whatever was fetched
  }
  return events
}

function isRateLimited(response: Response): boolean {
  if (response.status === 429) return true
  return response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0'
}
