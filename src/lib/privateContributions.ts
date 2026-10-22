import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'

import type { UserStats } from '../../shared/types'

// Whether totals include the private contributions a user shares on GitHub. On by default, like
// GitHub. The URL (`?private=off`) carries the choice so shared and compare links keep it; the
// last choice is also remembered in this browser, but the URL wins.

const STORAGE_KEY = 'streakline-include-private'
const PARAM = 'private'

// `?private=off` → false, any other value → true, absent → null (no choice in the URL).
export function parsePrivateParam(value: string | null): boolean | null {
  if (value === null) return null
  return value !== 'off'
}

function readStored(): boolean | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === null ? null : value !== 'off'
  } catch {
    return null
  }
}

function store(include: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, include ? 'on' : 'off')
  } catch {
    // Storage can be unavailable (private windows, blocked site data); the URL still works.
  }
}

export function contributionTotal(stats: UserStats, includePrivate: boolean): number {
  return includePrivate ? stats.totals.contributions : stats.totals.publicContributions
}

export function contributionChange(stats: UserStats, includePrivate: boolean): number | null {
  return includePrivate ? stats.contributionsChange : stats.publicContributionsChange
}

export function useIncludePrivate(): [boolean, (include: boolean) => void] {
  const [params, setParams] = useSearchParams()
  const fromUrl = parsePrivateParam(params.get(PARAM))
  const include = fromUrl ?? readStored() ?? true

  // A remembered "off" goes into the URL too, so a copied link shows the same numbers.
  useEffect(() => {
    if (fromUrl === null && !include) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set(PARAM, 'off')
          return next
        },
        { replace: true, preventScrollReset: true },
      )
    }
  }, [fromUrl, include, setParams])

  const setInclude = useCallback(
    (next: boolean) => {
      store(next)
      setParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (next) params.delete(PARAM)
          else params.set(PARAM, 'off')
          return params
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setParams],
  )

  return [include, setInclude]
}
