import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { applyTheme, readTheme, type Theme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
      className="grid size-9 place-items-center rounded-lg border border-outline-variant/40 bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}
