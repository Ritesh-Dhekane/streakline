// Pure calculations over GitHub data. Dates are plain YYYY-MM-DD strings, compared
// lexically; "today" is passed in so results are testable.

import type { ActivityEvent, ExternalContribution, LanguageShare, Streak } from './types'

export interface DayCount {
  date: string
  count: number
}

const NO_STREAK: Streak = { length: 0, start: null, end: null }

function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

// Consecutive active days ending today — or yesterday, since today may simply not
// have started yet. `days` may span several years (sorted ascending).
export function currentStreak(days: DayCount[], today: string): Streak {
  const counts = new Map(days.map((d) => [d.date, d.count]))
  let cursor = (counts.get(today) ?? 0) > 0 ? today : previousDate(today)
  const end = cursor
  let length = 0
  while ((counts.get(cursor) ?? 0) > 0) {
    length++
    cursor = previousDate(cursor)
  }
  return length === 0 ? NO_STREAK : { length, start: nextDay(cursor), end }
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Longest run of active days that ends inside `year` (a run may start the year before).
export function longestStreak(days: DayCount[], year: number): Streak {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  let best = NO_STREAK
  let runStart: string | null = null
  let runLength = 0
  let previous: string | null = null
  for (const day of sorted) {
    const continues = previous !== null && previousDate(day.date) === previous
    if (day.count > 0) {
      if (!continues || runLength === 0) {
        runStart = day.date
        runLength = 0
      }
      runLength++
      if (day.date.startsWith(`${year}-`) && runLength > best.length) {
        best = { length: runLength, start: runStart, end: day.date }
      }
    } else {
      runLength = 0
    }
    previous = day.date
  }
  return best
}

// Average contributions per weekday (0 = Sunday) over the year's days up to today.
export function weekdayAverages(days: DayCount[], today: string): number[] {
  const sums = Array<number>(7).fill(0)
  const counts = Array<number>(7).fill(0)
  for (const day of days) {
    if (day.date > today) continue
    const index = weekday(day.date)
    sums[index] = (sums[index] ?? 0) + day.count
    counts[index] = (counts[index] ?? 0) + 1
  }
  return sums.map((sum, i) => {
    const n = counts[i] ?? 0
    return n === 0 ? 0 : Math.round((sum / n) * 10) / 10
  })
}

export function mostActiveWeekday(averages: number[]): number | null {
  let best: number | null = null
  averages.forEach((value, i) => {
    if (value > 0 && (best === null || value > (averages[best] ?? 0))) best = i
  })
  return best
}

// Contributions this year so far vs. the same stretch of last year (0.18 = +18%).
export function contributionsChange(
  current: DayCount[],
  previous: DayCount[],
  today: string,
): number | null {
  const monthDay = today.slice(5)
  const currentSum = current.filter((d) => d.date <= today).reduce((s, d) => s + d.count, 0)
  const previousSum = previous
    .filter((d) => d.date.slice(5) <= monthDay)
    .reduce((s, d) => s + d.count, 0)
  if (previousSum === 0) return null
  return Math.round(((currentSum - previousSum) / previousSum) * 1000) / 1000
}

export interface RepoLanguages {
  languages: { size: number; name: string; color: string | null }[]
}

// Share of code by language across repositories; the tail is folded into "Other".
export function languageShares(repos: RepoLanguages[], limit = 5): LanguageShare[] {
  const totals = new Map<string, { size: number; color: string | null }>()
  for (const repo of repos) {
    for (const lang of repo.languages) {
      const entry = totals.get(lang.name) ?? { size: 0, color: lang.color }
      entry.size += lang.size
      totals.set(lang.name, entry)
    }
  }
  const all = [...totals.entries()].sort((a, b) => b[1].size - a[1].size)
  const totalSize = all.reduce((s, [, v]) => s + v.size, 0)
  if (totalSize === 0) return []
  const top = all.slice(0, limit).map(([name, v]) => ({
    name,
    color: v.color,
    share: v.size / totalSize,
  }))
  const rest = all.slice(limit).reduce((s, [, v]) => s + v.size, 0)
  if (rest > 0) top.push({ name: 'Other', color: null, share: rest / totalSize })
  return top
}

export interface RepoContribution {
  nameWithOwner: string
  url: string
  owner: string
  isPrivate: boolean
  count: number
}

// Other people's public repositories the user committed to or opened pull requests in.
export function externalContributions(
  commits: RepoContribution[],
  pullRequests: RepoContribution[],
  login: string,
  limit = 8,
): ExternalContribution[] {
  const byRepo = new Map<string, ExternalContribution>()
  const add = (items: RepoContribution[], field: 'commits' | 'pullRequests') => {
    for (const item of items) {
      if (item.isPrivate || item.owner.toLowerCase() === login.toLowerCase()) continue
      const entry = byRepo.get(item.nameWithOwner) ?? {
        nameWithOwner: item.nameWithOwner,
        url: item.url,
        commits: 0,
        pullRequests: 0,
      }
      entry[field] += item.count
      byRepo.set(item.nameWithOwner, entry)
    }
  }
  add(commits, 'commits')
  add(pullRequests, 'pullRequests')
  return [...byRepo.values()]
    .sort((a, b) => b.commits + b.pullRequests - (a.commits + a.pullRequests))
    .slice(0, limit)
}

const MAX_PUSH_WEIGHT = 20

export interface EventLike {
  type: string
  created_at: string
  payload?: { size?: number; action?: string }
}

// Public events turned into weighted activity timestamps; a push counts its commits.
export function activityEvents(events: EventLike[]): ActivityEvent[] {
  const result: ActivityEvent[] = []
  for (const event of events) {
    switch (event.type) {
      case 'PushEvent':
        result.push({
          at: event.created_at,
          weight: Math.min(MAX_PUSH_WEIGHT, Math.max(1, event.payload?.size ?? 1)),
        })
        break
      case 'PullRequestEvent':
      case 'IssuesEvent':
        if (event.payload?.action === 'opened') result.push({ at: event.created_at, weight: 1 })
        break
      case 'PullRequestReviewEvent':
      case 'IssueCommentEvent':
      case 'PullRequestReviewCommentEvent':
        result.push({ at: event.created_at, weight: 1 })
        break
    }
  }
  return result
}
