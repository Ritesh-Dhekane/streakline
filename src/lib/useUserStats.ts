import { useEffect, useState } from 'react'

import type { UserStats } from '../../shared/types'
import { ApiError, fetchStats } from './api'

export type StatsState =
  | { status: 'loading'; data: UserStats | null } // data = previous result while switching years
  | { status: 'ready'; data: UserStats }
  | { status: 'error'; error: ApiError }

// Results for this visit, so going back to a year you've seen is instant.
const cache = new Map<string, UserStats>()

const cacheKey = (login: string, year: number | null) =>
  `${login.toLowerCase()}:${year ?? 'latest'}`

export function useUserStats(login: string, year: number | null) {
  const key = cacheKey(login, year)
  const [failure, setFailure] = useState<{ key: string; attempt: number; error: ApiError } | null>(
    null,
  )
  const [latest, setLatest] = useState<UserStats | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [, setLoaded] = useState(0) // bumped when a fetch fills the cache

  const cached = cache.get(key)

  useEffect(() => {
    if (cache.has(key)) return
    const controller = new AbortController()
    fetchStats(login, year, controller.signal)
      .then((data) => {
        cache.set(key, data)
        if (year === null) cache.set(cacheKey(login, data.year), data)
        setLatest(data)
        setLoaded((n) => n + 1)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFailure({
          key,
          attempt,
          error: error instanceof ApiError ? error : new ApiError('network'),
        })
      })
    return () => controller.abort()
  }, [key, login, year, attempt])

  const retry = () => setAttempt((n) => n + 1)

  let state: StatsState
  if (cached) state = { status: 'ready', data: cached }
  else if (failure?.key === key && failure.attempt === attempt)
    state = { status: 'error', error: failure.error }
  else
    state = {
      status: 'loading',
      // Keep showing the same person while another year loads; a new person starts blank.
      data: latest?.profile.login.toLowerCase() === login.toLowerCase() ? latest : null,
    }

  return { state, retry }
}
