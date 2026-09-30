import { isValidUsername } from '../../shared/github/client'

// Accepts "torvalds", "@torvalds" or a pasted profile link like
// "https://github.com/torvalds/"; returns the username, or null if it isn't one.
export function parseUsernameInput(raw: string): string | null {
  let value = raw.trim()
  const link = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)\/?(?:[?#].*)?$/i.exec(value)
  if (link?.[1]) value = link[1]
  value = value.replace(/^@/, '')
  return isValidUsername(value) ? value : null
}
