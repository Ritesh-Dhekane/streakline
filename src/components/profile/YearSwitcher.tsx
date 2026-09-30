import { useSearchParams } from 'react-router'

// Years with contributions, newest first. The newest year drops `?year=` for a clean URL.
export function YearSwitcher({ years, selected }: { years: number[]; selected: number }) {
  const [params, setParams] = useSearchParams()
  if (years.length < 2) return null

  function select(year: number) {
    const next = new URLSearchParams(params)
    if (year === years[0]) next.delete('year')
    else next.set('year', String(year))
    setParams(next, { preventScrollReset: true })
  }

  return (
    <nav aria-label="Year" className="-mx-1 max-w-full overflow-x-auto px-1 sm:max-w-[50%]">
      <ul className="flex w-max gap-0.5 rounded-lg border border-border bg-surface-container-lowest/60 p-1">
        {years.map((year) => (
          <li key={year}>
            <button
              type="button"
              onClick={() => select(year)}
              aria-current={year === selected ? 'true' : undefined}
              className={`rounded-md px-2.5 py-1 font-label-md text-label-md transition-colors ${
                year === selected
                  ? 'bg-primary/15 text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {year}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
