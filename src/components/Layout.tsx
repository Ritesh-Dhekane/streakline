import { Link, Outlet, useLocation } from 'react-router'

import { LogoMark } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { UsernameSearch } from './UsernameSearch'

const REPO_URL = 'https://github.com/Ritesh-Dhekane/streakline'

export function Layout() {
  const { pathname } = useLocation()
  const onLanding = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-space-md px-margin-mobile md:px-margin">
          <Link to="/" className="group flex items-center gap-space-sm">
            <span className="grid size-8 place-items-center rounded-lg border border-outline-variant/40 bg-surface-container transition-colors group-hover:border-primary/50">
              <LogoMark className="size-4" />
            </span>
            <span className="font-headline-sm text-headline-sm font-semibold tracking-tight">
              Streakline
            </span>
          </Link>
          <div className="flex items-center gap-space-md">
            {!onLanding && <UsernameSearch />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-outline-variant/30">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-space-xs px-margin-mobile py-space-lg font-label-sm text-label-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between md:px-margin">
          <span>
            Streakline · public GitHub data only ·{' '}
            <a href={REPO_URL} className="text-secondary hover:underline">
              open source
            </a>
          </span>
          <span>Not affiliated with GitHub.</span>
        </div>
      </footer>
    </div>
  )
}
