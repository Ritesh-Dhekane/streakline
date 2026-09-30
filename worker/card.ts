// SVG cards drawn from UserStats: a README badge (520×200) and a social preview (1200×630).
// Plain string building so it stays well inside the Worker's CPU budget.

import type { CalendarDay, UserStats } from '../shared/types'

export type CardTheme = 'dark' | 'light'
export type CardLayout = 'badge' | 'og'

interface Palette {
  bg: string
  border: string
  ink: string
  muted: string
  accent: string
  accent2: string
  heat: [string, string, string, string, string]
  track: string
}

const PALETTES: Record<CardTheme, Palette> = {
  dark: {
    bg: '#0f131c',
    border: '#262a33',
    ink: '#dfe2ee',
    muted: '#9aa8a0',
    accent: '#4edea3',
    accent2: '#4cd7f6',
    heat: ['#1f242d', '#064e3b', '#059669', '#10b981', '#34d399'],
    track: '#1f242d',
  },
  light: {
    bg: '#ffffff',
    border: '#e2e8f0',
    ink: '#0f172a',
    muted: '#64748b',
    accent: '#047857',
    accent2: '#0e7490',
    heat: ['#eef1f5', '#a7f3d0', '#34d399', '#10b981', '#047857'],
    track: '#eef1f5',
  },
}

const SANS = `'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif`
const MONO = `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`
const W = 520
const H = 200
const WEEKS = 16

export interface CardOptions {
  theme: CardTheme
  layout: CardLayout
  avatar: string | null // data: URI, or null to draw initials
  siteLabel: string // e.g. "ritesh-dhekane.github.io/streakline"
}

export function renderCard(stats: UserStats, options: CardOptions): string {
  const badge = renderBadge(stats, options)
  if (options.layout === 'badge') return badge
  const p = PALETTES[options.theme]
  // The social preview is the badge, enlarged, on a full-bleed canvas.
  const scale = 2.1
  const x = (1200 - W * scale) / 2
  return svg(1200, 630, `${esc(displayName(stats))} on Streakline`, [
    `<rect width="1200" height="630" fill="${p.bg}"/>`,
    `<svg x="${x}" y="70" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">${stripOuter(badge)}</svg>`,
    `<text x="600" y="585" text-anchor="middle" font-family="${MONO}" font-size="22" fill="${p.muted}">${esc(options.siteLabel)}/${esc(stats.profile.login)}</text>`,
  ])
}

export function renderMessageCard(message: string, theme: CardTheme): string {
  const p = PALETTES[theme]
  return svg(W, 80, message, [
    `<rect x="0.5" y="0.5" width="${W - 1}" height="79" rx="12" fill="${p.bg}" stroke="${p.border}"/>`,
    logo(24, 28, 1),
    `<text x="56" y="45" font-family="${SANS}" font-size="15" fill="${p.muted}">${esc(message)}</text>`,
  ])
}

function renderBadge(stats: UserStats, { theme, avatar }: CardOptions): string {
  const p = PALETTES[theme]
  const { profile, totals, streaks, year } = stats
  const name = displayName(stats)
  const current = streaks.current?.length ?? null
  const parts: string[] = [
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${p.bg}" stroke="${p.border}"/>`,
    // header: avatar, name, login, mark
    `<clipPath id="av"><circle cx="48" cy="46" r="22"/></clipPath>`,
    avatar
      ? `<image href="${avatar}" x="26" y="24" width="44" height="44" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="48" cy="46" r="22" fill="${p.track}"/><text x="48" y="52" text-anchor="middle" font-family="${SANS}" font-size="16" font-weight="600" fill="${p.accent}">${esc(profile.login.slice(0, 2).toUpperCase())}</text>`,
    `<text x="82" y="42" font-family="${SANS}" font-size="18" font-weight="600" fill="${p.ink}">${esc(truncate(name, 26))}</text>`,
    `<text x="82" y="62" font-family="${MONO}" font-size="12" fill="${p.muted}">@${esc(truncate(profile.login, 30))}</text>`,
    logo(W - 104, 30, 0.9),
    `<text x="${W - 84}" y="43" font-family="${SANS}" font-size="13" font-weight="600" fill="${p.muted}">Streakline</text>`,
    // stats
    stat(24, `Contributions ${year}`, totals.contributions.toLocaleString('en-US'), p.ink, p),
    stat(
      150,
      current === null ? 'Commits' : 'Current streak',
      current === null ? totals.commits.toLocaleString('en-US') : `${current}d`,
      p.accent,
      p,
    ),
    stat(266, 'Longest streak', `${streaks.longest.length}d`, p.accent2, p),
    heatmap(recentWeeks(stats.calendar), W - 24 - (WEEKS * 9 - 2), 86, p),
    languages(stats, p),
  ]
  return svg(W, H, `${name}'s GitHub activity on Streakline`, parts)
}

function stat(x: number, label: string, value: string, color: string, p: Palette): string {
  return [
    `<text x="${x}" y="100" font-family="${SANS}" font-size="11" fill="${p.muted}">${esc(label)}</text>`,
    `<text x="${x}" y="128" font-family="${SANS}" font-size="24" font-weight="600" fill="${color}">${esc(value)}</text>`,
  ].join('')
}

function heatmap(weeks: (CalendarDay | null)[][], x: number, y: number, p: Palette): string {
  const step = 9
  const size = 7
  return weeks
    .flatMap((week, w) =>
      week.map((day, d) => {
        const fill = day ? p.heat[day.level] : p.track
        const opacity = day ? '' : ' opacity="0.5"'
        return `<rect x="${x + w * step}" y="${y + d * step}" width="${size}" height="${size}" rx="1.5" fill="${fill}"${opacity}/>`
      }),
    )
    .join('')
}

function languages(stats: UserStats, p: Palette): string {
  const langs = stats.languages.slice(0, 4)
  if (langs.length === 0) {
    return `<text x="24" y="170" font-family="${SANS}" font-size="12" fill="${p.muted}">No public code yet</text>`
  }
  const barX = 24
  const barW = W - 48
  let offset = 0
  const segments = langs.map((lang) => {
    const width = Math.max(2, lang.share * barW)
    const rect = `<rect x="${barX + offset}" y="152" width="${width}" height="6" fill="${lang.color ?? p.muted}"/>`
    offset += width
    return rect
  })
  let labelX = barX
  const labels = langs
    .slice(0, 3)
    .filter((lang) => lang.share >= 0.01)
    .map((lang) => {
      const text = `${lang.name} ${Math.round(lang.share * 100)}%`
      const out = `<circle cx="${labelX + 4}" cy="178" r="4" fill="${lang.color ?? p.muted}"/><text x="${labelX + 13}" y="182" font-family="${SANS}" font-size="12" fill="${p.muted}">${esc(text)}</text>`
      labelX += 22 + text.length * 6.6
      return out
    })
  return [
    `<clipPath id="bar"><rect x="${barX}" y="152" width="${barW}" height="6" rx="3"/></clipPath>`,
    `<rect x="${barX}" y="152" width="${barW}" height="6" rx="3" fill="${p.track}"/>`,
    `<g clip-path="url(#bar)">${segments.join('')}</g>`,
    ...labels,
  ].join('')
}

// The last WEEKS weeks of the calendar as Sunday-first columns; null = no data for that day.
export function recentWeeks(calendar: CalendarDay[]): (CalendarDay | null)[][] {
  const last = calendar.at(-1)
  if (!last) return Array.from({ length: WEEKS }, () => Array.from({ length: 7 }, () => null))
  const byDate = new Map(calendar.map((day) => [day.date, day]))
  const end = new Date(`${last.date}T00:00:00Z`)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - end.getUTCDay() - (WEEKS - 1) * 7)
  const weeks: (CalendarDay | null)[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const week: (CalendarDay | null)[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setUTCDate(start.getUTCDate() + w * 7 + d)
      week.push(byDate.get(date.toISOString().slice(0, 10)) ?? null)
    }
    weeks.push(week)
  }
  return weeks
}

function logo(x: number, y: number, scale: number): string {
  const s = (n: number) => n * scale
  const cell = (dx: number, dy: number, fill: string) =>
    `<rect x="${x + s(dx)}" y="${y + s(dy)}" width="${s(7)}" height="${s(7)}" rx="${s(1.5)}" fill="${fill}"/>`
  return [
    cell(0, 0, '#10b981'),
    cell(9, 0, '#34d399'),
    cell(0, 9, '#059669'),
    cell(9, 9, '#06b6d4'),
  ].join('')
}

function svg(width: number, height: number, title: string, parts: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${parts.join('')}</svg>`
}

function stripOuter(markup: string): string {
  return markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
}

function displayName(stats: UserStats): string {
  return stats.profile.name?.trim() || stats.profile.login
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
