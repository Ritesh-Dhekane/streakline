import { useEffect, useState } from 'react'

import type { OwnerProjects } from '../../shared/types'
import { ApiError, fetchProjects } from './api'

export type ProjectsState =
  | { status: 'loading' }
  | { status: 'ready'; data: OwnerProjects }
  | { status: 'error'; error: ApiError }

// Results for this visit, so coming back to an owner is instant.
const cache = new Map<string, OwnerProjects>()

export function useOwnerProjects(owner: string) {
  const key = owner.toLowerCase()
  const [failure, setFailure] = useState<{ key: string; attempt: number; error: ApiError } | null>(
    null,
  )
  const [attempt, setAttempt] = useState(0)
  const [, setLoaded] = useState(0) // bumped when a fetch fills the cache

  const cached = cache.get(key)

  useEffect(() => {
    if (cache.has(key)) return
    const controller = new AbortController()
    fetchProjects(owner, controller.signal)
      .then((data) => {
        cache.set(key, data)
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
  }, [key, owner, attempt])

  const retry = () => setAttempt((n) => n + 1)

  let state: ProjectsState
  if (cached) state = { status: 'ready', data: cached }
  else if (failure?.key === key && failure.attempt === attempt)
    state = { status: 'error', error: failure.error }
  else state = { status: 'loading' }

  return { state, retry }
}
