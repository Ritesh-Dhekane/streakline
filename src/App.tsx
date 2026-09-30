const HEAT_LEVELS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']

export default function App() {
  return (
    <main className="min-h-screen grid place-items-center p-margin-mobile md:p-margin">
      <section className="w-full max-w-xl rounded-md border border-border bg-surface-container-low p-space-lg shadow-glow">
        <p className="font-label-sm text-label-sm uppercase text-primary">● Coming soon</p>
        <h1 className="mt-space-sm font-headline-xl text-headline-xl-mobile md:text-headline-xl">
          Streakline
        </h1>
        <p className="mt-space-sm font-body-lg text-body-lg text-on-surface-variant">
          An elegant view of anyone's public GitHub activity.
        </p>
        <div className="mt-space-lg flex gap-[3px]" aria-hidden="true">
          {HEAT_LEVELS.map((level) => (
            <span key={level} className={`size-[10px] rounded-[2px] ${level}`} />
          ))}
        </div>
      </section>
    </main>
  )
}
