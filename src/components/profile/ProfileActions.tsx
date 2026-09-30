import { ArrowRight, Download, GitCompareArrows, LoaderCircle, Code2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { downloadSvgAsPng } from '../../lib/download'
import { cardUrl } from '../../lib/links'
import { parseUsernameInput } from '../../lib/username'
import { BadgeDialog } from './BadgeDialog'

// Secondary actions under the profile card: README badge, PNG download, compare.
export function ProfileActions({ login }: { login: string }) {
  const navigate = useNavigate()
  const inputId = useId()
  const [badgeOpen, setBadgeOpen] = useState(false)
  const [downloading, setDownloading] = useState<'idle' | 'busy' | 'failed'>('idle')
  const [comparing, setComparing] = useState(false)
  const [other, setOther] = useState('')
  const [invalid, setInvalid] = useState(false)
  const card = cardUrl(login, 'dark')

  async function download() {
    if (!card) return
    setDownloading('busy')
    try {
      await downloadSvgAsPng(card, `streakline-${login}.png`)
      setDownloading('idle')
    } catch {
      setDownloading('failed')
    }
  }

  function compare(event: FormEvent) {
    event.preventDefault()
    const target = parseUsernameInput(other)
    if (!target || target.toLowerCase() === login.toLowerCase()) {
      setInvalid(true)
      return
    }
    navigate(`/${login}/vs/${target}`)
  }

  const action =
    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-on-surface/5 hover:text-on-surface disabled:opacity-50'

  return (
    <div className="mt-space-sm">
      <div className="flex gap-1">
        {card && (
          <button type="button" className={action} onClick={() => setBadgeOpen(true)}>
            <Code2 className="size-3.5" aria-hidden="true" /> Badge
          </button>
        )}
        {card && (
          <button
            type="button"
            className={action}
            onClick={download}
            disabled={downloading === 'busy'}
            title="Download the profile card as a PNG"
          >
            {downloading === 'busy' ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-3.5" aria-hidden="true" />
            )}
            {downloading === 'failed' ? 'Retry' : 'PNG'}
          </button>
        )}
        <button
          type="button"
          className={action}
          onClick={() => setComparing((value) => !value)}
          aria-expanded={comparing}
        >
          <GitCompareArrows className="size-3.5" aria-hidden="true" /> Compare
        </button>
      </div>

      {comparing && (
        <form onSubmit={compare} className="mt-space-sm">
          <label htmlFor={inputId} className="sr-only">
            Compare with
          </label>
          <div
            className={`flex items-center gap-space-sm rounded-lg border bg-surface-container-lowest/60 py-1 pr-1 pl-3 ${
              invalid ? 'border-error' : 'border-border focus-within:border-primary'
            }`}
          >
            <input
              id={inputId}
              autoFocus
              value={other}
              onChange={(e) => {
                setOther(e.target.value)
                setInvalid(false)
              }}
              placeholder="Compare with…"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              aria-invalid={invalid}
              className="min-w-0 flex-1 bg-transparent font-label-md text-label-md outline-none placeholder:text-on-surface-variant/70"
            />
            <button
              type="submit"
              className="grid size-7 place-items-center rounded-md bg-primary-container text-[#0b0f17]"
              aria-label="Compare"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          {invalid && (
            <p role="alert" className="mt-1 font-body-sm text-body-sm text-error">
              Enter another GitHub username.
            </p>
          )}
        </form>
      )}

      <BadgeDialog login={login} open={badgeOpen} onClose={() => setBadgeOpen(false)} />
    </div>
  )
}
