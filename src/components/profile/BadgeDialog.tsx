import { Check, Copy, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { badgeHtml, badgeMarkdown, cardUrl, type CardTheme } from '../../lib/links'

type Variant = CardTheme | 'auto'

const VARIANTS: { id: Variant; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'auto', label: 'Match GitHub theme' },
]

// "Add to your README": preview + a snippet to copy. Uses the native <dialog> for focus handling.
export function BadgeDialog({
  login,
  open,
  onClose,
}: {
  login: string
  open: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [variant, setVariant] = useState<Variant>('dark')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  const snippet = variant === 'auto' ? badgeHtml(login) : badgeMarkdown(login, variant)
  const preview = cardUrl(login, variant === 'light' ? 'light' : 'dark')

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked; the snippet is still selectable.
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-labelledby={titleId}
      className="m-auto w-[min(600px,calc(100vw-2rem))] rounded-md border border-on-surface/12 bg-surface-container-low p-0 text-on-surface shadow-popover backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-space-lg">
        <div className="flex items-start justify-between gap-space-md">
          <div>
            <h2 id={titleId} className="font-headline-sm text-headline-sm">
              Add to your README
            </h2>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              A live card that updates every few hours and links back to this page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded p-1 text-on-surface-variant hover:text-on-surface"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div
          className="mt-space-md flex flex-wrap gap-1 rounded-lg border border-border bg-surface-container-lowest/60 p-1"
          role="radiogroup"
          aria-label="Card style"
        >
          {VARIANTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={variant === option.id}
              onClick={() => setVariant(option.id)}
              className={`rounded-md px-2.5 py-1 font-label-sm text-label-sm transition-colors ${
                variant === option.id
                  ? 'bg-primary/15 font-semibold text-on-surface dark:font-medium dark:text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {preview && (
          <div
            className={`mt-space-md grid place-items-center rounded-lg border border-border p-space-md ${
              variant === 'light' ? 'bg-white' : 'bg-[#0d1117]'
            }`}
          >
            <img
              src={preview}
              alt={`Preview of ${login}'s card`}
              width={520}
              height={200}
              className="h-auto w-full max-w-[520px]"
            />
          </div>
        )}

        <div className="relative mt-space-md">
          <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-surface-container-lowest p-space-md pr-12 font-label-sm text-label-sm break-all whitespace-pre-wrap text-on-surface-variant">
            {snippet}
          </pre>
          <button
            type="button"
            onClick={copy}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-border bg-surface-container px-2 py-1 font-label-sm text-label-sm transition-colors hover:bg-surface-container-high"
          >
            {copied ? (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
