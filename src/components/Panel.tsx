import type { ReactNode } from 'react'

// Level-1 surface from DESIGN.md: dark fill, translucent border, 12px corners.
export function Panel({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'aside' | 'article'
  'aria-labelledby'?: string
  'aria-label'?: string
}) {
  return (
    <Tag
      className={`rounded-md border border-border bg-surface-container-low ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p
      id={id}
      className="flex items-center gap-1.5 font-label-sm text-label-sm tracking-widest text-primary uppercase"
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      {children}
    </p>
  )
}
