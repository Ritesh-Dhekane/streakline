import { describe, expect, it } from 'vitest'

import { hourLabel, hourlyRhythm, peakWindow, smoothPath } from './rhythm'

const events = [
  { at: '2026-09-01T20:15:00Z', weight: 3 },
  { at: '2026-09-02T20:45:00Z', weight: 1 },
  { at: '2026-09-02T23:40:00Z', weight: 2 },
]

describe('hourlyRhythm', () => {
  it('buckets weighted events by hour in UTC', () => {
    const hours = hourlyRhythm(events, 'UTC')
    expect(hours).toHaveLength(24)
    expect(hours[20]).toBe(4)
    expect(hours[23]).toBe(2)
    expect(hours.reduce((a, b) => a + b)).toBe(6)
  })

  it('shifts into the viewer’s time zone, wrapping past midnight', () => {
    // UTC+5:30: 20:15 → 01:45 next day, 23:40 → 05:10.
    const hours = hourlyRhythm(events, 'Asia/Kolkata')
    expect(hours[1]).toBe(3)
    expect(hours[2]).toBe(1)
    expect(hours[5]).toBe(2)
  })
})

describe('peakWindow', () => {
  it('finds the busiest three hours, including across midnight', () => {
    const hours = Array.from({ length: 24 }, () => 0)
    hours[23] = 5
    hours[0] = 5
    hours[12] = 6
    expect(peakWindow(hours)).toBe(22)
    expect(peakWindow(Array.from({ length: 24 }, () => 0))).toBeNull()
  })
})

describe('helpers', () => {
  it('labels hours and draws a path through every point', () => {
    expect(hourLabel(7)).toBe('07:00')
    expect(hourLabel(24)).toBe('00:00')
    const path = smoothPath(
      [
        [0, 10],
        [5, 0],
        [10, 10],
      ],
      10,
    )
    expect(path.startsWith('M0,10')).toBe(true)
    expect(path.match(/C/g)).toHaveLength(2)
    expect(smoothPath([], 10)).toBe('')
  })
})
