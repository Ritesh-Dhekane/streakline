import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'

import { DAILY_LOOKUPS } from '../../shared/limits'
import { Eyebrow, Panel } from '../components/Panel'

const LAST_UPDATED = '2026-10-22'
const PORTFOLIO_URL = 'https://ritesh-dhekane.github.io/'
const GITHUB_SETTINGS_URL = 'https://github.com/settings/profile'

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy · Streakline'
    return () => {
      document.title = 'Streakline'
    }
  }, [])

  return (
    <div className="mx-auto max-w-[760px] px-margin-mobile py-space-lg md:px-margin md:py-space-xl">
      <Eyebrow>Privacy</Eyebrow>
      <h1 className="mt-1 font-headline-md text-headline-md">What Streakline knows about you</h1>
      <p className="mt-space-sm font-label-sm text-label-sm text-on-surface-variant">
        Last updated <time dateTime={LAST_UPDATED}>22 October 2026</time>
      </p>

      <Panel as="div" className="mt-space-lg space-y-space-lg p-space-lg">
        <Section title="No sign-in, no account access">
          <p>
            There’s nothing to sign in to, and Streakline never asks for access to your GitHub
            account. It can’t see or change anything you haven’t made public.
          </p>
        </Section>

        <Section title="Where the numbers come from">
          <p>
            Streakline doesn’t access your data directly. Everything on a profile page comes from
            GitHub’s public API, read through our server (a Cloudflare Worker) and shaped into the
            charts you see. Avatars load straight from GitHub.
          </p>
        </Section>

        <Section title="Private contributions">
          <p>
            GitHub has a setting, “Include private contributions on my profile”. Only if a person
            turns it on does GitHub share how many private contributions they made, and Streakline
            shows that <strong>count</strong>. It never sees or shows private repository names, code
            or any details of that activity.
          </p>
          <p>
            GitHub folds these into the daily counts without saying which days were private, so the
            heatmap and streaks include them. You can switch the totals to public contributions only
            with the “Include private contributions” toggle.
          </p>
          <p>
            To hide your private count everywhere, turn that setting off in your{' '}
            <A href={GITHUB_SETTINGS_URL}>GitHub profile settings</A>. Streakline follows it once
            its short-lived copy expires (see below).
          </p>
        </Section>

        <Section title="What our server keeps, and for how long">
          <ul className="list-disc space-y-space-xs pl-5">
            <li>
              <strong>Profile results</strong> are cached by Cloudflare for up to 6 hours, so a
              popular profile doesn’t ask GitHub again on every visit. A “user not found” answer is
              cached for 10 minutes. Your browser may reuse a result for 5 minutes.
            </li>
            <li>
              <strong>README cards</strong> are cached the same way, for up to 6 hours, and
              share-link preview pages for up to an hour.
            </li>
            <li>
              <strong>The lookup limit</strong> (new profiles per visitor per day, {DAILY_LOOKUPS}{' '}
              at the moment) needs to tell visitors apart. For each new profile you open, the server
              stores a salted hash of your IP address (never the address itself), the GitHub
              username you looked up and the time. These rows are deleted after 24 hours.
            </li>
            <li>
              <strong>Cards and share links</strong> are rate limited per IP address by Cloudflare;
              Streakline doesn’t store anything for those.
            </li>
          </ul>
        </Section>

        <Section title="What stays in your browser">
          <p>These live in your browser’s local storage only and never reach our server:</p>
          <ul className="list-disc space-y-space-xs pl-5">
            <li>profiles you viewed recently (up to six: username, name and avatar link)</li>
            <li>your light or dark theme</li>
            <li>your last choice for “Include private contributions”</li>
            <li>the day you last saw the “few lookups left” notice</li>
          </ul>
          <p>Clearing this site’s data in your browser removes them.</p>
        </Section>

        <Section title="Analytics">
          <p>
            The site uses Cloudflare Web Analytics to count page views. It sets no cookies and
            doesn’t collect personal data. There are no ads and no other trackers.
          </p>
        </Section>

        <Section title="Link previews">
          <p>
            When a profile link is shared on social sites, its preview image is converted to PNG by
            wsrv.nl, an image service, which fetches the public card for that profile.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests? Reach Ritesh Dhekane through{' '}
            <A href={PORTFOLIO_URL}>his portfolio</A>.
          </p>
        </Section>
      </Panel>

      <Link
        to="/"
        className="mt-space-lg inline-block rounded-lg py-1.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
      >
        ← Back to search
      </Link>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-headline-sm text-headline-sm">{title}</h2>
      <div className="mt-space-sm space-y-space-sm font-body-md text-body-md text-on-surface-variant">
        {children}
      </div>
    </section>
  )
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-secondary underline underline-offset-2">
      {children}
    </a>
  )
}
