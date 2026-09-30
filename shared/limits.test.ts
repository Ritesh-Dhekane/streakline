import { describe, expect, it } from 'vitest'

import { DAILY_LOOKUPS, decideLookup, isExempt, LOOKUP_WINDOW_SECONDS, type Lookup } from './limits'

const NOW = 1_800_000_000
const users = (count: number, at = NOW - 60): Lookup[] =>
  Array.from({ length: count }, (_, i) => ({ login: `user${i}`, at: at + i }))

describe('decideLookup', () => {
  it('lets a new visitor in and counts the lookup', () => {
    expect(decideLookup('octo', [], NOW)).toEqual({
      allowed: true,
      counts: true,
      remaining: DAILY_LOOKUPS - 1,
    })
  })

  it('refuses the 11th different user until the oldest expires', () => {
    const recent = users(DAILY_LOOKUPS)
    expect(decideLookup('octo', recent, NOW)).toEqual({
      allowed: false,
      retryAt: NOW - 60 + LOOKUP_WINDOW_SECONDS,
    })
  })

  it('never charges twice for the same user, in any letter case', () => {
    const recent = users(DAILY_LOOKUPS)
    expect(decideLookup('USER3', recent, NOW)).toEqual({
      allowed: true,
      counts: false,
      remaining: 0,
    })
  })

  it('does not count exempt profiles, even when the allowance is used up', () => {
    const recent = users(DAILY_LOOKUPS)
    expect(decideLookup('Ritesh-Dhekane', recent, NOW)).toMatchObject({
      allowed: true,
      counts: false,
    })
    expect(decideLookup('torvalds', recent, NOW)).toMatchObject({ allowed: true, counts: false })
    expect(isExempt('someone-else')).toBe(false)
  })

  it('forgets lookups older than the window', () => {
    const old = users(DAILY_LOOKUPS, NOW - LOOKUP_WINDOW_SECONDS - 100)
    expect(decideLookup('octo', old, NOW)).toMatchObject({ allowed: true, counts: true })
  })

  it('counts a user once even with duplicate rows', () => {
    const recent: Lookup[] = [
      { login: 'a', at: NOW - 50 },
      { login: 'a', at: NOW - 40 },
    ]
    expect(decideLookup('b', recent, NOW)).toMatchObject({ remaining: DAILY_LOOKUPS - 2 })
  })
})
