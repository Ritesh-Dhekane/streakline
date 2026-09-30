import { Network } from 'lucide-react'
import { useId } from 'react'

import type { UserStats } from '../../../shared/types'
import { plural } from '../../lib/format'
import { Panel } from '../Panel'

// Other people's public repositories they committed to or opened PRs in, during the year.
export function ContributesTo({ stats }: { stats: UserStats }) {
  const headingId = useId()
  const repos = stats.contributedTo

  return (
    <Panel className="p-space-lg" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-space-md">
        <div>
          <h2
            id={headingId}
            className="font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
          >
            Contributes to
          </h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            Other people’s public repositories they committed to or opened pull requests in during{' '}
            {stats.year}
          </p>
        </div>
        <Network className="size-6 shrink-0 text-primary" aria-hidden="true" />
      </div>

      {repos.length === 0 ? (
        <p className="mt-space-lg rounded-lg border border-dashed border-border p-space-lg text-center font-body-md text-body-md text-on-surface-variant">
          No contributions to other public repositories in {stats.year}.
        </p>
      ) : (
        <ul className="mt-space-lg grid grid-cols-1 gap-space-sm sm:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => {
            const parts = [
              repo.pullRequests ? plural(repo.pullRequests, 'PR') : null,
              repo.commits ? plural(repo.commits, 'commit') : null,
            ].filter(Boolean)
            return (
              <li key={repo.nameWithOwner}>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-space-sm rounded-lg border border-border bg-surface-container-lowest/40 p-space-sm pr-space-md transition-colors hover:border-primary/30"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-container-high font-label-sm text-label-sm text-primary uppercase"
                    aria-hidden="true"
                  >
                    {initials(repo.nameWithOwner)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-label-md text-label-md text-on-surface">
                      {repo.nameWithOwner}
                    </span>
                    <span className="block font-label-sm text-label-sm text-secondary">
                      {parts.join(' · ')}
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

// "tokio-rs/tokio" → "TO", "vercel/next.js" → "NE": two letters from the repo name.
function initials(nameWithOwner: string): string {
  const name = nameWithOwner.split('/')[1] ?? nameWithOwner
  const words = name.split(/[-_.]/).filter(Boolean)
  const letters = words.length > 1 ? `${words[0]?.[0]}${words[1]?.[0]}` : name.slice(0, 2)
  return letters
}
