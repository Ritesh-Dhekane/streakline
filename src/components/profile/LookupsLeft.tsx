import { Gauge } from 'lucide-react'

import { useLookupsLeft } from '../../lib/lookups'

// "7 of 10 lookups left today" under the profile card, once the API has reported it.
export function LookupsLeft() {
  const lookups = useLookupsLeft()
  if (!lookups) return null
  const { remaining, limit } = lookups

  return (
    <p
      className="mt-space-sm flex items-center justify-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant"
      title={`Each visitor can look up ${limit} different GitHub users a day; profiles you’ve opened don’t count again.`}
    >
      <Gauge className="size-3.5" aria-hidden="true" />
      <span>
        <span className={remaining <= 2 ? 'text-error' : 'text-on-surface'}>{remaining}</span> of{' '}
        {limit} lookups left today
      </span>
    </p>
  )
}
