import { useId } from 'react'

import type { UserStats } from '../../../shared/types'
import { formatPercent, plural } from '../../lib/format'
import { Panel } from '../Panel'

const OTHER_COLOR = 'var(--c-outline)'

export function LanguageBreakdown({ stats }: { stats: UserStats }) {
  const headingId = useId()
  const { languages, publicRepoCount } = stats

  return (
    <Panel className="flex flex-col p-space-lg" aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-space-sm">
        <h2
          id={headingId}
          className="font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
        >
          Languages
        </h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {plural(publicRepoCount, 'public repo')}
        </span>
      </div>

      {languages.length === 0 ? (
        <p className="mt-space-lg grid flex-1 place-items-center rounded-lg border border-dashed border-border p-space-lg text-center font-body-md text-body-md text-on-surface-variant">
          No code in public repositories yet.
        </p>
      ) : (
        <>
          <div
            className="mt-space-lg flex h-2.5 overflow-hidden rounded-full bg-on-surface/5"
            aria-hidden="true"
          >
            {languages.map((language) => (
              <span
                key={language.name}
                className="h-full border-r-2 border-surface-container-low last:border-r-0"
                style={{
                  width: `${language.share * 100}%`,
                  background: language.color ?? OTHER_COLOR,
                }}
              />
            ))}
          </div>
          <ul className="mt-space-lg space-y-2.5">
            {languages.map((language) => (
              <li
                key={language.name}
                className="flex items-center gap-space-sm font-body-md text-body-md"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: language.color ?? OTHER_COLOR }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{language.name}</span>
                <span className="font-label-md text-label-md text-on-surface-variant tabular-nums">
                  {formatPercent(language.share, 1)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-auto pt-space-lg font-body-sm text-body-sm text-on-surface-variant">
            Share of code across their own public, non-fork repositories.
          </p>
        </>
      )}
    </Panel>
  )
}
