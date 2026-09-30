import {
  Flame,
  GitCommitHorizontal,
  GitMerge,
  MessageSquareDot,
  Eye,
  Trophy,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import type { UserStats } from '../../../shared/types'
import { formatChange, formatDay, formatNumber, formatPercent } from '../../lib/format'

interface Tile {
  label: string
  value: ReactNode
  note: ReactNode
  icon: LucideIcon
  tone?: 'primary' | 'secondary' | 'muted'
  title?: string
}

export function StatTiles({ stats }: { stats: UserStats }) {
  const { totals, year, streaks, pullRequests } = stats
  const change = formatChange(stats.contributionsChange)
  const down = (stats.contributionsChange ?? 0) < 0
  const commitShare = totals.contributions ? totals.commits / totals.contributions : null
  const mergedShare = pullRequests.total ? pullRequests.merged / pullRequests.total : null
  const current = streaks.current

  const tiles: Tile[] = [
    {
      label: 'Contributions',
      value: formatNumber(totals.contributions),
      icon: down ? TrendingDown : TrendingUp,
      tone: change ? (down ? 'muted' : 'primary') : 'muted',
      note: change ? `${change} YoY` : `in ${year}`,
      title: change ? `Compared with the same period of ${year - 1}` : undefined,
    },
    {
      label: 'Commits',
      value: formatNumber(totals.commits),
      icon: GitCommitHorizontal,
      tone: 'secondary',
      note: commitShare === null ? `in ${year}` : `${formatPercent(commitShare)} of total`,
    },
    {
      label: 'Pull requests',
      value: formatNumber(totals.pullRequests),
      icon: GitMerge,
      tone: mergedShare === null ? 'muted' : 'primary',
      note: mergedShare === null ? `in ${year}` : `${formatPercent(mergedShare)} merged`,
      title:
        mergedShare === null
          ? undefined
          : `${formatNumber(pullRequests.merged)} of ${formatNumber(pullRequests.total)} public PRs ever opened were merged`,
    },
    {
      label: 'Issues',
      value: formatNumber(totals.issues),
      icon: MessageSquareDot,
      tone: 'muted',
      note: `opened in ${year}`,
    },
    current
      ? {
          label: 'Current streak',
          value: <Days count={current.length} />,
          icon: Flame,
          tone: current.length ? 'primary' : 'muted',
          note:
            current.length && current.start
              ? `since ${formatDay(current.start, year)}`
              : 'none today',
        }
      : {
          label: 'Reviews',
          value: formatNumber(totals.reviews),
          icon: Eye,
          tone: 'muted',
          note: `PRs reviewed in ${year}`,
        },
    {
      label: 'Longest streak',
      value: <Days count={streaks.longest.length} accent />,
      icon: Trophy,
      tone: 'muted',
      note: `in ${year}`,
      title:
        streaks.longest.start && streaks.longest.end
          ? `${formatDay(streaks.longest.start, year)} – ${formatDay(streaks.longest.end, year)}`
          : undefined,
    },
  ]

  return (
    <section
      aria-label="Stats"
      className="grid grid-cols-2 gap-gutter-mobile sm:grid-cols-3 lg:gap-gutter"
    >
      {tiles.map((tile) => (
        <StatTile key={tile.label} tile={tile} />
      ))}
    </section>
  )
}

const TONES = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-on-surface-variant',
}

function StatTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon
  return (
    <div
      className="flex min-w-0 flex-col rounded-md border border-border bg-surface-container-low p-space-md md:p-space-lg"
      title={tile.title}
    >
      <p className="font-body-sm text-body-sm text-on-surface-variant md:font-body-md md:text-body-md">
        {tile.label}
      </p>
      <p className="mt-space-sm font-headline-lg text-headline-lg-mobile tracking-tight tabular-nums md:text-headline-lg">
        {tile.value}
      </p>
      <p
        className={`mt-space-sm flex items-center gap-1 font-label-sm text-label-sm ${TONES[tile.tone ?? 'muted']}`}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{tile.note}</span>
      </p>
    </div>
  )
}

function Days({ count, accent = false }: { count: number; accent?: boolean }) {
  return (
    <>
      <span className={accent ? '' : 'text-primary'}>{formatNumber(count)}</span>{' '}
      <span className="font-body-md text-body-md text-on-surface-variant">
        {count === 1 ? 'day' : 'days'}
      </span>
    </>
  )
}
