import { describe, expect, it } from 'vitest'

import { rawEvents, rawUser } from '../shared/github/fixtures'
import { buildUserStats } from '../shared/github/shape'
import type { CalendarDay } from '../shared/types'
import { recentWeeks, renderCard, renderMessageCard } from './card'

const NOW = new Date('2026-01-05T12:00:00Z')
const stats = buildUserStats(rawUser(), rawEvents, { year: 2026, now: NOW })
const options = { theme: 'dark', layout: 'badge', avatar: null, siteLabel: 'example.dev' } as const

describe('renderCard', () => {
  it('draws a badge with the key numbers', () => {
    const svg = renderCard(stats, options)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200"')).toBe(
      true,
    )
    expect(svg).toContain('Octo Cat')
    expect(svg).toContain('@octo')
    expect(svg).toContain(`>${stats.totals.contributions}<`)
    expect(svg).toContain('Current streak')
    expect(svg).toContain('TypeScript 90%')
  })

  it('escapes names so a profile cannot inject markup', () => {
    const evil = { ...stats, profile: { ...stats.profile, name: '<script>alert(1)</script>"&' } }
    const svg = renderCard(evil, options)
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })

  it('embeds the avatar when given, and makes a 1200×630 preview', () => {
    const avatar = 'data:image/png;base64,AAAA'
    expect(renderCard(stats, { ...options, avatar })).toContain(`href="${avatar}"`)
    const og = renderCard(stats, { ...options, layout: 'og', theme: 'light' })
    expect(og).toContain('width="1200" height="630"')
    expect(og).toContain('example.dev/octo')
  })

  it('shows commits instead of a streak for past years', () => {
    const past = { ...stats, streaks: { ...stats.streaks, current: null } }
    expect(renderCard(past, options)).toContain('>Commits<')
  })

  it('has a small card for messages', () => {
    expect(renderMessageCard('No public GitHub data for @x', 'light')).toContain(
      'No public GitHub data for @x',
    )
  })
})

describe('recentWeeks', () => {
  it('returns 16 Sunday-first weeks ending with the last day', () => {
    const calendar: CalendarDay[] = [
      { date: '2026-01-01', count: 1, level: 1 },
      { date: '2026-01-02', count: 0, level: 0 },
      { date: '2026-01-03', count: 4, level: 4 },
    ]
    const weeks = recentWeeks(calendar)
    expect(weeks).toHaveLength(16)
    expect(weeks.every((week) => week.length === 7)).toBe(true)
    // 2026-01-03 is a Saturday: the last cell of the last week.
    expect(weeks.at(-1)?.[6]).toMatchObject({ date: '2026-01-03' })
    expect(weeks.at(-1)?.[4]).toMatchObject({ date: '2026-01-01' })
    expect(weeks[0]?.[0]).toBeNull()
  })
})
