import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'

import type { UserStats } from '../../shared/types'
import { ContributesTo } from '../components/profile/ContributesTo'
import { ContributionHeatmap } from '../components/profile/ContributionHeatmap'
import { LanguageBreakdown } from '../components/profile/LanguageBreakdown'
import { LookupsLeft } from '../components/profile/LookupsLeft'
import { ProfileCard } from '../components/profile/ProfileCard'
import {
  NoPublicActivity,
  ProfileError,
  ProfileSkeleton,
} from '../components/profile/ProfileStates'
import { RhythmChart } from '../components/profile/RhythmChart'
import { StatTiles } from '../components/profile/StatTiles'
import { TopRepositories } from '../components/profile/TopRepositories'
import { useUserStats } from '../lib/useUserStats'

const FIRST_YEAR = 2008 // GitHub launched in 2008

export function ProfilePage() {
  const { username = '' } = useParams()
  const [params] = useSearchParams()
  const year = parseYear(params.get('year'))
  const { state, retry } = useUserStats(username, year)
  const data = state.status === 'error' ? null : state.data
  const busy = state.status === 'loading'

  useEffect(() => {
    const name = data?.profile.name ?? data?.profile.login ?? username
    document.title = `${name} · Streakline`
    return () => {
      document.title = 'Streakline'
    }
  }, [data, username])

  return (
    <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      {state.status === 'error' ? (
        <div className="mx-auto max-w-xl py-space-xl">
          <ProfileError
            code={state.error.code}
            login={username}
            retryAt={state.error.retryAt}
            onRetry={retry}
          />
        </div>
      ) : data ? (
        <div className="grid gap-gutter-mobile lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-gutter xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProfileCard profile={data.profile} />
            <LookupsLeft />
          </div>
          <div
            className={`min-w-0 space-y-gutter-mobile transition-opacity lg:space-y-gutter ${busy ? 'opacity-60' : ''}`}
            aria-busy={busy}
          >
            {hasNoPublicActivity(data) ? (
              <NoPublicActivity login={data.profile.login} />
            ) : (
              <>
                <ContributionHeatmap stats={data} />
                <StatTiles stats={data} />
                <div className="grid gap-gutter-mobile lg:gap-gutter xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                  <RhythmChart stats={data} />
                  <LanguageBreakdown stats={data} />
                </div>
                <TopRepositories stats={data} />
                <ContributesTo stats={data} />
              </>
            )}
          </div>
        </div>
      ) : (
        <ProfileSkeleton login={username} />
      )}
    </div>
  )
}

function hasNoPublicActivity(stats: UserStats): boolean {
  return (
    stats.years.length === 0 &&
    stats.totals.contributions === 0 &&
    stats.publicRepoCount === 0 &&
    stats.recentActivity.length === 0
  )
}

// Ignore years GitHub can't have data for, instead of asking the API and showing an error.
function parseYear(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= FIRST_YEAR && year <= new Date().getFullYear() ? year : null
}
