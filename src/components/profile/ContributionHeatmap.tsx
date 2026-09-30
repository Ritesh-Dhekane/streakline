import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import type { UserStats } from '../../../shared/types'
import { formatLongDay, formatNumber, plural } from '../../lib/format'
import { buildHeatmap, type HeatCell } from '../../lib/heatmap'
import { Eyebrow, Panel } from '../Panel'
import { StreakRow } from './StreakRow'
import { YearSwitcher } from './YearSwitcher'

const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const LEFT = 30 // weekday labels
const TOP = 16 // month labels
const WEEKDAY_LABELS = [
  [1, 'Mon'],
  [3, 'Wed'],
  [5, 'Fri'],
] as const

const LEVEL_FILL = [
  'fill-heat-0',
  'fill-heat-1',
  'fill-heat-2',
  'fill-heat-3',
  'fill-heat-4',
] as const

interface Active {
  week: number
  day: number
  x: number
  y: number
  align: 'start' | 'center' | 'end'
}

const TRANSLATE = { start: '-12px -100%', center: '-50% -100%', end: 'calc(-100% + 12px) -100%' }

export function ContributionHeatmap({ stats, busy }: { stats: UserStats; busy: boolean }) {
  const headingId = useId()
  const { weeks, months } = useMemo(
    () => buildHeatmap(stats.calendar, stats.year),
    [stats.calendar, stats.year],
  )
  const [active, setActive] = useState<Active | null>(null)
  const [focused, setFocused] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // The tooltip lives outside the scrolling area (so it isn't clipped) and is kept inside the card.
  function activate(week: number, day: number, reveal = false) {
    const cell = frame.current?.querySelector(`[data-cell="${week}-${day}"]`)
    const box = frame.current?.getBoundingClientRect()
    if (!cell || !box) return
    if (reveal) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    const rect = cell.getBoundingClientRect()
    const x = rect.left - box.left + rect.width / 2
    const align = x < 120 ? 'start' : x > box.width - 120 ? 'end' : 'center'
    setActive({ week, day, x, y: rect.top - box.top, align })
  }

  // On narrow screens the grid scrolls sideways; start at the most recent weeks, like GitHub.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [stats.year])

  const width = LEFT + weeks.length * STEP - GAP
  const height = TOP + 7 * STEP - GAP
  const activeCell = active ? weeks[active.week]?.[active.day] : undefined
  const shown = activeCell && activeCell.kind !== 'pad' ? activeCell : undefined

  // Arrow keys walk the grid (skipping padding); Home/End jump to the first/last day with data.
  function onKeyDown(event: KeyboardEvent) {
    const days = weeks.flatMap((week, w) =>
      week.flatMap((cell, d) => (cell.kind === 'day' ? [{ week: w, day: d }] : [])),
    )
    if (!days.length) return
    const current = active ?? days[days.length - 1]
    if (!current) return
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    let next: { week: number; day: number } | undefined
    if (event.key === 'Home') next = days[0]
    else if (event.key === 'End') next = days.at(-1)
    else if (moves[event.key]) {
      const [dw, dd] = moves[event.key] ?? [0, 0]
      const candidate = { week: current.week + dw, day: current.day + dd }
      if (weeks[candidate.week]?.[candidate.day]?.kind === 'day') next = candidate
      else next = current
    } else return
    event.preventDefault()
    const target = next ?? current
    activate(target.week, target.day, true)
  }

  return (
    <Panel className="p-space-lg" aria-labelledby={headingId}>
      <div className="flex flex-col gap-space-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow>Activity distribution</Eyebrow>
          <h2 id={headingId} className="mt-space-xs">
            <span className="font-headline-lg text-headline-lg-mobile tracking-tight md:text-headline-lg">
              {formatNumber(stats.totals.contributions)}
            </span>{' '}
            <span className="font-headline-sm text-headline-sm text-on-surface-variant">
              {stats.totals.contributions === 1 ? 'contribution' : 'contributions'} in {stats.year}
            </span>
          </h2>
        </div>
        <YearSwitcher years={stats.years} selected={stats.year} />
      </div>

      <div
        ref={frame}
        className={`relative mt-space-lg transition-opacity ${busy ? 'opacity-50' : ''}`}
        aria-busy={busy}
      >
        <div ref={scroller} className="-mx-space-lg -my-1 overflow-x-auto px-space-lg py-1.5">
          <div className="relative min-w-[640px]">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="block h-auto w-full rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              role="img"
              aria-label={`Contribution calendar for ${stats.year}. Use arrow keys to read days.`}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                setActive(null)
              }}
              onMouseLeave={() => !focused && setActive(null)}
            >
              {months.map((month) => (
                <text
                  key={month.label}
                  x={LEFT + month.column * STEP}
                  y={9}
                  className="fill-on-surface-variant font-mono text-[8px]"
                >
                  {month.label}
                </text>
              ))}
              {WEEKDAY_LABELS.map(([day, label]) => (
                <text
                  key={label}
                  x={0}
                  y={TOP + day * STEP + CELL - 1.5}
                  className="fill-on-surface-variant font-mono text-[8px]"
                >
                  {label}
                </text>
              ))}
              {weeks.map((week, w) =>
                week.map((cell, d) =>
                  cell.kind === 'pad' ? null : (
                    <rect
                      key={cell.date}
                      x={LEFT + w * STEP}
                      y={TOP + d * STEP}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      data-cell={`${w}-${d}`}
                      className={cellClass(cell, active?.week === w && active.day === d)}
                      onMouseEnter={() => activate(w, d)}
                      onClick={() => activate(w, d)}
                    />
                  ),
                ),
              )}
            </svg>
          </div>
        </div>
        {shown && active && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded-lg border border-on-surface/12 bg-surface-container-highest px-2.5 py-1.5 font-label-sm text-label-sm whitespace-nowrap shadow-popover"
            style={{
              left: active.x,
              top: active.y - 6,
              translate: TRANSLATE[active.align],
            }}
          >
            <span className="text-on-surface">
              {shown.kind === 'day'
                ? shown.count
                  ? plural(shown.count, 'contribution')
                  : 'No contributions'
                : 'Not yet'}
            </span>
            <span className="text-on-surface-variant"> · {formatLongDay(shown.date)}</span>
          </div>
        )}
      </div>

      <StreakRow stats={stats} />
    </Panel>
  )
}

function cellClass(cell: HeatCell, active: boolean): string {
  const fill = cell.kind === 'day' ? LEVEL_FILL[cell.level] : 'fill-heat-0 opacity-40'
  const ring = active ? 'stroke-on-surface stroke-[1.5]' : ''
  return `${fill} ${ring} transition-[stroke]`
}
