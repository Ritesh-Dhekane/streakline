import { describe, expect, it } from 'vitest'

import { rawEvents, rawUser } from '../../shared/github/fixtures'
import { buildUserStats } from '../../shared/github/shape'
import type { CalendarDay } from '../../shared/types'
import { yearReview } from './review'

const base = buildUserStats(rawUser(), rawEvents, {
  year: 2026,
  now: new Date('2026-01-05T12:00:00Z'),
})

function withCalendar(calendar: CalendarDay[]) {
  return { ...base, calendar }
}

describe('yearReview', () => {
  it('sums months and finds the busiest month and day', () => {
    const review = yearReview(
      withCalendar([
        { date: '2026-01-10', count: 3, level: 2 },
        { date: '2026-01-11', count: 0, level: 0 },
        { date: '2026-03-02', count: 9, level: 4 },
        { date: '2026-03-03', count: 1, level: 1 },
      ]),
    )
    expect(review.total).toBe(13)
    expect(review.months[0]).toBe(3)
    expect(review.months[2]).toBe(10)
    expect(review.busiestMonth).toEqual({ month: 2, count: 10 })
    expect(review.busiestDay).toEqual({ date: '2026-03-02', count: 9 })
    expect(review.activeDays).toBe(3)
    expect(review.daysSoFar).toBe(4)
    expect(review.averagePerActiveDay).toBeCloseTo(13 / 3)
  })

  it('handles a year without contributions', () => {
    const review = yearReview(withCalendar([{ date: '2026-01-01', count: 0, level: 0 }]))
    expect(review.total).toBe(0)
    expect(review.busiestMonth).toBeNull()
    expect(review.busiestDay).toBeNull()
    expect(review.averagePerActiveDay).toBe(0)
  })
})
