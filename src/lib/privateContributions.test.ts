import { describe, expect, it } from 'vitest'

import { rawEvents, rawUser } from '../../shared/github/fixtures'
import { buildUserStats } from '../../shared/github/shape'
import { contributionChange, contributionTotal, parsePrivateParam } from './privateContributions'

const stats = buildUserStats(rawUser(), rawEvents, {
  year: 2026,
  now: new Date('2026-01-05T12:00:00Z'),
})

describe('private contributions toggle', () => {
  it('reads ?private=off as off, absent as no choice', () => {
    expect(parsePrivateParam('off')).toBe(false)
    expect(parsePrivateParam('on')).toBe(true)
    expect(parsePrivateParam(null)).toBe(null)
  })

  it('picks the total and change for the chosen mode', () => {
    expect(contributionTotal(stats, true)).toBe(12)
    expect(contributionTotal(stats, false)).toBe(8)
    const changed = { ...stats, contributionsChange: 0.2, publicContributionsChange: -0.1 }
    expect(contributionChange(changed, true)).toBe(0.2)
    expect(contributionChange(changed, false)).toBe(-0.1)
  })
})
