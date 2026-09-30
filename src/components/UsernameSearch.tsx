import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { isValidUsername } from '../../shared/github/client'

// Compact username box for the header; the landing page has its own large version.
export function UsernameSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const login = value.trim().replace(/^@/, '')
    if (!isValidUsername(login)) {
      setInvalid(true)
      return
    }
    setValue('')
    setInvalid(false)
    navigate(`/${login}`)
  }

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
          onChange={(e) => {
            setValue(e.target.value)
            setInvalid(false)
          }}
          placeholder="Search a username…"
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          aria-invalid={invalid}
          className="w-full bg-transparent font-label-md text-label-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
        />
      </label>
    </form>
  )
}
