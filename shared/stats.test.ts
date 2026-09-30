import { describe, expect, it } from 'vitest'

import {
  activityEvents,
  contributionsChange,
  currentStreak,
  externalContributions,
  languageShares,
  longestStreak,
  mostActiveWeekday,
  weekdayAverages,
  type DayCount,
} from './stats'

// Consecutive days starting at `start` with the given counts.
function days(start: string, counts: number[]): DayCount[] {
  const d = new Date(`${start}T00:00:00Z`)
  return counts.map((count) => {
    const date = d.toISOString().slice(0, 10)
    d.setUTCDate(d.getUTCDate() + 1)
    return { date, count }
  })
}

describe('currentStreak', () => {
  it('counts back from today when today is active', () => {
    const data = days('2026-03-01', [1, 0, 2, 3, 4])
    expect(currentStreak(data, '2026-03-05')).toEqual({
      length: 3,
      start: '2026-03-03',
      end: '2026-03-05',
    })
  })

  it('counts back from yesterday when today has no activity yet', () => {
    const data = days('2026-03-01', [1, 1, 1, 0])
    expect(currentStreak(data, '2026-03-04')).toMatchObject({ length: 3, end: '2026-03-03' })
  })

  it('is zero when neither today nor yesterday is active', () => {
    const data = days('2026-03-01', [5, 0, 0])
    expect(currentStreak(data, '2026-03-03')).toEqual({ length: 0, start: null, end: null })
  })

  it('runs across New Year', () => {
    const data = days('2025-12-29', [1, 1, 1, 1, 1, 1])
    expect(currentStreak(data, '2026-01-03')).toMatchObject({ length: 6, start: '2025-12-29' })
  })
})

describe('longestStreak', () => {
  it('finds the longest run in the year', () => {
    const data = days('2026-01-01', [1, 1, 0, 1, 1, 1, 0, 1])
    expect(longestStreak(data, 2026)).toEqual({ length: 3, start: '2026-01-04', end: '2026-01-06' })
  })

  it('counts a run that started the year before but ended in this year', () => {
    const data = days('2025-12-30', [1, 1, 1, 1, 0])
    expect(longestStreak(data, 2026)).toEqual({ length: 4, start: '2025-12-30', end: '2026-01-02' })
  })

  it('ignores runs that ended the previous year', () => {
    const data = [...days('2025-12-01', [1, 1, 1, 1, 1]), ...days('2026-01-10', [1])]
    expect(longestStreak(data, 2026)).toMatchObject({ length: 1, start: '2026-01-10' })
  })

  it('treats a gap in the dates as a break', () => {
    const data = [...days('2026-02-01', [1, 1]), ...days('2026-02-05', [1, 1, 1])]
    expect(longestStreak(data, 2026).length).toBe(3)
  })

  it('handles leap day', () => {
    const data = days('2024-02-27', [1, 1, 1, 1])
    expect(longestStreak(data, 2024)).toEqual({ length: 4, start: '2024-02-27', end: '2024-03-01' })
  })

  it('is empty for an inactive year', () => {
    expect(longestStreak(days('2026-01-01', [0, 0]), 2026)).toEqual({
      length: 0,
      start: null,
      end: null,
    })
  })
})

describe('weekdays', () => {
  it('averages per weekday up to today and finds the busiest', () => {
    // 2026-03-01 is a Sunday
    const data = days('2026-03-01', [0, 2, 4, 6, 0, 0, 0, 0, 4, 0])
    const averages = weekdayAverages(data, '2026-03-09')
    expect(averages[1]).toBe(3) // Mondays: 2 and 4
    expect(averages[3]).toBe(6)
    expect(mostActiveWeekday(averages)).toBe(3)
  })

  it('has no busiest day without activity', () => {
    expect(mostActiveWeekday(weekdayAverages(days('2026-03-01', [0, 0]), '2026-03-02'))).toBe(null)
  })
})

describe('contributionsChange', () => {
  it('compares against the same stretch of last year', () => {
    const current = days('2026-01-01', [2, 2, 2])
    const previous = [...days('2025-01-01', [1, 1, 1]), ...days('2025-06-01', [100])]
    expect(contributionsChange(current, previous, '2026-01-03')).toBe(1)
  })

  it('is null when last year had nothing to compare with', () => {
    expect(contributionsChange(days('2026-01-01', [5]), [], '2026-01-01')).toBe(null)
  })
})

describe('languageShares', () => {
  it('sums sizes across repos and folds the tail into Other', () => {
    const shares = languageShares(
      [
        {
          languages: [
            { name: 'TypeScript', color: '#3178c6', size: 600 },
            { name: 'CSS', color: '#563d7c', size: 100 },
          ],
        },
        {
          languages: [
            { name: 'TypeScript', color: '#3178c6', size: 200 },
            { name: 'Go', color: '#00ADD8', size: 100 },
          ],
        },
      ],
      2,
    )
    expect(shares.map((s) => [s.name, s.share])).toEqual([
      ['TypeScript', 0.8],
      ['CSS', 0.1],
      ['Other', 0.1],
    ])
  })

  it('is empty without code', () => {
    expect(languageShares([{ languages: [] }])).toEqual([])
  })
})

describe('externalContributions', () => {
  const repo = (nameWithOwner: string, owner: string, count: number, isPrivate = false) => ({
    nameWithOwner,
    url: `https://github.com/${nameWithOwner}`,
    owner,
    isPrivate,
    count,
  })

  it('keeps other people’s public repos, merged and ranked', () => {
    const result = externalContributions(
      [repo('me/app', 'me', 50), repo('vitejs/vite', 'vitejs', 3), repo('x/secret', 'x', 9, true)],
      [repo('vitejs/vite', 'vitejs', 2), repo('facebook/react', 'facebook', 1)],
      'Me',
    )
    expect(result).toEqual([
      {
        nameWithOwner: 'vitejs/vite',
        url: 'https://github.com/vitejs/vite',
        commits: 3,
        pullRequests: 2,
      },
      {
        nameWithOwner: 'facebook/react',
        url: 'https://github.com/facebook/react',
        commits: 0,
        pullRequests: 1,
      },
    ])
  })
})

describe('activityEvents', () => {
  it('weights pushes by commits and keeps only meaningful events', () => {
    const result = activityEvents([
      { type: 'PushEvent', created_at: 'a', payload: { size: 3 } },
      { type: 'PushEvent', created_at: 'b', payload: { size: 500 } },
      { type: 'PullRequestEvent', created_at: 'c', payload: { action: 'opened' } },
      { type: 'PullRequestEvent', created_at: 'd', payload: { action: 'closed' } },
      { type: 'WatchEvent', created_at: 'e' },
      { type: 'IssueCommentEvent', created_at: 'f' },
    ])
    expect(result).toEqual([
      { at: 'a', weight: 3 },
      { at: 'b', weight: 20 },
      { at: 'c', weight: 1 },
      { at: 'f', weight: 1 },
    ])
  })
})
