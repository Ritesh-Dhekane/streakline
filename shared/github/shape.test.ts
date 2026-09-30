import { describe, expect, it } from 'vitest'

import { rawEvents, rawUser } from './fixtures'
import { buildUserStats } from './shape'

const NOW = new Date('2026-01-05T12:00:00Z')

describe('buildUserStats', () => {
  const stats = buildUserStats(rawUser(), rawEvents, { year: 2026, now: NOW })

  it('keeps only the selected year up to today', () => {
    expect(stats.calendar.map((d) => d.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
    ])
    expect(stats.calendar.map((d) => d.level)).toEqual([1, 1, 0, 1, 1])
    expect(stats.totals.contributions).toBe(12)
  })

  it('computes streaks across New Year', () => {
    // Dec 29–31 active (previous-year calendar), Jan 1–2 active, Jan 3 off, Jan 4–5 active
    expect(stats.streaks.current).toEqual({ length: 2, start: '2026-01-04', end: '2026-01-05' })
    expect(stats.streaks.longest).toEqual({ length: 5, start: '2025-12-29', end: '2026-01-02' })
  })

  it('shapes profile, totals and pull requests', () => {
    expect(stats.profile).toMatchObject({ login: 'octo', followers: 120, isHireable: true })
    expect(stats.profile.organizations).toHaveLength(1)
    expect(stats.years).toEqual([2026, 2025, 2024])
    expect(stats.totals).toMatchObject({ commits: 40, pullRequests: 6, issues: 2, reviews: 3 })
    expect(stats.pullRequests).toEqual({ total: 20, merged: 15 })
  })

  it('shows only other people’s public repos as contributions', () => {
    expect(stats.contributedTo).toEqual([
      {
        nameWithOwner: 'vitejs/vite',
        url: 'https://github.com/vitejs/vite',
        commits: 4,
        pullRequests: 2,
      },
    ])
  })

  it('shapes repos, languages and activity', () => {
    expect(stats.topRepos[0]).toMatchObject({
      name: 'app',
      stars: 50,
      language: { name: 'TypeScript' },
    })
    expect(stats.publicRepoCount).toBe(7)
    expect(stats.languages.map((l) => [l.name, l.share])).toEqual([
      ['TypeScript', 0.9],
      ['CSS', 0.1],
    ])
    expect(stats.recentActivity).toEqual([{ at: '2026-01-04T20:15:00Z', weight: 2 }])
  })

  it('has no current streak for past years', () => {
    const past = buildUserStats(rawUser(), [], { year: 2025, now: NOW })
    expect(past.streaks.current).toBe(null)
    expect(past.calendar.map((d) => d.date)).toEqual(['2025-12-31'])
  })
})
