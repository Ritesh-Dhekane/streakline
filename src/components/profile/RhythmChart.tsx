import { useId, useMemo, useState, type ReactNode } from 'react'

import type { UserStats } from '../../../shared/types'
import { weekdayName } from '../../lib/format'
import { hourLabel, hourlyRhythm, peakWindow, smoothPath, viewerTimeZone } from '../../lib/rhythm'
import { Panel } from '../Panel'

type View = 'hours' | 'weekdays'

const W = 480
const H = 160
const AXIS = [0, 6, 12, 18, 23]
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday first

export function RhythmChart({ stats }: { stats: UserStats }) {
  const headingId = useId()
  const timeZone = useMemo(() => viewerTimeZone(), [])
  const hours = useMemo(
    () => hourlyRhythm(stats.recentActivity, timeZone),
    [stats.recentActivity, timeZone],
  )
  const hasRecent = hours.some((value) => value > 0)
  const [chosen, setChosen] = useState<View | null>(null)
  const view: View = chosen ?? (hasRecent ? 'hours' : 'weekdays')
  const peak = peakWindow(hours)

  return (
    <Panel className="flex flex-col p-space-lg" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div>
          <h2
            id={headingId}
            className="font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
          >
            Recent rhythm
          </h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            {view === 'hours'
              ? `Public activity, last 90 days · your time zone (${timeZone})`
              : `Average contributions per weekday in ${stats.year}`}
          </p>
        </div>
        <div
          className="flex rounded-lg border border-border bg-surface-container-lowest/60 p-0.5"
          role="group"
          aria-label="Chart view"
        >
          {(['hours', 'weekdays'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setChosen(option)}
              aria-pressed={view === option}
              className={`rounded-md px-2.5 py-1 font-label-sm text-label-sm transition-colors ${
                view === option
                  ? 'bg-primary/15 font-semibold text-on-surface dark:font-medium dark:text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option === 'hours' ? 'By hour' : 'By weekday'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-space-lg flex-1">
        {view === 'hours' ? (
          hasRecent && peak !== null ? (
            <HourChart hours={hours} peak={peak} />
          ) : (
            <Empty>No public activity in the last 90 days.</Empty>
          )
        ) : stats.weekdays.mostActive === null ? (
          <Empty>No contributions in {stats.year}.</Empty>
        ) : (
          <WeekdayChart average={stats.weekdays.average} mostActive={stats.weekdays.mostActive} />
        )}
      </div>
    </Panel>
  )
}

function HourChart({ hours, peak }: { hours: number[]; peak: number }) {
  const max = Math.max(...hours)
  const top = 14
  const points = hours.map((value, hour): [number, number] => [
    (hour / 23) * W,
    H - (value / max) * (H - top),
  ])
  const line = smoothPath(points, H)
  const peakHour = [0, 1, 2]
    .map((i) => (peak + i) % 24)
    .reduce((a, b) => ((hours[b] ?? 0) > (hours[a] ?? 0) ? b : a))
  const [px, py] = points[peakHour] ?? [0, H]
  const label = `${hourLabel(peak)} – ${hourLabel(peak + 3)}`

  return (
    <figure className="flex h-full flex-col">
      <div className="mb-space-sm flex justify-end">
        <span className="rounded-md bg-secondary/12 px-2 py-0.5 font-label-sm text-label-sm text-secondary">
          Peak: {label}
        </span>
      </div>
      <div className="relative h-40 md:h-44">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="rhythm-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--c-primary-container)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--c-primary-container)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#rhythm-fill)" />
          <path
            d={line}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute size-2.5 -translate-1/2 rounded-full border-2 border-surface-container-low bg-secondary shadow-[0_0_10px_var(--c-secondary)]"
          style={{ left: `${(px / W) * 100}%`, top: `${(py / H) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div
        className="mt-space-sm flex justify-between font-label-sm text-label-sm text-on-surface-variant"
        aria-hidden="true"
      >
        {AXIS.map((hour) => (
          <span key={hour} className={hour === peakHour ? 'text-primary' : ''}>
            {hourLabel(hour)}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">Most active between {label}, in your time zone.</figcaption>
    </figure>
  )
}

function WeekdayChart({ average, mostActive }: { average: number[]; mostActive: number }) {
  const max = Math.max(...average, 0.0001)
  return (
    <figure className="flex h-full flex-col justify-end">
      <div className="flex h-40 items-end gap-2 md:h-48" aria-hidden="true">
        {WEEK_ORDER.map((day) => {
          const value = average[day] ?? 0
          return (
            <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {value.toFixed(1)}
              </span>
              <div
                className={`w-full rounded-t-md ${day === mostActive ? 'bg-primary-container' : 'bg-on-surface/10'}`}
                style={{ height: `${Math.max(3, (value / max) * 85)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div
        className="mt-space-sm flex gap-2 font-label-sm text-label-sm text-on-surface-variant"
        aria-hidden="true"
      >
        {WEEK_ORDER.map((day) => (
          <span
            key={day}
            className={`flex-1 text-center ${day === mostActive ? 'text-primary' : ''}`}
          >
            {weekdayName(day, true)}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        Most active on {weekdayName(mostActive)}s, {average[mostActive]?.toFixed(1)} contributions
        on average.
      </figcaption>
    </figure>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-40 place-items-center rounded-lg border border-dashed border-border font-body-md text-body-md text-on-surface-variant md:h-48">
      {children}
    </div>
  )
}
