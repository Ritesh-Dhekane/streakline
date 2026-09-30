import {
  CloudOff,
  Hourglass,
  PlugZap,
  RotateCw,
  SearchX,
  Sprout,
  Timer,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'

import { DAILY_LOOKUPS } from '../../../shared/limits'
import type { ApiErrorCode } from '../../lib/api'
import { Panel } from '../Panel'

// Loading placeholder shaped like the profile page (DESIGN.md: monochrome shimmer).
export function ProfileSkeleton({ login }: { login: string }) {
  return (
    <div
      className="grid gap-gutter-mobile lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-gutter xl:grid-cols-[320px_minmax(0,1fr)]"
      role="status"
      aria-label="Loading profile"
    >
      <h1 className="sr-only">Loading @{login}…</h1>
      <Panel as="div" className="p-space-lg">
        <div className="flex gap-space-md lg:flex-col">
          <Bone className="size-20 rounded-lg lg:size-28" />
          <div className="flex-1 space-y-space-sm">
            <Bone className="h-7 w-40" />
            <Bone className="h-4 w-24" />
          </div>
        </div>
        <Bone className="mt-space-lg h-4 w-full" />
        <Bone className="mt-space-sm h-4 w-3/4" />
        <Bone className="mt-space-lg h-9 w-full rounded-lg" />
        <div className="mt-space-lg space-y-3">
          {[60, 45, 70, 55].map((w) => (
            <Bone key={w} className="h-4" style={{ width: `${w}%` }} />
          ))}
        </div>
      </Panel>
      <div className="min-w-0 space-y-gutter-mobile lg:space-y-gutter">
        <Panel as="div" className="p-space-lg">
          <Bone className="h-3 w-32" />
          <Bone className="mt-space-sm h-9 w-64" />
          <div className="mt-space-lg grid grid-flow-col grid-rows-7 gap-[3px] overflow-hidden">
            {Array.from({ length: 7 * 53 }, (_, i) => (
              <span key={i} className="skeleton aspect-square min-w-2 rounded-[2px]" />
            ))}
          </div>
          <Bone className="mt-space-md h-10 w-full rounded-lg" />
        </Panel>
        <div className="grid grid-cols-2 gap-gutter-mobile sm:grid-cols-3 lg:gap-gutter">
          {Array.from({ length: 6 }, (_, i) => (
            <Panel as="div" key={i} className="space-y-space-sm p-space-lg">
              <Bone className="h-4 w-24" />
              <Bone className="h-9 w-20" />
              <Bone className="h-3 w-28" />
            </Panel>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bone({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={`skeleton block rounded-md ${className}`} style={style} />
}

interface StateCopy {
  icon: LucideIcon
  title: string
  text: ReactNode
  retry?: boolean
}

function errorCopy(code: ApiErrorCode, login: string, retryAt: Date | null): StateCopy {
  switch (code) {
    case 'not_found':
      return {
        icon: UserX,
        title: `No GitHub user called @${login}`,
        text: 'Check the spelling, or try someone else.',
      }
    case 'bad_request':
      return {
        icon: SearchX,
        title: 'That isn’t a GitHub username',
        text: 'Usernames use letters, numbers and single hyphens, up to 39 characters.',
      }
    case 'rate_limited':
      return {
        icon: Hourglass,
        title: 'Too many lookups right now',
        text: 'GitHub limits how often we can ask for data. Try again in a minute.',
        retry: true,
      }
    case 'quota_exceeded':
      return {
        icon: Timer,
        title: `You’ve looked up ${DAILY_LOOKUPS} profiles today`,
        text: (
          <>
            To keep Streakline free, each visitor can look up {DAILY_LOOKUPS} different GitHub users
            a day. Profiles you’ve already opened still work
            {retryAt ? <>, and you can look up someone new {untilText(retryAt)}</> : null}.
          </>
        ),
      }
    case 'not_configured':
      return {
        icon: PlugZap,
        title: 'The data service isn’t connected yet',
        text: 'This copy of Streakline has no API behind it, so profiles can’t load.',
      }
    case 'network':
      return {
        icon: CloudOff,
        title: 'Couldn’t connect',
        text: 'Streakline’s data service didn’t answer. Check your connection and try again.',
        retry: true,
      }
    case 'upstream':
      return {
        icon: CloudOff,
        title: 'Couldn’t reach GitHub',
        text: 'The data didn’t come through. It’s usually temporary.',
        retry: true,
      }
  }
}

export function ProfileError({
  code,
  login,
  retryAt = null,
  onRetry,
}: {
  code: ApiErrorCode
  login: string
  retryAt?: Date | null
  onRetry: () => void
}) {
  const copy = errorCopy(code, login, retryAt)
  return (
    <StateCard icon={copy.icon} title={copy.title} alert>
      <p>{copy.text}</p>
      <div className="mt-space-lg flex flex-wrap justify-center gap-space-sm">
        {copy.retry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-on-surface/5 px-3 py-1.5 font-label-md text-label-md text-on-surface transition-colors hover:bg-on-surface/10"
          >
            <RotateCw className="size-3.5" aria-hidden="true" /> Try again
          </button>
        )}
        <Link
          to="/"
          className="rounded-lg px-3 py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          ← Search another user
        </Link>
      </div>
    </StateCard>
  )
}

// "in about 5 h" / "in about 20 min" / "in a moment".
function untilText(at: Date): string {
  const minutes = Math.ceil((at.getTime() - Date.now()) / 60000)
  if (minutes <= 1) return 'in a moment'
  if (minutes < 60) return `in about ${minutes} min`
  return `in about ${Math.round(minutes / 60)} h`
}

export function NoPublicActivity({ login }: { login: string }) {
  return (
    <StateCard icon={Sprout} title="No public activity yet">
      <p>
        @{login} hasn’t made any public contributions or public repositories. Private work never
        shows here.
      </p>
    </StateCard>
  )
}

function StateCard({
  icon: Icon,
  title,
  alert = false,
  children,
}: {
  icon: LucideIcon
  title: string
  alert?: boolean
  children: ReactNode
}) {
  return (
    <Panel as="div" className="flex flex-col items-center px-space-lg py-space-xl text-center">
      <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-container text-on-surface-variant">
        <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div role={alert ? 'alert' : undefined}>
        <h1 className="mt-space-md font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md">
          {title}
        </h1>
        <div className="mx-auto mt-space-sm max-w-md font-body-md text-body-md text-on-surface-variant">
          {children}
        </div>
      </div>
    </Panel>
  )
}
