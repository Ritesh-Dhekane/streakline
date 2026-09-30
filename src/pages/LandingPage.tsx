import { ArrowRight, CalendarDays, FolderGit2, Keyboard, Timer } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { DAILY_LOOKUPS, EXAMPLE_LOGINS } from '../../shared/limits'
import { GridMotif } from '../components/GridMotif'
import { parseUsernameInput } from '../lib/username'

const HIGHLIGHTS = [
  {
    icon: CalendarDays,
    title: 'Heatmap & streaks',
    text: 'Every contribution of the year, current and longest streaks, and the busiest weekday.',
  },
  {
    icon: Timer,
    title: 'Rhythm & languages',
    text: 'When they tend to code, shown in your time zone, and the languages across their work.',
  },
  {
    icon: FolderGit2,
    title: 'Repos & collaborations',
    text: 'Their most-starred projects and the open-source repos they contribute to.',
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const errorId = useId()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const login = parseUsernameInput(value)
    if (!login) {
      setInvalid(true)
      return
    }
    navigate(`/${login}`)
  }

  return (
    <div className="mx-auto max-w-[1440px] px-margin-mobile md:px-margin">
      <section className="relative isolate flex flex-col items-center py-16 text-center md:py-28">
        <GridMotif />

        <p className="mb-space-md inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 font-label-sm text-label-sm text-primary shadow-sm">
          <span aria-hidden="true">✦</span> Public GitHub activity, beautifully
        </p>
        <h1 className="font-headline-xl text-headline-xl-mobile tracking-tight md:text-headline-xl">
          Streakline
        </h1>
        <p className="mt-space-sm max-w-md font-body-lg text-body-lg text-on-surface-variant">
          An elegant lens into public code journeys, contribution rhythms, and developer impact.
        </p>

        <form onSubmit={submit} className="mt-space-xl w-full max-w-xl" role="search">
          <label
            className={`flex items-center gap-space-sm rounded-xl border bg-surface-container-low p-2 pl-4 shadow-glow transition-colors ${
              invalid ? 'border-error' : 'border-border focus-within:border-primary'
            }`}
          >
            <Keyboard className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
            <span className="sr-only">GitHub username</span>
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setInvalid(false)
              }}
              placeholder="e.g. torvalds"
              autoFocus
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : undefined}
              className="min-w-0 flex-1 bg-transparent py-2 font-label-lg text-label-lg text-on-surface outline-none placeholder:text-on-surface-variant/70"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2.5 font-label-lg text-label-lg font-semibold text-[#0b0f17] transition hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-[0.98]"
            >
              View <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </label>
          <p
            id={errorId}
            role="alert"
            className={`mt-space-sm font-body-sm text-body-sm text-error ${invalid ? '' : 'invisible'}`}
          >
            That doesn’t look like a GitHub username.
          </p>
        </form>

        <div className="mt-space-sm flex max-w-full items-center gap-space-sm overflow-x-auto pb-1">
          <span className="shrink-0 font-label-md text-label-md text-on-surface-variant">Try:</span>
          {EXAMPLE_LOGINS.map((login) => (
            <Link
              key={login}
              to={`/${login}`}
              className="shrink-0 rounded-full border border-border bg-surface-container px-3 py-1 font-label-md text-label-md text-on-surface-variant transition-colors hover:border-primary/50 hover:text-on-surface"
            >
              @{login}
            </Link>
          ))}
        </div>
        <p className="mt-space-md font-label-sm text-label-sm text-on-surface-variant">
          Free · up to {DAILY_LOOKUPS} profiles a day per visitor · the examples don’t count
        </p>
      </section>

      <section className="grid gap-gutter-mobile pb-24 md:grid-cols-3 md:gap-gutter">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="rounded-md border border-border bg-surface-container-low p-space-lg"
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-space-md font-headline-sm text-headline-sm">{title}</h2>
            <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">{text}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
