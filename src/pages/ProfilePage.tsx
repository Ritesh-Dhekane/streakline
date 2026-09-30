import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { ContributionHeatmap } from '../components/profile/ContributionHeatmap'
import { ProfileCard } from '../components/profile/ProfileCard'
import { useUserStats } from '../lib/useUserStats'

export function ProfilePage() {
  const { username = '' } = useParams()
  const [params] = useSearchParams()
  const year = parseYear(params.get('year'))
  const { state } = useUserStats(username, year)
  const data = state.status === 'error' ? null : state.data

  useEffect(() => {
    const name = data?.profile.name ?? data?.profile.login ?? username
    document.title = `${name} · Streakline`
    return () => {
      document.title = 'Streakline'
    }
  }, [data, username])

  return (
    <div className="mx-auto max-w-[1440px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      {data ? (
        <div className="grid gap-gutter-mobile lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-gutter xl:grid-cols-[320px_minmax(0,1fr)]">
          <div>
            <ProfileCard profile={data.profile} />
          </div>
          <div className="min-w-0 space-y-gutter-mobile lg:space-y-gutter">
            <ContributionHeatmap stats={data} busy={state.status === 'loading'} />
          </div>
        </div>
      ) : state.status === 'error' ? (
        <p role="alert">
          Couldn’t load @{username} ({state.error.code}).
        </p>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  )
}

function parseYear(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null
  return Number(value)
}
