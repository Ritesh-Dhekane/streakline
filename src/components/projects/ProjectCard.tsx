import { ArrowUpRight, ExternalLink, Star } from 'lucide-react'

import type { ProjectRepo } from '../../../shared/types'
import { displayUrl, formatCompact, formatNumber, formatRelative } from '../../lib/format'

// "quill-kv" reads better as a title without the dashes.
function projectTitle(name: string): string {
  return name.replace(/[-_]+/g, ' ')
}

export function ProjectCard({ repo }: { repo: ProjectRepo }) {
  return (
    <article className="flex h-full flex-col rounded-md border border-border bg-surface-container-low p-space-lg transition-colors hover:border-primary/30">
      <h3 className="font-headline-sm text-headline-sm break-words capitalize">
        <a href={repo.url} target="_blank" rel="noreferrer" className="hover:text-primary">
          {projectTitle(repo.name)}
        </a>
      </h3>
      <p className="mt-space-sm flex-1 font-body-md text-body-md text-on-surface-variant">
        {repo.description ?? <em>No description</em>}
      </p>

      {repo.topics.length > 0 && (
        <ul className="mt-space-md flex flex-wrap gap-space-xs" aria-label="Topics">
          {repo.topics.map((topic) => (
            <li
              key={topic}
              className="rounded-full border border-border bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-on-surface-variant"
            >
              {topic}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-space-md flex flex-wrap items-center gap-x-space-md gap-y-space-xs font-label-sm text-label-sm text-on-surface-variant">
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
        {repo.stars > 0 && (
          <span className="flex items-center gap-1" title={`${formatNumber(repo.stars)} stars`}>
            <Star className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Stars:</span>
            {formatCompact(repo.stars)}
          </span>
        )}
        {repo.pushedAt && <span>Updated {formatRelative(repo.pushedAt)}</span>}
      </div>

      <div className="mt-space-md flex flex-wrap gap-space-md border-t border-border pt-space-md font-label-md text-label-md">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          Repository <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary"
          >
            {displayUrl(repo.homepage)} <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}
