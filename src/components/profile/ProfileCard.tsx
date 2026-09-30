import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Copy,
  Heart,
  Link2,
  MapPin,
  Share2,
  Users,
} from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'

import type { Profile } from '../../../shared/types'
import {
  absoluteUrl,
  displayUrl,
  formatCompact,
  formatMonthYear,
  formatNumber,
} from '../../lib/format'
import { shareUrl } from '../../lib/links'
import { Panel } from '../Panel'
import { ProfileActions } from './ProfileActions'

export function ProfileCard({ profile }: { profile: Profile }) {
  const [copied, setCopied] = useState<'login' | 'link' | null>(null)

  async function copy(what: 'login' | 'link') {
    const text = what === 'login' ? profile.login : shareUrl(profile.login)
    // Phones: the system share sheet. Elsewhere (or if it's dismissed with an error): copy.
    if (
      what === 'link' &&
      typeof navigator.share === 'function' &&
      matchMedia('(pointer: coarse)').matches
    ) {
      try {
        await navigator.share({
          title: `${profile.name ?? profile.login} on Streakline`,
          url: text,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); nothing useful to show.
    }
  }

  const company = profile.company?.trim()
  const orgFromCompany = company?.startsWith('@') ? company.slice(1).split(/\s/)[0] : undefined

  return (
    <Panel as="aside" className="p-space-lg" aria-label="Profile">
      <div className="flex items-start gap-space-md lg:flex-col">
        <img
          src={profile.avatarUrl}
          alt={`${profile.name ?? profile.login}’s avatar`}
          width={112}
          height={112}
          className="size-20 shrink-0 rounded-lg border border-border bg-surface-container object-cover lg:size-28"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-headline-md text-headline-md font-semibold tracking-tight">
            {profile.name ?? profile.login}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="truncate font-label-md text-label-md text-on-surface-variant">
              @{profile.login}
            </span>
            <button
              type="button"
              onClick={() => copy('login')}
              className="rounded p-0.5 text-on-surface-variant transition-colors hover:text-on-surface"
              aria-label={copied === 'login' ? 'Username copied' : 'Copy username'}
              title="Copy username"
            >
              {copied === 'login' ? (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
          {(profile.isHireable || profile.hasSponsorsListing) && (
            <div className="mt-space-sm flex flex-wrap gap-1.5">
              {profile.isHireable && <Pill>Open to work</Pill>}
              {profile.hasSponsorsListing && (
                <Pill>
                  <Heart className="size-3" aria-hidden="true" /> Sponsorable
                </Pill>
              )}
            </div>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-space-md font-body-md text-body-md break-words text-on-surface-variant">
          {profile.bio}
        </p>
      )}

      <div className="mt-space-lg flex gap-space-sm">
        <a
          href={profile.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg whitespace-nowrap bg-primary-container px-4 py-2 font-label-lg text-label-lg font-semibold text-[#0b0f17] transition hover:shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-[0.98]"
        >
          View on GitHub <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={() => copy('link')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-on-surface/5 px-3 py-2 font-label-md text-label-md transition-colors hover:bg-on-surface/10"
        >
          {copied === 'link' ? (
            <Check className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Share2 className="size-4" aria-hidden="true" />
          )}
          {copied === 'link' ? 'Copied' : 'Share'}
        </button>
      </div>
      <ProfileActions login={profile.login} />

      <ul className="mt-space-lg space-y-2.5 font-body-md text-body-md text-on-surface-variant">
        {company && (
          <Detail icon={Building2}>
            {orgFromCompany ? (
              <a
                href={`https://github.com/${orgFromCompany}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-on-surface hover:underline"
              >
                {company}
              </a>
            ) : (
              company
            )}
          </Detail>
        )}
        {profile.location && <Detail icon={MapPin}>{profile.location}</Detail>}
        {profile.websiteUrl && (
          <Detail icon={Link2}>
            <a
              href={absoluteUrl(profile.websiteUrl)}
              target="_blank"
              rel="noreferrer nofollow"
              className="text-secondary hover:underline"
            >
              {displayUrl(profile.websiteUrl)}
            </a>
          </Detail>
        )}
        <Detail icon={CalendarDays}>Joined {formatMonthYear(profile.createdAt)}</Detail>
        <Detail icon={Users}>
          <a
            href={`${profile.url}?tab=followers`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-on-surface"
            title={`${formatNumber(profile.followers)} followers`}
          >
            <span className="font-label-lg text-label-lg text-primary">
              {formatCompact(profile.followers)}
            </span>{' '}
            followers
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={`${profile.url}?tab=following`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-on-surface"
          >
            <span className="font-label-lg text-label-lg text-on-surface">
              {formatCompact(profile.following)}
            </span>{' '}
            following
          </a>
        </Detail>
      </ul>

      {profile.organizations.length > 0 && (
        <div className="mt-space-lg rounded-lg border border-border bg-surface-container-lowest/40 p-space-md">
          <h2 className="font-label-sm text-label-sm tracking-widest text-on-surface-variant uppercase">
            Organizations
          </h2>
          <ul className="mt-space-sm flex flex-wrap gap-space-sm">
            {profile.organizations.map((org) => (
              <li key={org.login}>
                <a
                  href={`https://github.com/${org.login}`}
                  target="_blank"
                  rel="noreferrer"
                  title={org.name ?? org.login}
                  className="block rounded-lg border border-border transition-colors hover:border-primary/50"
                >
                  <img
                    src={org.avatarUrl}
                    alt={org.name ?? org.login}
                    width={32}
                    height={32}
                    loading="lazy"
                    className="size-8 rounded-lg bg-surface-container"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 font-label-sm text-label-sm text-primary">
      {children}
    </span>
  )
}

function Detail({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>
  children: ReactNode
}) {
  return (
    <li className="flex min-w-0 items-center gap-space-sm">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 break-words">{children}</span>
    </li>
  )
}
