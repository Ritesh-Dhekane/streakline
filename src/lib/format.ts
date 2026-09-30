// Display helpers. Dates from the API are UTC calendar dates (YYYY-MM-DD) or ISO timestamps.

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

// 4829 → "4.8k", 14800 → "14.8k", 1200000 → "1.2M"; under 1000 unchanged.
export function formatCompact(value: number): string {
  if (value < 1000) return String(value)
  const [divisor, suffix] = value < 1e6 ? [1e3, 'k'] : [1e6, 'M']
  const scaled = value / divisor
  const text = scaled >= 100 ? Math.round(scaled).toString() : scaled.toFixed(1)
  return `${text.replace(/\.0$/, '')}${suffix}`
}

export function formatPercent(share: number, digits = 0): string {
  return `${(share * 100).toFixed(digits)}%`
}

// "+18%" / "−4%"; null when there's nothing to compare against.
export function formatChange(change: number | null): string | null {
  if (change === null || !Number.isFinite(change)) return null
  const percent = Math.round(change * 100)
  return percent >= 0 ? `+${percent}%` : `−${Math.abs(percent)}%`
}

function utcDate(date: string): Date {
  return new Date(date.length === 10 ? `${date}T00:00:00Z` : date)
}

// "Mar 4" or "Mar 4, 2025" (year shown when it differs from `currentYear`).
export function formatDay(date: string, currentYear?: number): string {
  const d = utcDate(date)
  const sameYear = currentYear !== undefined && d.getUTCFullYear() === currentYear
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })
}

export function formatLongDay(date: string): string {
  return utcDate(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatMonthYear(date: string): string {
  return utcDate(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function weekdayName(index: number, short = false): string {
  const name = WEEKDAYS[index] ?? ''
  return short ? name.slice(0, 3) : name
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`
}

// "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then "Jun 12" / "Jun 12, 2024".
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.round((now.getTime() - then.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDay(iso, now.getUTCFullYear())
}

// Host and path without the protocol, for showing a website link.
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// Profiles sometimes store websites without a protocol.
export function absoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
