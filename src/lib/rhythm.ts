import type { ActivityEvent } from '../../shared/types'

// Weighted activity per local hour (0–23) in the given IANA time zone.
export function hourlyRhythm(events: ActivityEvent[], timeZone: string): number[] {
  const format = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone })
  const hours = Array.from({ length: 24 }, () => 0)
  for (const event of events) {
    const hour = Number(format.format(new Date(event.at))) % 24
    hours[hour] = (hours[hour] ?? 0) + event.weight
  }
  return hours
}

// Start hour of the busiest `span`-hour window (wrapping past midnight); null when empty.
export function peakWindow(hours: number[], span = 3): number | null {
  let best: number | null = null
  let bestSum = 0
  for (let start = 0; start < 24; start++) {
    let sum = 0
    for (let i = 0; i < span; i++) sum += hours[(start + i) % 24] ?? 0
    if (sum > bestSum) {
      best = start
      bestSum = sum
    }
  }
  return best
}

export function hourLabel(hour: number): string {
  return `${String(((hour % 24) + 24) % 24).padStart(2, '0')}:00`
}

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Smooth SVG path through points (Catmull-Rom → cubic Bézier), clamped to the chart area.
export function smoothPath(points: [number, number][], maxY: number): string {
  if (points.length === 0) return ''
  const clamp = (y: number) => Math.min(maxY, Math.max(0, y))
  let d = `M${points[0]![0]},${points[0]![1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)]
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}
