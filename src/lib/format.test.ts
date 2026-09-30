import { describe, expect, it } from 'vitest'

import {
  absoluteUrl,
  displayUrl,
  formatChange,
  formatCompact,
  formatDay,
  formatRelative,
  plural,
} from './format'

describe('formatCompact', () => {
  it('shortens thousands and millions', () => {
    expect(formatCompact(312)).toBe('312')
    expect(formatCompact(4829)).toBe('4.8k')
    expect(formatCompact(14000)).toBe('14k')
    expect(formatCompact(123456)).toBe('123k')
    expect(formatCompact(1_250_000)).toBe('1.3M')
  })
})

describe('formatChange', () => {
  it('signs the percentage and hides missing values', () => {
    expect(formatChange(0.184)).toBe('+18%')
    expect(formatChange(-0.04)).toBe('−4%')
    expect(formatChange(0)).toBe('+0%')
    expect(formatChange(null)).toBeNull()
    expect(formatChange(Infinity)).toBeNull()
  })
})

describe('dates', () => {
  it('drops the year when it is the current one', () => {
    expect(formatDay('2026-03-04', 2026)).toBe('Mar 4')
    expect(formatDay('2025-03-04', 2026)).toBe('Mar 4, 2025')
  })

  it('describes recent times relatively', () => {
    const now = new Date('2026-09-30T12:00:00Z')
    expect(formatRelative('2026-09-30T11:58:00Z', now)).toBe('2 min ago')
    expect(formatRelative('2026-09-30T09:00:00Z', now)).toBe('3 h ago')
    expect(formatRelative('2026-09-29T10:00:00Z', now)).toBe('yesterday')
    expect(formatRelative('2026-09-26T12:00:00Z', now)).toBe('4 days ago')
    expect(formatRelative('2026-06-12T12:00:00Z', now)).toBe('Jun 12')
  })
})

describe('text helpers', () => {
  it('pluralises and cleans up links', () => {
    expect(plural(1, 'day')).toBe('1 day')
    expect(plural(1200, 'day')).toBe('1,200 days')
    expect(displayUrl('https://example.dev/')).toBe('example.dev')
    expect(absoluteUrl('example.dev')).toBe('https://example.dev')
    expect(absoluteUrl('http://example.dev')).toBe('http://example.dev')
  })
})
