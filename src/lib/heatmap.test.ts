import { describe, expect, it } from 'vitest'

import type { CalendarDay } from '../../shared/types'
import { buildHeatmap } from './heatmap'

function days(from: string, count: number): CalendarDay[] {
  const d = new Date(`${from}T00:00:00Z`)
  return Array.from({ length: count }, (_, i) => {
    const date = d.toISOString().slice(0, 10)
    d.setUTCDate(d.getUTCDate() + 1)
    return { date, count: i % 3, level: (i % 3) as 0 | 1 | 2 }
  })
}

const cells = (heatmap: ReturnType<typeof buildHeatmap>) => heatmap.weeks.flat()

describe('buildHeatmap', () => {
  it('lays out a full year in Sunday-first weeks', () => {
    // 2025 starts on a Wednesday: three padding cells before Jan 1.
    const heatmap = buildHeatmap(days('2025-01-01', 365), 2025)
    expect(heatmap.weeks.every((week) => week.length === 7)).toBe(true)
    expect(heatmap.weeks[0]?.slice(0, 3).every((cell) => cell.kind === 'pad')).toBe(true)
    expect(heatmap.weeks[0]?.[3]).toMatchObject({ kind: 'day', date: '2025-01-01' })
    expect(cells(heatmap).filter((cell) => cell.kind === 'day')).toHaveLength(365)
  })

  it('includes Feb 29 in leap years', () => {
    const heatmap = buildHeatmap(days('2024-01-01', 366), 2024)
    const dates = cells(heatmap).flatMap((cell) => (cell.kind === 'day' ? [cell.date] : []))
    expect(dates).toHaveLength(366)
    expect(dates).toContain('2024-02-29')
    expect(dates.at(-1)).toBe('2024-12-31')
  })

  it('fills the rest of a partial year with future cells', () => {
    const heatmap = buildHeatmap(days('2026-01-01', 273), 2026) // through Sep 30
    const all = cells(heatmap)
    expect(all.filter((cell) => cell.kind === 'day')).toHaveLength(273)
    expect(all.filter((cell) => cell.kind === 'future')).toHaveLength(92)
    expect(all.find((cell) => cell.kind === 'future')).toMatchObject({ date: '2026-10-01' })
  })

  it('places month labels on the column holding the 1st', () => {
    const heatmap = buildHeatmap(days('2025-01-01', 365), 2025)
    expect(heatmap.months).toHaveLength(12)
    expect(heatmap.months[0]).toEqual({ label: 'Jan', column: 0 })
    // Feb 1, 2025 is a Saturday in the 5th week.
    expect(heatmap.months[1]).toEqual({ label: 'Feb', column: 4 })
  })
})
