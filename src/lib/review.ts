import type { UserStats } from '../../shared/types'

export interface YearReview {
  total: number
  activeDays: number
  daysSoFar: number // days in the year up to the last day with data
  months: number[] // contributions per month, Jan → Dec
  busiestMonth: { month: number; count: number } | null
  busiestDay: { date: string; count: number } | null
  averagePerActiveDay: number
}

export function yearReview(stats: UserStats): YearReview {
  const months = Array.from({ length: 12 }, () => 0)
  let activeDays = 0
  let busiestDay: YearReview['busiestDay'] = null
  for (const day of stats.calendar) {
    const month = Number(day.date.slice(5, 7)) - 1
    months[month] = (months[month] ?? 0) + day.count
    if (day.count > 0) activeDays++
    if (day.count > 0 && (!busiestDay || day.count > busiestDay.count)) {
      busiestDay = { date: day.date, count: day.count }
    }
  }
  const total = months.reduce((sum, count) => sum + count, 0)
  const top = months.reduce((best, count, i) => (count > (months[best] ?? 0) ? i : best), 0)
  return {
    total,
    activeDays,
    daysSoFar: stats.calendar.length,
    months,
    busiestMonth: total > 0 ? { month: top, count: months[top] ?? 0 } : null,
    busiestDay,
    averagePerActiveDay: activeDays ? total / activeDays : 0,
  }
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
