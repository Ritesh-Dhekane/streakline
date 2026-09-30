import { X } from 'lucide-react'
import { Link } from 'react-router'

import { clearRecent, useRecentProfiles } from '../lib/recent'

// Landing page: profiles this browser opened before (free to open again).
export function RecentlyViewed() {
  const recent = useRecentProfiles()
  if (recent.length === 0) return null

  return (
    <div className="mt-space-sm flex max-w-full items-center gap-space-sm overflow-x-auto pb-1">
      <span className="shrink-0 font-label-md text-label-md text-on-surface-variant">Recent:</span>
      {recent.map((profile) => (
        <Link
          key={profile.login}
          to={`/${profile.login}`}
          title={profile.name ?? profile.login}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-container py-0.5 pr-3 pl-0.5 font-label-md text-label-md text-on-surface-variant transition-colors hover:border-primary/50 hover:text-on-surface"
        >
          <img
            src={profile.avatarUrl}
            alt=""
            width={24}
            height={24}
            loading="lazy"
            className="size-6 rounded-full"
          />
          @{profile.login}
        </Link>
      ))}
      <button
        type="button"
        onClick={clearRecent}
        className="grid size-7 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface"
        aria-label="Clear recently viewed"
        title="Clear"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
