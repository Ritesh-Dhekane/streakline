export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'streakline-theme'

// Dark is the default look; a stored choice wins.
export function resolveTheme(stored: string | null): Theme {
  return stored === 'light' ? 'light' : 'dark'
}

export function readTheme(): Theme {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage may be unavailable (private mode); the choice just won't be remembered
  }
}
