import { describe, expect, it, vi } from 'vitest'

import { GitHubError } from './client'
import { fetchOwnerProjects } from './projects'

const NOW = new Date('2026-11-03T10:00:00Z')

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, ...init })

const repo = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  nameWithOwner: `acme/${name}`,
  url: `https://github.com/acme/${name}`,
  description: `${name} description`,
  homepageUrl: '',
  stargazerCount: 3,
  forkCount: 1,
  pushedAt: '2026-11-01T00:00:00Z',
  primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
  repositoryTopics: { nodes: [{ topic: { name: 'poc' } }] },
  ...extra,
})

const org = (nodes = [repo('alpha'), repo('beta', { homepageUrl: 'https://beta.example' })]) => ({
  __typename: 'Organization',
  login: 'acme',
  avatarUrl: 'https://avatars.example/acme',
  url: 'https://github.com/acme',
  name: 'Acme Inc',
  description: 'We build things',
  repositories: { totalCount: 5, nodes },
})

const kindOf = async (promise: Promise<unknown>) => {
  try {
    await promise
    return 'ok'
  } catch (err) {
    return err instanceof GitHubError ? err.kind : 'unexpected'
  }
}

const options = (fetch: typeof globalThis.fetch) => ({ token: 't', fetch, now: NOW })

describe('fetchOwnerProjects', () => {
  it('shapes an organization and its repositories', async () => {
    const fetch = vi.fn(async () => json({ data: { owner: org() } }))
    const result = await fetchOwnerProjects('acme', options(fetch))

    expect(result.owner).toMatchObject({
      login: 'acme',
      kind: 'organization',
      description: 'We build things',
    })
    expect(result.repoCount).toBe(5)
    expect(result.repos.map((r) => r.name)).toEqual(['alpha', 'beta'])
    expect(result.repos[0]).toMatchObject({ topics: ['poc'], homepage: null, stars: 3 })
    expect(result.repos[1]?.homepage).toBe('https://beta.example')
    expect(result.generatedAt).toBe(NOW.toISOString())
  })

  it('uses the bio of a user as the description', async () => {
    const user = { ...org([]), __typename: 'User', bio: 'Hello', description: undefined }
    const fetch = vi.fn(async () => json({ data: { owner: user } }))
    const result = await fetchOwnerProjects('acme', options(fetch))

    expect(result.owner).toMatchObject({ kind: 'user', description: 'Hello' })
    expect(result.repos).toEqual([])
  })

  it('maps GitHub failures to error kinds', async () => {
    const respond = (make: () => Response | Promise<Response>) => options(vi.fn(async () => make()))
    expect(await kindOf(fetchOwnerProjects('bad--name', options(vi.fn())))).toBe('bad_request')
    expect(
      await kindOf(
        fetchOwnerProjects(
          'ghost',
          respond(() => json({ data: { owner: null } })),
        ),
      ),
    ).toBe('not_found')
    expect(
      await kindOf(
        fetchOwnerProjects(
          'acme',
          respond(() => new Response('', { status: 429 })),
        ),
      ),
    ).toBe('rate_limited')
    expect(
      await kindOf(
        fetchOwnerProjects(
          'acme',
          respond(() => new Response('', { status: 500 })),
        ),
      ),
    ).toBe('upstream')
    expect(
      await kindOf(
        fetchOwnerProjects(
          'acme',
          respond(() => {
            throw new Error('down')
          }),
        ),
      ),
    ).toBe('upstream')
  })
})
