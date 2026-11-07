/** Clean axis ticks from 0 up to at least `max`: steps of 1, 2, 2.5 or 5 × 10ⁿ. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * mag >= raw) ?? 10) * mag
  const ticks: number[] = []
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(v)
  return ticks
}

/** Ticks for a range that crosses zero, with zero always on a tick. */
export function niceTicksSigned(min: number, max: number, count = 4): number[] {
  const span = Math.max(max, 0) - Math.min(min, 0)
  if (span <= 0) return [0]
  const up = niceTicks(span, count)
  const step = up[1] ?? span
  const ticks: number[] = []
  for (let v = Math.floor(Math.min(min, 0) / step) * step; v < Math.max(max, 0) + step * 0.999; v += step) ticks.push(Math.round(v))
  return ticks
}

/**
 * A bar from the baseline `y0` to its value `y1`, with the data end rounded and the baseline end square.
 * Works upward (y1 < y0) and downward (y1 > y0).
 */
export function barPath(x: number, width: number, y0: number, y1: number, radius = 4): string {
  const h = Math.abs(y1 - y0)
  if (h < 0.5) return ''
  const r = Math.min(radius, width / 2, h)
  const up = y1 < y0
  const s = up ? 1 : -1
  return [
    `M${x},${y0}`,
    `V${y1 + s * r}`,
    `Q${x},${y1} ${x + r},${y1}`,
    `H${x + width - r}`,
    `Q${x + width},${y1} ${x + width},${y1 + s * r}`,
    `V${y0}`,
    'Z',
  ].join(' ')
}

/** "2026-03" → "Mar", or "Mar 2026" with the year. */
export function monthShort(month: string, withYear = false) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, withYear ? { month: 'short', year: 'numeric' } : { month: 'short' })
}

export function monthLong(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long' })
}
