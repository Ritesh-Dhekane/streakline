import { describe, expect, it } from 'vitest'

import { parseUsernameInput } from './username'

describe('parseUsernameInput', () => {
  it('accepts plain names, @names and profile links', () => {
    expect(parseUsernameInput('torvalds')).toBe('torvalds')
    expect(parseUsernameInput('  @gaearon ')).toBe('gaearon')
    expect(parseUsernameInput('https://github.com/sindresorhus')).toBe('sindresorhus')
    expect(parseUsernameInput('github.com/antfu/')).toBe('antfu')
    expect(parseUsernameInput('https://www.github.com/Octo-Cat?tab=repositories')).toBe('Octo-Cat')
  })

  it('rejects things that are not usernames', () => {
    for (const bad of ['', '   ', '@', 'two words', 'bad_name', '-dash', 'https://gitlab.com/x'])
      expect(parseUsernameInput(bad)).toBe(null)
    expect(parseUsernameInput('https://github.com/torvalds/linux')).toBe(null)
  })
})
