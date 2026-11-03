import { isValidUsername, GitHubError } from './client'
import type { OwnerProjects } from '../types'

const GRAPHQL_URL = 'https://api.github.com/graphql'
const USER_AGENT = 'streakline'

// `repositoryOwner` covers users and organizations alike.
const PROJECTS_QUERY = /* GraphQL */ `
  query OwnerProjects($login: String!) {
    owner: repositoryOwner(login: $login) {
      __typename
      login
      avatarUrl
      url
      ... on User {
        name
        bio
      }
      ... on Organization {
        name
        description
      }
      repositories(
        first: 100
        privacy: PUBLIC
        isFork: false
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        nodes {
          name
          nameWithOwner
          url
          description
          homepageUrl
          stargazerCount
          forkCount
          pushedAt
          primaryLanguage {
            name
            color
          }
          repositoryTopics(first: 6) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
`

interface RawProjectRepo {
  name: string
  nameWithOwner: string
  url: string
  description: string | null
  homepageUrl: string | null
  stargazerCount: number
  forkCount: number
  pushedAt: string | null
  primaryLanguage: { name: string; color: string | null } | null
  repositoryTopics: { nodes: { topic: { name: string } }[] }
}

interface RawOwner {
  __typename: 'User' | 'Organization'
  login: string
  avatarUrl: string
  url: string
  name: string | null
  bio?: string | null
  description?: string | null
  repositories: { totalCount: number; nodes: RawProjectRepo[] }
}

export interface ProjectsOptions {
  token: string
  fetch?: typeof fetch
  now?: Date
}

export async function fetchOwnerProjects(
  login: string,
  options: ProjectsOptions,
): Promise<OwnerProjects> {
  if (!isValidUsername(login)) {
    throw new GitHubError('bad_request', `"${login}" is not a valid GitHub username`)
  }
  const doFetch = options.fetch ?? fetch
  let response: Response
  try {
    response = await doFetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${options.token}`,
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: PROJECTS_QUERY, variables: { login } }),
    })
  } catch (err) {
    throw new GitHubError('upstream', `GitHub could not be reached: ${String(err)}`)
  }
  if (
    response.status === 429 ||
    (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
  ) {
    throw new GitHubError('rate_limited', 'GitHub rate limit reached')
  }
  if (!response.ok) throw new GitHubError('upstream', `GitHub responded ${response.status}`)

  const body = (await response.json()) as {
    data?: { owner: RawOwner | null }
    errors?: { type?: string; message: string }[]
  }
  const errorTypes = (body.errors ?? []).map((e) => e.type)
  if (errorTypes.includes('RATE_LIMITED')) {
    throw new GitHubError('rate_limited', 'GitHub rate limit reached')
  }
  if (!body.data?.owner) {
    if (errorTypes.includes('NOT_FOUND') || body.data?.owner === null) {
      throw new GitHubError('not_found', `No GitHub user or organization named "${login}"`)
    }
    throw new GitHubError('upstream', body.errors?.[0]?.message ?? 'Unexpected GitHub response')
  }
  return shapeProjects(body.data.owner, options.now ?? new Date())
}

function shapeProjects(raw: RawOwner, now: Date): OwnerProjects {
  return {
    owner: {
      login: raw.login,
      name: raw.name,
      avatarUrl: raw.avatarUrl,
      url: raw.url,
      description: (raw.__typename === 'Organization' ? raw.description : raw.bio) || null,
      kind: raw.__typename === 'Organization' ? 'organization' : 'user',
    },
    repos: raw.repositories.nodes.map((repo) => ({
      name: repo.name,
      nameWithOwner: repo.nameWithOwner,
      url: repo.url,
      description: repo.description,
      language: repo.primaryLanguage,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      pushedAt: repo.pushedAt,
      homepage: repo.homepageUrl || null,
      topics: repo.repositoryTopics.nodes.map((node) => node.topic.name),
    })),
    repoCount: raw.repositories.totalCount,
    generatedAt: now.toISOString(),
  }
}
