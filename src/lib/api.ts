import type { UserStats } from '../../shared/types'
import { API_BASE } from './links'
import { setLookupsLeft } from './lookups'
import { parseUsernameInput } from './username'

export type ApiErrorCode =
  | 'not_found'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'bad_request'
  | 'upstream'
  | 'network'
  | 'not_configured'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly retryAt: Date | null // when a refused lookup will be allowed again

  constructor(code: ApiErrorCode, message?: string, retryAt: Date | null = null) {
    super(message ?? code)
    this.code = code
    this.retryAt = retryAt
  }
}

// Dev only: `?demo` (or `?demo=not_found`, `?demo=loading`, …) serves generated data so the
// page can be built without a deployed Worker. Stripped from production builds.
function demoMode(): string | null {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('demo')
}

export async function fetchStats(
  login: string,
  year: number | null,
  signal?: AbortSignal,
): Promise<UserStats> {
  if (parseUsernameInput(login) !== login) throw new ApiError('bad_request')
  if (import.meta.env.DEV) {
    const demo = demoMode()
    if (demo !== null) {
      const { demoStats } = await import('../dev/demo')
      return demoStats(login, year, demo, signal)
    }
  }
  if (!API_BASE) throw new ApiError('not_configured')

  const query = year ? `?year=${year}` : ''
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/user/${encodeURIComponent(login)}${query}`, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('network')
  }
  readLookupHeaders(response)
  if (response.ok) return (await response.json()) as UserStats

  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
  } | null
  const reset = response.headers.get('X-Lookups-Reset')
  throw new ApiError(
    toCode(response.status, body?.error?.code),
    body?.error?.message,
    reset ? new Date(reset) : null,
  )
}

// The Worker reports the visitor's remaining daily lookups in headers.
function readLookupHeaders(response: Response) {
  const remaining = response.headers.get('X-Lookups-Remaining')
  const limit = response.headers.get('X-Lookups-Limit')
  if (remaining !== null && limit !== null) {
    setLookupsLeft({ remaining: Number(remaining), limit: Number(limit) })
  }
}

function toCode(status: number, code: string | undefined): ApiErrorCode {
  if (status === 404) return 'not_found'
  if (status === 429) return code === 'quota_exceeded' ? 'quota_exceeded' : 'rate_limited'
  if (status === 400) return 'bad_request'
  if (code === 'not_configured') return 'not_configured'
  return 'upstream'
}
