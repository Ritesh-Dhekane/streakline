// Decorative contribution-grid backdrop for the landing hero. Seeded, so it looks
// the same on every load; the pulse respects reduced-motion settings.

const COLUMNS = 28
const ROWS = 9
const CELL_CLASSES = [
  'bg-heat-0',
  'bg-heat-0',
  'bg-heat-0',
  'bg-heat-1',
  'bg-heat-2',
  'bg-heat-3',
  'bg-heat-4',
  'bg-secondary/30',
]

function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

const random = seeded(42)
const CELLS = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({
  id: i,
  className: CELL_CLASSES[Math.floor(random() * CELL_CLASSES.length)] ?? 'bg-heat-0',
  pulse: random() < 0.08,
  delay: Math.floor(random() * 3000),
}))

export function GridMotif() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden opacity-25 dark:opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]"
    >
      <div
        className="grid -rotate-12 scale-125 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
      >
        {CELLS.map((cell) => (
          <span
            key={cell.id}
            className={`size-3.5 rounded-[3px] ${cell.className} ${cell.pulse ? 'motion-safe:animate-pulse' : ''}`}
            style={cell.pulse ? { animationDelay: `${cell.delay}ms` } : undefined}
          />
        ))}
      </div>
    </div>
  )
}
