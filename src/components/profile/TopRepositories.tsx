import { ArrowUpRight, BookMarked, GitFork, Star } from 'lucide-react'
import { useId } from 'react'

import type { UserStats } from '../../../shared/types'
import { formatCompact, formatNumber, formatRelative } from '../../lib/format'

export function TopRepositories({ stats }: { stats: UserStats }) {
  const headingId = useId()
  const { topRepos, publicRepoCount, profile } = stats
  if (topRepos.length === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-space-md flex items-center justify-between gap-space-sm">
        <h2
          id={headingId}
          className="flex items-center gap-space-sm font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
        >
          <BookMarked className="size-5 text-primary" aria-hidden="true" />
          Top repositories
        </h2>
        <a
          href={`${profile.url}?tab=repositories`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-primary"
        >
          View all {formatNumber(publicRepoCount)}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
      <ul className="grid gap-gutter-mobile md:grid-cols-2 lg:gap-gutter">
        {topRepos.map((repo) => {
          const [owner, name] = splitName(repo.nameWithOwner)
          return (
            <li key={repo.nameWithOwner}>
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col rounded-md border border-border bg-surface-container-low p-space-lg transition-colors hover:border-primary/30"
              >
                <span className="flex items-start justify-between gap-space-sm">
                  <span className="min-w-0 truncate font-headline-sm text-headline-sm">
                    <span className="text-on-surface-variant">{owner}/</span>
                    <span className="text-primary group-hover:underline">{name}</span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-space-sm line-clamp-2 flex-1 font-body-md text-body-md text-on-surface-variant">
                  {repo.description ?? <em>No description</em>}
                </span>
                <span className="mt-space-md flex flex-wrap items-center gap-x-space-md gap-y-space-xs font-label-sm text-label-sm text-on-surface-variant">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: repo.language.color ?? 'var(--c-outline)' }}
                        aria-hidden="true"
                      />
                      {repo.language.name}
                    </span>
                  )}
                  <span
                    className="flex items-center gap-1"
                    title={`${formatNumber(repo.stars)} stars`}
                  >
                    <Star className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Stars:</span>
                    {formatCompact(repo.stars)}
                  </span>
                  <span
                    className="flex items-center gap-1"
                    title={`${formatNumber(repo.forks)} forks`}
                  >
                    <GitFork className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Forks:</span>
                    {formatCompact(repo.forks)}
                  </span>
                  {repo.pushedAt && (
                    <span className="ml-auto">Updated {formatRelative(repo.pushedAt)}</span>
                  )}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function splitName(nameWithOwner: string): [string, string] {
  const slash = nameWithOwner.indexOf('/')
  return [nameWithOwner.slice(0, slash), nameWithOwner.slice(slash + 1)]
}
