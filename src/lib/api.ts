import type { UserStats } from '../../shared/types'

export type ApiErrorCode =
  'not_found' | 'rate_limited' | 'bad_request' | 'upstream' | 'network' | 'not_configured'

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
  }
}

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

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
  if (response.ok) return (await response.json()) as UserStats

  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
  } | null
  throw new ApiError(toCode(response.status, body?.error?.code), body?.error?.message)
}

function toCode(status: number, code: string | undefined): ApiErrorCode {
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limited'
  if (status === 400) return 'bad_request'
  if (code === 'not_configured') return 'not_configured'
  return 'upstream'
}
