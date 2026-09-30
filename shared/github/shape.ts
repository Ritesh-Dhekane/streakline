import {
  activityEvents,
  contributionsChange,
  currentStreak,
  externalContributions,
  languageShares,
  longestStreak,
  mostActiveWeekday,
  weekdayAverages,
  type RepoContribution,
} from '../stats'
import type { CalendarDay, ContributionLevel, UserStats } from '../types'
import type { RawEvent, RawRepoContribution, RawUser } from './query'

const TOP_REPOS = 6

const LEVELS: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

export function buildUserStats(
  user: RawUser,
  events: RawEvent[],
  { year, now }: { year: number; now: Date },
): UserStats {
  const today = now.toISOString().slice(0, 10)
  const collection = user.contributionsCollection

  const calendar: CalendarDay[] = collection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date.startsWith(`${year}-`) && day.date <= today)
    .map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: LEVELS[day.contributionLevel] ?? 0,
    }))
  const previous = user.previous.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date.startsWith(`${year - 1}-`))
    .map((day) => ({ date: day.date, count: day.contributionCount }))
  const bothYears = [...previous, ...calendar]
  const isCurrentYear = year === now.getUTCFullYear()
  const averages = weekdayAverages(calendar, today)

  return {
    profile: {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      url: user.url,
      bio: user.bio,
      company: user.company,
      location: user.location,
      websiteUrl: user.websiteUrl,
      createdAt: user.createdAt,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      isHireable: user.isHireable,
      hasSponsorsListing: user.hasSponsorsListing,
      organizations: user.organizations.nodes,
    },
    year,
    years: [...collection.contributionYears].sort((a, b) => b - a),
    calendar,
    totals: {
      contributions: calendar.reduce((sum, day) => sum + day.count, 0),
      commits: collection.totalCommitContributions,
      pullRequests: collection.totalPullRequestContributions,
      issues: collection.totalIssueContributions,
      reviews: collection.totalPullRequestReviewContributions,
    },
    contributionsChange: contributionsChange(
      calendar,
      previous,
      isCurrentYear ? today : `${year}-12-31`,
    ),
    pullRequests: {
      total: user.allPullRequests.totalCount,
      merged: user.mergedPullRequests.totalCount,
    },
    streaks: {
      current: isCurrentYear ? currentStreak(bothYears, today) : null,
      longest: longestStreak(bothYears, year),
    },
    weekdays: { average: averages, mostActive: mostActiveWeekday(averages) },
    languages: languageShares(
      user.repositories.nodes.map((repo) => ({
        languages: repo.languages.edges.map((edge) => ({
          size: edge.size,
          name: edge.node.name,
          color: edge.node.color,
        })),
      })),
    ),
    topRepos: user.repositories.nodes.slice(0, TOP_REPOS).map((repo) => ({
      name: repo.name,
      nameWithOwner: repo.nameWithOwner,
      url: repo.url,
      description: repo.description,
      language: repo.primaryLanguage,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      pushedAt: repo.pushedAt,
    })),
    publicRepoCount: user.repositories.totalCount,
    contributedTo: externalContributions(
      collection.commitContributionsByRepository.map(toRepoContribution),
      collection.pullRequestContributionsByRepository.map(toRepoContribution),
      user.login,
    ),
    recentActivity: activityEvents(events),
    generatedAt: now.toISOString(),
  }
}

function toRepoContribution(item: RawRepoContribution): RepoContribution {
  return {
    nameWithOwner: item.repository.nameWithOwner,
    url: item.repository.url,
    owner: item.repository.owner.login,
    isPrivate: item.repository.isPrivate,
    count: item.contributions.totalCount,
  }
}
