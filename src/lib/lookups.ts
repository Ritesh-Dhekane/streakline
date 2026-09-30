import { useSyncExternalStore } from 'react'

// The visitor's remaining profile lookups today, as last reported by the API.
export interface LookupsLeft {
  remaining: number
  limit: number
}

let current: LookupsLeft | null = null
const listeners = new Set<() => void>()

export function setLookupsLeft(next: LookupsLeft) {
  if (current?.remaining === next.remaining && current.limit === next.limit) return
  current = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLookupsLeft(): LookupsLeft | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
