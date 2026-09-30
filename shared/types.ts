// The API contract between the Worker and the site: everything the profile page
// shows, already shaped. Public data only.

export type ContributionLevel = 0 | 1 | 2 | 3 | 4

export interface CalendarDay {
  date: string // YYYY-MM-DD
  count: number
  level: ContributionLevel
}

export interface Streak {
  length: number
  start: string | null
  end: string | null
}

export interface Profile {
  login: string
  name: string | null
  avatarUrl: string
  url: string
  bio: string | null
  company: string | null
  location: string | null
  websiteUrl: string | null
  createdAt: string
  followers: number
  following: number
  isHireable: boolean
  hasSponsorsListing: boolean
  organizations: { login: string; name: string | null; avatarUrl: string }[]
}

export interface Language {
  name: string
  color: string | null
}

export interface LanguageShare extends Language {
  share: number // 0–1
}

export interface RepoSummary {
  name: string
  nameWithOwner: string
  url: string
  description: string | null
  language: Language | null
  stars: number
  forks: number
  pushedAt: string | null
}

export interface ExternalContribution {
  nameWithOwner: string
  url: string
  commits: number
  pullRequests: number
}

export interface ActivityEvent {
  at: string // ISO timestamp (UTC)
  weight: number
}

export interface UserStats {
  profile: Profile
  year: number
  years: number[] // years with contributions, newest first
  calendar: CalendarDay[] // the selected year, Jan 1 → Dec 31 (or today)
  totals: {
    contributions: number
    commits: number
    pullRequests: number
    issues: number
    reviews: number
  }
  // Change in contributions vs. the same period of the previous year (0.18 = +18%).
  contributionsChange: number | null
  pullRequests: { total: number; merged: number } // all public PRs ever
  streaks: {
    current: Streak | null // only for the current year
    longest: Streak // within the selected year
  }
  weekdays: {
    average: number[] // index 0 = Sunday
    mostActive: number | null
  }
  languages: LanguageShare[]
  topRepos: RepoSummary[]
  publicRepoCount: number
  contributedTo: ExternalContribution[]
  recentActivity: ActivityEvent[] // up to ~90 days of public events
  generatedAt: string
}
