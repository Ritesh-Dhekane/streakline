// Dev-only generated profiles, used with `?demo` on the dev server so the page can be built and
// checked without a deployed Worker. Never part of the production bundle.
//
//   ?demo            a busy, complete profile
//   ?demo=minimal    no bio, location, website, orgs or badges
//   ?demo=empty      an account with no public activity
//   ?demo=loading    never finishes loading
//   ?demo=not_found | rate_limited | upstream | network | not_configured   that error

import type { RawEvent, RawRepo, RawUser } from '../../shared/github/query'
import { buildUserStats } from '../../shared/github/shape'
import type { UserStats } from '../../shared/types'
import { ApiError, type ApiErrorCode } from '../lib/api'

const ERRORS: ApiErrorCode[] = [
  'not_found',
  'rate_limited',
  'upstream',
  'network',
  'not_configured',
  'bad_request',
]

const LEVEL_NAMES = [
  'NONE',
  'FIRST_QUARTILE',
  'SECOND_QUARTILE',
  'THIRD_QUARTILE',
  'FOURTH_QUARTILE',
] as const

const LANGUAGES = [
  { name: 'TypeScript', color: '#3178c6' },
  { name: 'Rust', color: '#dea584' },
  { name: 'Go', color: '#00ADD8' },
  { name: 'Python', color: '#3572A5' },
  { name: 'CSS', color: '#663399' },
  { name: 'Shell', color: '#89e051' },
  { name: 'Zig', color: '#ec915c' },
]

const REPO_IDEAS = [
  ['tidewater', 'Streaming dataflow engine with backpressure-aware operators.'],
  ['quill-kv', 'Embedded key-value store with an append-only log and crash recovery.'],
  ['lumen-ui', 'Accessible, unstyled React primitives for dashboards.'],
  ['dotfiles', null],
  ['trace-view', 'Flamegraph and span timeline viewer that runs in the browser.'],
  ['raft-lab', 'A teaching implementation of Raft with a fault-injection harness.'],
] as const

export async function demoStats(
  login: string,
  year: number | null,
  mode: string,
  signal?: AbortSignal,
): Promise<UserStats> {
  await wait(mode === 'loading' ? 1e9 : 450, signal)
  const error = ERRORS.find((code) => code === mode)
  if (error) throw new ApiError(error)

  const now = new Date()
  const selected = year ?? now.getUTCFullYear()
  const random = seeded(hash(`${login}:${selected}`))
  const empty = mode === 'empty'
  const minimal = mode === 'minimal' || empty

  const counts = (from: number) => {
    const days: { date: string; contributionCount: number }[] = []
    const end = new Date(Date.UTC(from, 11, 31))
    for (const d = new Date(Date.UTC(from, 0, 1)); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
      const active = !empty && random() < (weekend ? 0.35 : 0.8)
      const count = active ? Math.floor(random() ** 2 * (weekend ? 8 : 18)) + 1 : 0
      days.push({ date: d.toISOString().slice(0, 10), contributionCount: count })
    }
    return days
  }
  const current = counts(selected).map((day) => ({
    ...day,
    contributionLevel:
      LEVEL_NAMES[
        day.contributionCount === 0 ? 0 : Math.min(4, Math.ceil(day.contributionCount / 4))
      ] ?? 'NONE',
  }))
  const today = now.toISOString().slice(0, 10)
  const total = current
    .filter((day) => day.date <= today)
    .reduce((sum, day) => sum + day.contributionCount, 0)

  const repos: RawRepo[] = empty
    ? []
    : REPO_IDEAS.map(([name, description], i) => {
        const language = LANGUAGES[i % LANGUAGES.length] ?? null
        return {
          name,
          nameWithOwner: `${login}/${name}`,
          url: `https://github.com/${login}/${name}`,
          description,
          stargazerCount: Math.round(14800 / (i + 1) ** 1.6),
          forkCount: Math.round(1200 / (i + 1) ** 1.5),
          pushedAt: new Date(now.getTime() - (i * 3 + 0.1) ** 2 * 3.6e6).toISOString(),
          primaryLanguage: language,
          languages: {
            edges: LANGUAGES.slice(0, 4).map((node, j) => ({
              size: Math.round(90000 / (((i + j) % 4) + 1) ** 2),
              node,
            })),
          },
        }
      })

  const external = (name: string, count: number) => ({
    repository: {
      nameWithOwner: name,
      url: `https://github.com/${name}`,
      isPrivate: false,
      owner: { login: name.split('/')[0] ?? '' },
    },
    contributions: { totalCount: count },
  })

  const user: RawUser = {
    login,
    name: minimal ? null : 'Alex Rivera',
    avatarUrl: `https://github.com/${login}.png?size=240`,
    url: `https://github.com/${login}`,
    bio: minimal ? null : 'Building distributed event streams and resilient primitives.',
    company: minimal ? null : '@tidewater-labs',
    location: minimal ? null : 'Pune, India',
    websiteUrl: minimal ? null : 'https://example.dev',
    createdAt: '2014-04-12T09:00:00Z',
    isHireable: !minimal,
    hasSponsorsListing: !minimal,
    followers: { totalCount: empty ? 0 : 4829 },
    following: { totalCount: empty ? 0 : 312 },
    organizations: {
      nodes: minimal
        ? []
        : ['tidewater-labs', 'rust-cli', 'open-telemetry', 'vitejs'].map((org) => ({
            login: org,
            name: org,
            avatarUrl: `https://github.com/${org}.png?size=64`,
          })),
    },
    contributionsCollection: {
      contributionYears: empty ? [] : Array.from({ length: 7 }, (_, i) => now.getUTCFullYear() - i),
      totalCommitContributions: Math.round(total * 0.68),
      totalPullRequestContributions: Math.round(total * 0.07),
      totalIssueContributions: Math.round(total * 0.04),
      totalPullRequestReviewContributions: Math.round(total * 0.09),
      contributionCalendar: {
        totalContributions: total,
        weeks: [{ contributionDays: current }],
      },
      commitContributionsByRepository: empty
        ? []
        : [
            external(`${login}/tidewater`, 320),
            external('tokio-rs/tokio', 41),
            external('vitejs/vite', 18),
            external('golang/go', 6),
            external('open-telemetry/opentelemetry-rust', 23),
          ],
      pullRequestContributionsByRepository: empty
        ? []
        : [
            external('tokio-rs/tokio', 14),
            external('vitejs/vite', 5),
            external('ziglang/zig', 2),
            external('open-telemetry/opentelemetry-rust', 19),
          ],
    },
    previous: {
      contributionCalendar: { weeks: [{ contributionDays: counts(selected - 1) }] },
    },
    repositories: { totalCount: empty ? 0 : 48, nodes: repos },
    allPullRequests: { totalCount: empty ? 0 : 186 },
    mergedPullRequests: { totalCount: empty ? 0 : 175 },
  }

  const events: RawEvent[] = empty
    ? []
    : Array.from({ length: 260 }, () => {
        // Mostly evenings (UTC), a smaller morning bump.
        const hour = random() < 0.7 ? 14 + Math.floor(random() * 6) : 4 + Math.floor(random() * 5)
        const at = new Date(now.getTime() - Math.floor(random() * 88) * 864e5)
        at.setUTCHours(hour, Math.floor(random() * 60))
        return {
          type: 'PushEvent',
          created_at: at.toISOString(),
          payload: { size: 1 + Math.floor(random() * 4) },
        }
      })

  return buildUserStats(user, events, { year: selected, now })
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

function seeded(seed: number) {
  let state = seed || 1
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}
