import type { RawEvent, RawUser } from './query'

type Day =
  RawUser['contributionsCollection']['contributionCalendar']['weeks'][number]['contributionDays'][number]

const LEVEL_NAMES = [
  'NONE',
  'FIRST_QUARTILE',
  'SECOND_QUARTILE',
  'THIRD_QUARTILE',
  'FOURTH_QUARTILE',
] as const

// Calendar days from `start` with the given counts, grouped in weeks of 7 like GitHub.
export function calendarWeeks(start: string, counts: number[]): { contributionDays: Day[] }[] {
  const d = new Date(`${start}T00:00:00Z`)
  const days: Day[] = counts.map((count) => {
    const date = d.toISOString().slice(0, 10)
    d.setUTCDate(d.getUTCDate() + 1)
    return {
      date,
      contributionCount: count,
      contributionLevel: LEVEL_NAMES[Math.min(4, Math.ceil(count / 3))] ?? 'NONE',
    }
  })
  const weeks = []
  for (let i = 0; i < days.length; i += 7) weeks.push({ contributionDays: days.slice(i, i + 7) })
  return weeks
}

const repoRef = (nameWithOwner: string, isPrivate = false) => ({
  nameWithOwner,
  url: `https://github.com/${nameWithOwner}`,
  isPrivate,
  owner: { login: nameWithOwner.split('/')[0] ?? '' },
})

export function rawUser(overrides: Partial<RawUser> = {}): RawUser {
  return {
    login: 'octo',
    name: 'Octo Cat',
    avatarUrl: 'https://avatars.example/octo.png',
    url: 'https://github.com/octo',
    bio: 'Builds things',
    company: null,
    location: 'Pune',
    websiteUrl: null,
    createdAt: '2015-04-01T00:00:00Z',
    isHireable: true,
    hasSponsorsListing: false,
    followers: { totalCount: 120 },
    following: { totalCount: 8 },
    organizations: {
      nodes: [{ login: 'acme', name: 'Acme', avatarUrl: 'https://avatars.example/acme.png' }],
    },
    contributionsCollection: {
      contributionYears: [2024, 2026, 2025],
      totalCommitContributions: 40,
      totalPullRequestContributions: 6,
      totalIssueContributions: 2,
      totalPullRequestReviewContributions: 3,
      contributionCalendar: {
        totalContributions: 12,
        // Jan 1–5, 2026, plus a stray day from the previous year that GitHub may include.
        weeks: calendarWeeks('2025-12-31', [9, 3, 3, 0, 3, 3]),
      },
      commitContributionsByRepository: [
        { repository: repoRef('octo/app'), contributions: { totalCount: 30 } },
        { repository: repoRef('vitejs/vite'), contributions: { totalCount: 4 } },
        { repository: repoRef('corp/private', true), contributions: { totalCount: 6 } },
      ],
      pullRequestContributionsByRepository: [
        { repository: repoRef('vitejs/vite'), contributions: { totalCount: 2 } },
      ],
    },
    previous: {
      contributionCalendar: { weeks: calendarWeeks('2025-12-29', [2, 2, 2]) },
    },
    repositories: {
      totalCount: 7,
      nodes: [
        {
          name: 'app',
          nameWithOwner: 'octo/app',
          url: 'https://github.com/octo/app',
          description: 'An app',
          stargazerCount: 50,
          forkCount: 4,
          pushedAt: '2026-01-04T10:00:00Z',
          primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
          languages: {
            edges: [
              { size: 900, node: { name: 'TypeScript', color: '#3178c6' } },
              { size: 100, node: { name: 'CSS', color: '#563d7c' } },
            ],
          },
        },
      ],
    },
    allPullRequests: { totalCount: 20 },
    mergedPullRequests: { totalCount: 15 },
    ...overrides,
  }
}

export const rawEvents: RawEvent[] = [
  { type: 'PushEvent', created_at: '2026-01-04T20:15:00Z', payload: { size: 2 } },
  { type: 'WatchEvent', created_at: '2026-01-04T21:00:00Z' },
]
