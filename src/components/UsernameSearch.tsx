import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { parseUsernameInput } from '../lib/username'

function useSearch(onDone?: () => void) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const login = parseUsernameInput(value)
    if (!login) {
      setInvalid(true)
      return
    }
    setValue('')
    setInvalid(false)
    onDone?.()
    navigate(`/${login}`)
  }

  function change(next: string) {
    setValue(next)
    setInvalid(false)
  }

  return { value, invalid, submit, change }
}

const inputProps = {
  spellCheck: false,
  autoCapitalize: 'none',
  autoComplete: 'off',
  enterKeyHint: 'go',
} as const

// Compact username box for the header; the landing page has its own large version.
export function UsernameSearch() {
  const { value, invalid, submit, change } = useSearch()

  return (
    <form onSubmit={submit} role="search" className="hidden sm:block">
      <label
        className={`flex w-64 items-center gap-space-sm rounded-lg border bg-surface-container-low/80 px-3 py-1.5 transition-colors ${
          invalid ? 'border-error' : 'border-outline-variant/40 focus-within:border-primary'
        }`}
      >
        <Search className="size-4 text-on-surface-variant" aria-hidden="true" />
        <span className="sr-only">GitHub username</span>
        <input
          value={value}
          onChange={(e) => change(e.target.value)}
          placeholder="Search a username…"
          aria-invalid={invalid}
          className="w-full bg-transparent font-label-md text-label-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
          {...inputProps}
        />
      </label>
    </form>
  )
}

// Phones: a search button that opens a full-width bar under the header.
export function MobileUsernameSearch() {
  const [open, setOpen] = useState(false)
  const { value, invalid, submit, change } = useSearch(() => setOpen(false))
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <div className="sm:hidden">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close search' : 'Search a username'}
        className="grid size-9 place-items-center rounded-full border border-outline-variant/40 bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
      >
        {open ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <Search className="size-4" aria-hidden="true" />
        )}
      </button>
      {open && (
        <form
          id={panelId}
          onSubmit={submit}
          role="search"
          onKeyDown={(e) => e.key === 'Escape' && close()}
          className="absolute inset-x-0 top-full border-b border-outline-variant/30 bg-surface/95 px-margin-mobile py-space-sm backdrop-blur-xl"
        >
          <label
            className={`flex items-center gap-space-sm rounded-lg border bg-surface-container-low px-3 py-2 transition-colors ${
              invalid ? 'border-error' : 'border-outline-variant/40 focus-within:border-primary'
            }`}
          >
            <Search className="size-4 text-on-surface-variant" aria-hidden="true" />
            <span className="sr-only">GitHub username</span>
            <input
              ref={input}
              value={value}
              onChange={(e) => change(e.target.value)}
              placeholder="GitHub username"
              aria-invalid={invalid}
              className="w-full bg-transparent font-label-lg text-label-lg text-on-surface outline-none placeholder:text-on-surface-variant/70"
              {...inputProps}
            />
            <button
              type="submit"
              className="rounded-md bg-primary-container px-2.5 py-1 font-label-md text-label-md font-semibold text-[#0b0f17]"
            >
              Go
            </button>
          </label>
          {invalid && (
            <p role="alert" className="mt-1 font-body-sm text-body-sm text-error">
              That doesn’t look like a GitHub username.
            </p>
          )}
        </form>
      )}
    </div>
  )
}
