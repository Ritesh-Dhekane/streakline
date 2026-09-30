import type { CalendarDay, ContributionLevel } from '../../shared/types'

export type HeatCell =
  | { kind: 'day'; date: string; count: number; level: ContributionLevel }
  | { kind: 'future'; date: string } // later this year; no data yet
  | { kind: 'pad' } // before Jan 1 / after Dec 31 in the first and last week

export interface Heatmap {
  weeks: HeatCell[][] // columns, each Sunday → Saturday
  months: { label: string; column: number }[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Lays a year out like GitHub: one column per week, Sunday on top. Days the API didn't return
// (the rest of the current year) become "future" cells so the grid always spans the full year.
export function buildHeatmap(calendar: CalendarDay[], year: number): Heatmap {
  const byDate = new Map(calendar.map((day) => [day.date, day]))
  const weeks: HeatCell[][] = []
  const months: Heatmap['months'] = []

  const first = new Date(Date.UTC(year, 0, 1))
  let week: HeatCell[] = Array.from({ length: first.getUTCDay() }, () => ({ kind: 'pad' }))

  for (const d = first; d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10)
    if (d.getUTCDate() === 1) {
      months.push({ label: MONTHS[d.getUTCMonth()] ?? '', column: weeks.length })
    }
    const day = byDate.get(date)
    week.push(
      day ? { kind: 'day', date, count: day.count, level: day.level } : { kind: 'future', date },
    )
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push({ kind: 'pad' })
    weeks.push(week)
  }
  return { weeks, months }
}
