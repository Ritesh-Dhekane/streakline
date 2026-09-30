import { describe, expect, it } from 'vitest'

import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('defaults to dark and respects a stored light choice', () => {
    expect(resolveTheme(null)).toBe('dark')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('garbage')).toBe('dark')
  })
})
