// The Streakline mark: a tiny contribution grid.
export function LogoMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
      <rect x="0" y="0" width="8" height="8" rx="2" fill="#10b981" />
      <rect x="10" y="0" width="8" height="8" rx="2" fill="#34d399" />
      <rect x="0" y="10" width="8" height="8" rx="2" fill="#059669" />
      <rect x="10" y="10" width="8" height="8" rx="2" fill="#06b6d4" />
    </svg>
  )
}
