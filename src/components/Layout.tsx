import { Link, Outlet, useLocation } from 'react-router'

import { LogoMark } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { MobileUsernameSearch, UsernameSearch } from './UsernameSearch'

const REPO_URL = 'https://github.com/Ritesh-Dhekane/streakline'

export function Layout() {
  const { pathname } = useLocation()
  const onLanding = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-primary-container px-3 py-2 font-label-md text-label-md text-[#0b0f17] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
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
          <div className="flex items-center gap-space-sm sm:gap-space-md">
            {!onLanding && (
              <>
                <UsernameSearch />
                <MobileUsernameSearch />
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-outline-variant/30">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-space-xs px-margin-mobile py-space-lg font-label-sm text-label-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between md:px-margin">
          <span>
            Streakline · public GitHub data only ·{' '}
            <a href={REPO_URL} className="text-secondary underline underline-offset-2">
              open source
            </a>
          </span>
          <span>Not affiliated with GitHub.</span>
        </div>
      </footer>
    </div>
  )
}
