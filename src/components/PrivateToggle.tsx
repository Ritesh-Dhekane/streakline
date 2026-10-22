import { useId } from 'react'

// "Include private contributions": a labelled switch, disabled (with a hint) when nobody shown
// shares any.
export function PrivateToggle({
  checked,
  onChange,
  disabled = false,
  hint = 'Private contributions aren’t shared on this GitHub profile.',
  className = '',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  hint?: string // why it's disabled
  className?: string
}) {
  const hintId = useId()
  return (
    <div className={className}>
      <label
        className={`inline-flex items-center gap-space-sm font-label-sm text-label-sm ${
          disabled ? 'cursor-not-allowed text-on-surface-variant' : 'cursor-pointer text-on-surface'
        }`}
      >
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          aria-describedby={disabled ? hintId : undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-surface-container-highest transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:opacity-50 peer-checked:[&>span]:translate-x-4 peer-checked:[&>span]:bg-on-primary"
        >
          <span className="ml-0.5 size-3.5 rounded-full bg-on-surface-variant transition-transform" />
        </span>
        Include private contributions
      </label>
      {disabled && (
        <p id={hintId} className="mt-1 font-label-sm text-label-sm text-on-surface-variant">
          {hint}
        </p>
      )}
    </div>
  )
}
