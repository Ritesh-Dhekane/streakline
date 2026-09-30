import { ArrowLeft, Check, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import type { UserStats } from '../../shared/types'
import { Eyebrow, Panel } from '../components/Panel'
import { ProfileError } from '../components/profile/ProfileStates'
import { formatDay, formatNumber, formatPercent, plural, weekdayName } from '../lib/format'
import { MONTH_NAMES, yearReview } from '../lib/review'
import { useUserStats } from '../lib/useUserStats'

const FIRST_YEAR = 2008
const CURRENT_YEAR = new Date().getFullYear()

export function ReviewPage() {
  const { username = '', year: yearParam = '' } = useParams()
  const requested = Number(yearParam)
  const year =
    /^\d{4}$/.test(yearParam) && requested >= FIRST_YEAR && requested <= CURRENT_YEAR
      ? requested
      : null
  const { state, retry } = useUserStats(username, year)

  useEffect(() => {
    document.title = `${username}’s ${year ?? ''} on GitHub · Streakline`
    return () => {
      document.title = 'Streakline'
    }
  }, [username, year])

  return (
    <div className="mx-auto max-w-[1000px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      {state.status === 'error' ? (
        <div className="mx-auto max-w-xl py-space-xl">
          <ProfileError
            code={state.error.code}
            login={username}
            retryAt={state.error.retryAt}
            onRetry={retry}
          />
        </div>
      ) : state.status === 'ready' ? (
        <Review stats={state.data} />
      ) : (
        <div className="space-y-space-md" role="status" aria-label="Loading">
          <span className="skeleton block h-40 rounded-md" />
          <span className="skeleton block h-64 rounded-md" />
        </div>
      )}
    </div>
  )
}

function Review({ stats }: { stats: UserStats }) {
  const review = useMemo(() => yearReview(stats), [stats])
  const [copied, setCopied] = useState(false)
  const name = stats.profile.name ?? stats.profile.login
  const isCurrent = stats.year === CURRENT_YEAR
  const maxMonth = Math.max(...review.months, 1)
  const weekday = stats.weekdays.mostActive
  const topRepo = stats.topRepos[0]
  const topLanguage = stats.languages.find((lang) => lang.name !== 'Other')

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href.split('?')[0] ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // ignore
    }
  }

  return (
    <article>
      <div className="flex items-center justify-between gap-space-md">
        <Link
          to={`/${stats.profile.login}${isCurrent ? '' : `?year=${stats.year}`}`}
          className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Profile
        </Link>
        <button
          type="button"
          onClick={share}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-on-surface/5 px-3 py-1.5 font-label-md text-label-md transition-colors hover:bg-on-surface/10"
        >
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Share2 className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>

      <Panel className="relative mt-space-md overflow-hidden p-space-lg md:p-space-xl">
        <div className="flex items-center gap-space-md">
          <img
            src={stats.profile.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-lg border border-border"
          />
          <div>
            <Eyebrow>
              {stats.year} {isCurrent ? 'so far' : 'in review'}
            </Eyebrow>
            <h1 className="mt-1 font-headline-md text-headline-md">{name}’s year on GitHub</h1>
          </div>
        </div>
        <p className="mt-space-lg font-headline-xl text-headline-xl-mobile tracking-tight md:text-headline-xl">
          {formatNumber(review.total)}{' '}
          <span className="font-headline-sm text-headline-sm text-on-surface-variant">
            public contributions
          </span>
        </p>
        <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
          Active on {plural(review.activeDays, 'day')} of {formatNumber(review.daysSoFar)} (
          {formatPercent(review.daysSoFar ? review.activeDays / review.daysSoFar : 0)}), averaging{' '}
          {review.averagePerActiveDay.toFixed(1)} on those days.
        </p>
      </Panel>

      <div className="mt-space-md grid grid-cols-2 gap-gutter-mobile md:grid-cols-4 lg:gap-gutter">
        <Highlight label="Busiest month">
          {review.busiestMonth ? MONTH_NAMES[review.busiestMonth.month] : '—'}
          {review.busiestMonth && <Note>{plural(review.busiestMonth.count, 'contribution')}</Note>}
        </Highlight>
        <Highlight label="Best day">
          {review.busiestDay ? formatDay(review.busiestDay.date, stats.year) : '—'}
          {review.busiestDay && <Note>{plural(review.busiestDay.count, 'contribution')}</Note>}
        </Highlight>
        <Highlight label="Longest streak">{plural(stats.streaks.longest.length, 'day')}</Highlight>
        <Highlight label="Favourite weekday">
          {weekday === null ? '—' : weekdayName(weekday)}
        </Highlight>
      </div>

      <Panel className="mt-space-md p-space-lg" aria-label="Contributions per month">
        <h2 className="font-headline-sm text-headline-sm">Month by month</h2>
        <div className="mt-space-lg flex h-40 items-end gap-1 md:gap-2">
          {review.months.map((count, month) => (
            <div key={month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="font-label-sm text-[10px] text-on-surface-variant md:text-label-sm">
                {count ? formatNumber(count) : ''}
              </span>
              <div
                className={`w-full rounded-t-sm ${
                  review.busiestMonth?.month === month ? 'bg-primary-container' : 'bg-heat-2/60'
                }`}
                style={{ height: `${Math.max(count ? 4 : 1, (count / maxMonth) * 80)}%` }}
                title={`${MONTH_NAMES[month]}: ${formatNumber(count)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-space-xs flex gap-1 font-label-sm text-[10px] text-on-surface-variant md:gap-2 md:text-label-sm">
          {MONTH_NAMES.map((month) => (
            <span key={month} className="flex-1 text-center">
              {month.slice(0, 1)}
              <span className="hidden md:inline">{month.slice(1, 3)}</span>
            </span>
          ))}
        </div>
      </Panel>

      <div className="mt-space-md grid gap-gutter-mobile md:grid-cols-3 lg:gap-gutter">
        <Highlight label="Commits">{formatNumber(stats.totals.commits)}</Highlight>
        <Highlight label="Pull requests">{formatNumber(stats.totals.pullRequests)}</Highlight>
        <Highlight label="Reviews">{formatNumber(stats.totals.reviews)}</Highlight>
      </div>

      <div className="mt-space-md grid gap-gutter-mobile md:grid-cols-2 lg:gap-gutter">
        <Highlight label="Top language">
          {topLanguage ? (
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ background: topLanguage.color ?? 'var(--c-outline)' }}
                aria-hidden="true"
              />
              {topLanguage.name}
              <Note>{formatPercent(topLanguage.share)} of code</Note>
            </span>
          ) : (
            '—'
          )}
        </Highlight>
        <Highlight label="Most-starred repo">
          {topRepo ? (
            <a href={topRepo.url} target="_blank" rel="noreferrer" className="hover:text-primary">
              {topRepo.name}
              <Note>{plural(topRepo.stars, 'star')}</Note>
            </a>
          ) : (
            '—'
          )}
        </Highlight>
      </div>

      {stats.years.length > 1 && (
        <nav aria-label="Other years" className="mt-space-lg flex flex-wrap items-center gap-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Other years:</span>
          {stats.years
            .filter((y) => y !== stats.year)
            .map((y) => (
              <Link
                key={y}
                to={`/${stats.profile.login}/review/${y}`}
                className="rounded-full border border-border px-3 py-1 font-label-sm text-label-sm text-on-surface-variant hover:border-primary/50 hover:text-on-surface"
              >
                {y}
              </Link>
            ))}
        </nav>
      )}
    </article>
  )
}

function Highlight({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Panel as="div" className="p-space-md md:p-space-lg">
      <p className="font-body-sm text-body-sm text-on-surface-variant">{label}</p>
      <p className="mt-space-xs flex flex-wrap items-baseline gap-x-2 font-headline-sm text-headline-sm">
        {children}
      </p>
    </Panel>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
      {children}
    </span>
  )
}
