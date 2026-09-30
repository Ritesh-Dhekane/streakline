import { describe, expect, it } from 'vitest'

import { addRecent, MAX_RECENT, type RecentProfile } from './recent'

const profile = (login: string): RecentProfile => ({ login, name: null, avatarUrl: `a/${login}` })

describe('addRecent', () => {
  it('puts the newest first without duplicates, in any letter case', () => {
    const list = addRecent([profile('a'), profile('B')], profile('b'))
    expect(list.map((p) => p.login)).toEqual(['b', 'a'])
  })

  it(`keeps at most ${MAX_RECENT}`, () => {
    let list: RecentProfile[] = []
    for (let i = 0; i < MAX_RECENT + 3; i++) list = addRecent(list, profile(`u${i}`))
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0]?.login).toBe(`u${MAX_RECENT + 2}`)
  })
})
