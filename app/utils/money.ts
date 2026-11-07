/** Parses what someone types ("1 234,50", "1234.5", "99") into minor units, or null. */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[\s ']/g, '')
  if (!s) return null
  // The last , or . is the decimal separator when 1–2 digits follow it; any other is a thousands mark.
  const m = s.match(/^(.*)[.,](\d{1,2})$/)
  if (m) s = `${m[1]!.replace(/[.,]/g, '')}.${m[2]}`
  else s = s.replace(/[.,]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const value = Math.round(Number(s) * 100)
  return value > 0 ? value : null
}

/** Minor units back to an editable string, e.g. 123450 → "1234,50" in nb-NO. */
export function amountToInput(minor: number, locale?: string): string {
  const sep = (1.1).toLocaleString(locale).charAt(1)
  const whole = Math.floor(minor / 100)
  const cents = minor % 100
  return cents ? `${whole}${sep}${String(cents).padStart(2, '0')}` : String(whole)
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
