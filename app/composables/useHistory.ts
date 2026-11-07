import type { Category, Transaction } from '~/utils/db'

export interface BreakdownRow {
  category: Category
  spent: number
  previous: number
}

export interface MonthTotals {
  month: string
  income: number
  spent: number
  net: number
  count: number
}

export interface YearTotals {
  year: number
  income: number
  spent: number
  net: number
  /** Months in the year that have any transactions. */
  months: number
  /** Average net per complete month (the running month is left out). */
  avgNet: number
}

export function daysIn(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(y, m, 0).getDate()
}

/** All transactions, aggregated for trends: per month, per year, per day within a month. */
export function useHistory() {
  const all = useLiveQuery(null, () => db.transactions.toArray(), [] as Transaction[])

  const byMonth = computed(() => {
    const map = new Map<string, MonthTotals>()
    for (const t of all.value) {
      // Transfers move money between your own accounts: neither income nor spending.
      if (t.kind === 'transfer') continue
      const month = t.date.slice(0, 7)
      let row = map.get(month)
      if (!row) map.set(month, (row = { month, income: 0, spent: 0, net: 0, count: 0 }))
      if (t.kind === 'income') row.income += t.amount
      else row.spent += t.amount
      row.net = row.income - row.spent
      row.count++
    }
    return map
  })

  /** The `n` months ending with `end`, oldest first; empty months are zero. */
  function lastMonths(end: string, n: number): MonthTotals[] {
    return Array.from({ length: n }, (_, i) => {
      const month = shiftMonth(end, i - n + 1)
      return byMonth.value.get(month) ?? { month, income: 0, spent: 0, net: 0, count: 0 }
    })
  }

  /** Spending summed day by day through a month: index 0 is the 1st. */
  function cumulativeSpent(month: string): number[] {
    const days = Array<number>(daysIn(month)).fill(0)
    for (const t of all.value) {
      if (t.kind !== 'expense' || !t.date.startsWith(month)) continue
      days[Number(t.date.slice(8, 10)) - 1]! += t.amount
    }
    let run = 0
    return days.map((d) => (run += d))
  }

  /** Expense totals per category for a month. */
  function spentByCategory(month: string): Map<number, number> {
    const map = new Map<number, number>()
    for (const t of all.value) {
      if (t.kind === 'expense' && t.date.startsWith(month)) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    return map
  }

  const years = computed<YearTotals[]>(() => {
    const map = new Map<number, YearTotals>()
    const complete = new Map<number, { net: number, months: number }>()
    const thisMonth = todayISO().slice(0, 7)
    for (const m of byMonth.value.values()) {
      if (m.month < thisMonth) {
        const c = complete.get(Number(m.month.slice(0, 4))) ?? { net: 0, months: 0 }
        c.net += m.net
        c.months++
        complete.set(Number(m.month.slice(0, 4)), c)
      }
      const year = Number(m.month.slice(0, 4))
      let row = map.get(year)
      if (!row) map.set(year, (row = { year, income: 0, spent: 0, net: 0, months: 0, avgNet: 0 }))
      row.income += m.income
      row.spent += m.spent
      row.net += m.net
      row.months++
    }
    for (const row of map.values()) {
      const c = complete.get(row.year)
      row.avgNet = c?.months ? Math.round(c.net / c.months) : 0
    }
    return [...map.values()].sort((a, b) => b.year - a.year)
  })

  return { all, byMonth, lastMonths, cumulativeSpent, spentByCategory, years }
}
