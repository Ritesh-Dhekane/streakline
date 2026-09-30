// Addresses of the Streakline API and the public site, for badges and share links.

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
export const SITE_URL = 'https://ritesh-dhekane.github.io/streakline'

export type CardTheme = 'dark' | 'light'

export function cardUrl(login: string, theme: CardTheme): string | null {
  if (!API_BASE) return null
  const query = theme === 'light' ? '?theme=light' : ''
  return `${API_BASE}/card/${encodeURIComponent(login)}.svg${query}`
}

export function profileUrl(login: string): string {
  return `${SITE_URL}/${login}`
}

// The link to share: a Worker page with preview tags that forwards to the profile.
export function shareUrl(login: string): string {
  return API_BASE ? `${API_BASE}/u/${encodeURIComponent(login)}` : profileUrl(login)
}

export function badgeMarkdown(login: string, theme: CardTheme): string {
  return `[![${login}'s GitHub activity](${cardUrl(login, theme)})](${profileUrl(login)})`
}

// Follows the reader's light/dark setting on GitHub.
export function badgeHtml(login: string): string {
  return [
    `<a href="${profileUrl(login)}">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${cardUrl(login, 'dark')}">`,
    `    <img alt="${login}'s GitHub activity" src="${cardUrl(login, 'light')}">`,
    `  </picture>`,
    `</a>`,
  ].join('\n')
}
