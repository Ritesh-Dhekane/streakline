import type { ReactNode } from 'react'

import type { Streak, UserStats } from '../../../shared/types'
import { formatDay, plural, weekdayName } from '../../lib/format'

const LEGEND = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']

export function StreakRow({ stats }: { stats: UserStats }) {
  const { longest, current } = stats.streaks
  const mostActive = stats.weekdays.mostActive
  const average = mostActive === null ? null : stats.weekdays.average[mostActive]

  return (
    <div className="mt-space-md flex flex-col gap-space-sm rounded-lg border border-border bg-surface-container-lowest/40 px-space-md py-space-sm font-label-md text-label-md text-on-surface-variant md:flex-row md:items-center md:justify-between">
      <dl className="flex flex-wrap items-center gap-x-space-lg gap-y-space-xs">
        <Item label="Longest streak" title={range(longest, stats.year)}>
          <span className="text-primary">{plural(longest.length, 'day')}</span>
        </Item>
        {current && (
          <Item label="Current streak" title={range(current, stats.year)}>
            <span className="text-secondary">{plural(current.length, 'day')}</span>
          </Item>
        )}
        {mostActive !== null && average !== undefined && average !== null && (
          <Item label="Most active">
            <span className="text-on-surface">
              {weekdayName(mostActive, true)}{' '}
              <span className="text-on-surface-variant">(avg {average.toFixed(1)})</span>
            </span>
          </Item>
        )}
      </dl>
      <div className="flex items-center gap-1.5 font-label-sm text-label-sm" aria-hidden="true">
        Less
        {LEGEND.map((fill) => (
          <span key={fill} className={`size-2.5 rounded-[2px] ${fill}`} />
        ))}
        More
      </div>
    </div>
  )
}

function Item({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

function range(streak: Streak, year: number): string | undefined {
  if (!streak.start || !streak.end) return undefined
  return `${formatDay(streak.start, year)} – ${formatDay(streak.end, year)}`
}
