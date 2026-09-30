import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import type { UserStats } from '../../shared/types'
import { Panel } from '../components/Panel'
import { ProfileError } from '../components/profile/ProfileStates'
import { formatCompact, formatNumber, formatPercent } from '../lib/format'
import { buildHeatmap } from '../lib/heatmap'
import { useUserStats, type StatsState } from '../lib/useUserStats'

const LEVEL_FILL = ['fill-heat-0', 'fill-heat-1', 'fill-heat-2', 'fill-heat-3', 'fill-heat-4']

interface Row {
  label: string
  value: (stats: UserStats) => number | null
  format?: (value: number) => string
}

const ROWS: Row[] = [
  { label: 'Contributions', value: (s) => s.totals.contributions },
  { label: 'Commits', value: (s) => s.totals.commits },
  { label: 'Pull requests', value: (s) => s.totals.pullRequests },
  { label: 'Issues', value: (s) => s.totals.issues },
  { label: 'Reviews', value: (s) => s.totals.reviews },
  { label: 'Current streak', value: (s) => s.streaks.current?.length ?? null, format: days },
  { label: 'Longest streak', value: (s) => s.streaks.longest.length, format: days },
  {
    label: 'PRs merged',
    value: (s) => (s.pullRequests.total ? s.pullRequests.merged / s.pullRequests.total : null),
    format: (v) => formatPercent(v),
  },
  { label: 'Followers', value: (s) => s.profile.followers, format: formatCompact },
  { label: 'Public repos', value: (s) => s.publicRepoCount },
  {
    label: 'Stars on top repos',
    value: (s) => s.topRepos.reduce((sum, repo) => sum + repo.stars, 0),
    format: formatCompact,
  },
]

function days(value: number) {
  return `${formatNumber(value)} ${value === 1 ? 'day' : 'days'}`
}

export function ComparePage() {
  const { username = '', other = '' } = useParams()
  const left = useUserStats(username, null)
  const right = useUserStats(other, null)
  const a = left.state.status === 'ready' ? left.state.data : null
  const b = right.state.status === 'ready' ? right.state.data : null

  useEffect(() => {
    document.title = `${username} vs ${other} · Streakline`
    return () => {
      document.title = 'Streakline'
    }
  }, [username, other])

  const failed = [
    [left.state, username, left.retry],
    [right.state, other, right.retry],
  ] as const
  const error = failed.find(([state]) => state.status === 'error')

  return (
    <div className="mx-auto max-w-[1100px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      {error && error[0].status === 'error' ? (
        <div className="mx-auto max-w-xl py-space-xl">
          <ProfileError
            code={error[0].error.code}
            login={error[1]}
            retryAt={error[0].error.retryAt}
            onRetry={error[2]}
          />
        </div>
      ) : (
        <>
          <h1 className="sr-only">
            {username} compared with {other}
          </h1>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-space-sm md:gap-space-lg">
            <Person state={left.state} login={username} align="start" />
            <Link
              to={`/${other}/vs/${username}`}
              className="grid size-10 place-items-center rounded-full border border-border bg-surface-container text-on-surface-variant transition-colors hover:text-primary"
              aria-label="Swap sides"
              title="Swap sides"
            >
              <ArrowLeftRight className="size-4" aria-hidden="true" />
            </Link>
            <Person state={right.state} login={other} align="end" />
          </div>

          {a && b ? (
            <>
              <Panel className="mt-space-lg overflow-hidden" aria-label="Side by side">
                <table className="w-full text-left">
                  <caption className="sr-only">
                    Public GitHub numbers for {a.year}; the higher value is highlighted.
                  </caption>
                  <thead className="font-label-sm text-label-sm text-on-surface-variant">
                    <tr className="border-b border-border">
                      <th scope="col" className="w-2/5 px-space-md py-space-sm font-normal">
                        @{a.profile.login}
                      </th>
                      <th scope="col" className="px-space-sm py-space-sm text-center font-normal">
                        {a.year}
                      </th>
                      <th
                        scope="col"
                        className="w-2/5 px-space-md py-space-sm text-right font-normal"
                      >
                        @{b.profile.login}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => (
                      <CompareRow key={row.label} row={row} a={a} b={b} />
                    ))}
                  </tbody>
                </table>
              </Panel>

              <div className="mt-space-lg grid gap-gutter-mobile md:grid-cols-2 lg:gap-gutter">
                <MiniHeatmap stats={a} />
                <MiniHeatmap stats={b} />
              </div>
              <div className="mt-space-lg grid gap-gutter-mobile md:grid-cols-2 lg:gap-gutter">
                <Languages stats={a} />
                <Languages stats={b} />
              </div>
            </>
          ) : (
            <div className="mt-space-lg space-y-space-sm" role="status" aria-label="Loading">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="skeleton block h-10 rounded-md" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Person({
  state,
  login,
  align,
}: {
  state: StatsState
  login: string
  align: 'start' | 'end'
}) {
  const data = state.status === 'ready' ? state.data : null
  return (
    <Link
      to={`/${login}`}
      className={`group flex min-w-0 items-center gap-space-sm md:gap-space-md ${
        align === 'end' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {data ? (
        <img
          src={data.profile.avatarUrl}
          alt=""
          width={64}
          height={64}
          className="size-12 shrink-0 rounded-lg border border-border md:size-16"
        />
      ) : (
        <span className="skeleton size-12 shrink-0 rounded-lg md:size-16" />
      )}
      <span className="min-w-0">
        <span className="block truncate font-headline-sm text-headline-sm group-hover:text-primary md:font-headline-md md:text-headline-md">
          {data?.profile.name ?? login}
        </span>
        <span className="block truncate font-label-sm text-label-sm text-on-surface-variant">
          @{login}
        </span>
      </span>
    </Link>
  )
}

function CompareRow({ row, a, b }: { row: Row; a: UserStats; b: UserStats }) {
  const va = row.value(a)
  const vb = row.value(b)
  const format = row.format ?? formatNumber
  const winner = va === null || vb === null || va === vb ? null : va > vb ? 'a' : 'b'
  const cell = (value: number | null, wins: boolean, side: 'a' | 'b') => (
    <td
      className={`px-space-md py-2.5 font-label-lg text-label-lg tabular-nums ${
        side === 'b' ? 'text-right' : ''
      } ${wins ? 'font-semibold text-primary' : 'text-on-surface'}`}
    >
      {value === null ? <span className="text-on-surface-variant">—</span> : format(value)}
      {wins && <span className="sr-only"> (higher)</span>}
    </td>
  )
  return (
    <tr className="border-b border-border last:border-0">
      {cell(va, winner === 'a', 'a')}
      <th
        scope="row"
        className="px-space-sm py-2.5 text-center font-body-sm text-body-sm font-normal text-on-surface-variant"
      >
        {row.label}
      </th>
      {cell(vb, winner === 'b', 'b')}
    </tr>
  )
}

function MiniHeatmap({ stats }: { stats: UserStats }) {
  const { weeks } = useMemo(
    () => buildHeatmap(stats.calendar, stats.year),
    [stats.calendar, stats.year],
  )
  const step = 11
  return (
    <Panel className="p-space-md" aria-label={`${stats.profile.login}'s ${stats.year} calendar`}>
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        @{stats.profile.login} · {formatNumber(stats.totals.contributions)} in {stats.year}
      </p>
      <svg
        viewBox={`0 0 ${weeks.length * step - 2} ${7 * step - 2}`}
        className="mt-space-sm h-auto w-full"
        role="img"
        aria-label={`${formatNumber(stats.totals.contributions)} contributions in ${stats.year}`}
      >
        {weeks.map((week, w) =>
          week.map((cell, d) =>
            cell.kind === 'pad' ? null : (
              <rect
                key={cell.date}
                x={w * step}
                y={d * step}
                width={9}
                height={9}
                rx={2}
                className={cell.kind === 'day' ? LEVEL_FILL[cell.level] : 'fill-heat-0 opacity-40'}
              />
            ),
          ),
        )}
      </svg>
    </Panel>
  )
}

function Languages({ stats }: { stats: UserStats }): ReactNode {
  return (
    <Panel className="p-space-md">
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        @{stats.profile.login} · languages
      </p>
      {stats.languages.length === 0 ? (
        <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
          No public code yet.
        </p>
      ) : (
        <>
          <div className="mt-space-sm flex h-2 overflow-hidden rounded-full bg-on-surface/5">
            {stats.languages.map((lang) => (
              <span
                key={lang.name}
                style={{
                  width: `${lang.share * 100}%`,
                  background: lang.color ?? 'var(--c-outline)',
                }}
              />
            ))}
          </div>
          <ul className="mt-space-sm flex flex-wrap gap-x-space-md gap-y-1 font-body-sm text-body-sm">
            {stats.languages
              .filter((lang) => lang.share >= 0.01)
              .slice(0, 4)
              .map((lang) => (
                <li key={lang.name} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: lang.color ?? 'var(--c-outline)' }}
                    aria-hidden="true"
                  />
                  {lang.name}{' '}
                  <span className="text-on-surface-variant">{formatPercent(lang.share)}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
