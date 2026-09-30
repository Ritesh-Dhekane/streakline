import { Gauge, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { DAILY_LOOKUPS, LOW_LOOKUPS, OWNER_LOGIN } from '../../shared/limits'
import { useLookupsLeft } from '../lib/lookups'

const STORAGE_KEY = 'streakline-low-lookups-warned'
const AUTO_HIDE_MS = 12_000

// Storage can be unavailable (private windows, blocked site data); the pop-up still works.
function readWarnedDay(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeWarnedDay(day: string) {
  try {
    localStorage.setItem(STORAGE_KEY, day)
  } catch {
    // ignore
  }
}

// A one-per-day heads-up once a visitor is down to LOW_LOOKUPS lookups.
export function LookupsWarning() {
  const lookups = useLookupsLeft()
  const [warnedDay] = useState(readWarnedDay)
  const [closed, setClosed] = useState(false)
  const [today] = useState(() => new Date().toDateString())
  const remaining = lookups?.remaining ?? 0
  const show = remaining > 0 && remaining <= LOW_LOOKUPS && warnedDay !== today && !closed

  useEffect(() => {
    if (!show) return
    writeWarnedDay(today)
    const timer = setTimeout(() => setClosed(true), AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [show, today])

  if (!show) return null

  return (
    <div
      role="status"
      className="fixed inset-x-margin-mobile bottom-margin-mobile z-50 mx-auto max-w-sm rounded-md border border-on-surface/12 bg-surface-container-high p-space-md shadow-popover motion-safe:animate-[toast-in_200ms_ease-out] sm:right-margin sm:bottom-margin sm:left-auto sm:mx-0"
    >
      <div className="flex items-start gap-space-sm">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Gauge className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-headline-sm text-headline-sm">
            {remaining === 1 ? 'Only 1 lookup left today' : `Only ${remaining} lookups left today`}
          </p>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            Each visitor can look up {DAILY_LOOKUPS} different people a day. Profiles you’ve already
            opened, @{OWNER_LOGIN} and the examples stay free.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="-m-1 rounded p-1 text-on-surface-variant transition-colors hover:text-on-surface"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
