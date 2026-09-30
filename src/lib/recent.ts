import { useSyncExternalStore } from 'react'

// Profiles this browser opened recently (newest first). Kept in localStorage only; storage can be
// unavailable, in which case the list simply stays empty.
export interface RecentProfile {
  login: string
  name: string | null
  avatarUrl: string
}

const KEY = 'streakline-recent'
export const MAX_RECENT = 6

export function addRecent(list: RecentProfile[], entry: RecentProfile): RecentProfile[] {
  const rest = list.filter((item) => item.login.toLowerCase() !== entry.login.toLowerCase())
  return [entry, ...rest].slice(0, MAX_RECENT)
}

const listeners = new Set<() => void>()
let snapshot: RecentProfile[] | null = null

function read(): RecentProfile[] {
  if (snapshot) return snapshot
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    snapshot = Array.isArray(parsed) ? (parsed as RecentProfile[]).filter(isProfile) : []
  } catch {
    snapshot = []
  }
  return snapshot
}

function write(list: RecentProfile[]) {
  snapshot = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
  for (const listener of listeners) listener()
}

function isProfile(value: unknown): value is RecentProfile {
  const item = value as RecentProfile
  return typeof item?.login === 'string' && typeof item.avatarUrl === 'string'
}

export function rememberProfile(entry: RecentProfile) {
  const current = read()
  if (current[0]?.login === entry.login && current[0].name === entry.name) return
  write(addRecent(current, entry))
}

export function clearRecent() {
  write([])
}

const EMPTY: RecentProfile[] = []

export function useRecentProfiles(): RecentProfile[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    read,
    () => EMPTY,
  )
}
