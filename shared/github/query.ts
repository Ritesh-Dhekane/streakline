// One GraphQL request for everything on the profile page except recent events.
// `previous` is the year before, used for year-over-year change and streaks that
// run across New Year.

export const USER_QUERY = /* GraphQL */ `
  query UserStats(
    $login: String!
    $from: DateTime!
    $to: DateTime!
    $previousFrom: DateTime!
    $previousTo: DateTime!
  ) {
    user(login: $login) {
      login
      name
      avatarUrl
      url
      bio
      company
      location
      websiteUrl
      createdAt
      isHireable
      hasSponsorsListing
      followers {
        totalCount
      }
      following {
        totalCount
      }
      organizations(first: 10) {
        nodes {
          login
          name
          avatarUrl
        }
      }
      contributionsCollection(from: $from, to: $to) {
        contributionYears
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 25) {
          repository {
            ...ContributedRepo
          }
          contributions {
            totalCount
          }
        }
        pullRequestContributionsByRepository(maxRepositories: 25) {
          repository {
            ...ContributedRepo
          }
          contributions {
            totalCount
          }
        }
      }
      previous: contributionsCollection(from: $previousFrom, to: $previousTo) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        isFork: false
        privacy: PUBLIC
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        nodes {
          name
          nameWithOwner
          url
          description
          stargazerCount
          forkCount
          pushedAt
          primaryLanguage {
            name
            color
          }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
      allPullRequests: pullRequests {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) {
        totalCount
      }
    }
  }

  fragment ContributedRepo on Repository {
    nameWithOwner
    url
    isPrivate
    owner {
      login
    }
  }
`

export interface YearRange {
  from: string
  to: string
  previousFrom: string
  previousTo: string
}

// The selected year up to now (current year) or the full year; plus the whole previous year.
export function yearRange(year: number, now: Date): YearRange {
  const isCurrentYear = year === now.getUTCFullYear()
  return {
    from: `${year}-01-01T00:00:00Z`,
    to: isCurrentYear ? now.toISOString() : `${year}-12-31T23:59:59Z`,
    previousFrom: `${year - 1}-01-01T00:00:00Z`,
    previousTo: `${year - 1}-12-31T23:59:59Z`,
  }
}

type ContributionLevelName =
  'NONE' | 'FIRST_QUARTILE' | 'SECOND_QUARTILE' | 'THIRD_QUARTILE' | 'FOURTH_QUARTILE'

interface RawContributedRepo {
  nameWithOwner: string
  url: string
  isPrivate: boolean
  owner: { login: string }
}

export interface RawRepoContribution {
  repository: RawContributedRepo
  contributions: { totalCount: number }
}

export interface RawRepo {
  name: string
  nameWithOwner: string
  url: string
  description: string | null
  stargazerCount: number
  forkCount: number
  pushedAt: string | null
  primaryLanguage: { name: string; color: string | null } | null
  languages: { edges: { size: number; node: { name: string; color: string | null } }[] }
}

export interface RawUser {
  login: string
  name: string | null
  avatarUrl: string
  url: string
  bio: string | null
  company: string | null
  location: string | null
  websiteUrl: string | null
  createdAt: string
  isHireable: boolean
  hasSponsorsListing: boolean
  followers: { totalCount: number }
  following: { totalCount: number }
  organizations: { nodes: { login: string; name: string | null; avatarUrl: string }[] }
  contributionsCollection: {
    contributionYears: number[]
    totalCommitContributions: number
    totalPullRequestContributions: number
    totalIssueContributions: number
    totalPullRequestReviewContributions: number
    contributionCalendar: {
      totalContributions: number
      weeks: {
        contributionDays: {
          date: string
          contributionCount: number
          contributionLevel: ContributionLevelName
        }[]
      }[]
    }
    commitContributionsByRepository: RawRepoContribution[]
    pullRequestContributionsByRepository: RawRepoContribution[]
  }
  previous: {
    contributionCalendar: {
      weeks: { contributionDays: { date: string; contributionCount: number }[] }[]
    }
  }
  repositories: { totalCount: number; nodes: RawRepo[] }
  allPullRequests: { totalCount: number }
  mergedPullRequests: { totalCount: number }
}

export interface RawEvent {
  type: string
  created_at: string
  payload?: { size?: number; action?: string }
}
