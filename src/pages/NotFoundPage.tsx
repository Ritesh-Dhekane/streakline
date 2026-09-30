import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-space-md px-margin-mobile py-24 text-center">
      <p className="font-label-md text-label-md text-primary">404</p>
      <h1 className="font-headline-md text-headline-md">This page doesn’t exist</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Profiles live at <span className="font-mono">/streakline/username</span>.
      </p>
      <Link
        to="/"
        className="rounded-lg px-3 py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
      >
        ← Back to search
      </Link>
    </section>
  )
}
