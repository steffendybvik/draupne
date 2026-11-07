import type { Category, Transaction } from '~/utils/db'

export interface CategoryTotal {
  category: Category
  spent: number
  count: number
}

/** Everything the month and budget views need, kept live from IndexedDB. */
export function useMonthData() {
  const { month } = useMonth()

  const categories = useLiveQuery(null, () => db.categories.orderBy('position').toArray(), [] as Category[])
  const transactions = useLiveQuery<Transaction[], string>(month, (m) => transactionsIn(m), [] as Transaction[])

  const categoryById = computed(() => new Map(categories.value.map((c) => [c.id, c])))

  const income = computed(() => sum(transactions.value.filter((t) => t.kind === 'income')))
  const spent = computed(() => sum(transactions.value.filter((t) => t.kind === 'expense')))
  /** Moved into savings and investment accounts this month. */
  const { putAside: putAsideIn, accountById } = useAccounts()
  const putAside = computed(() => putAsideIn(month.value))
  /** What's left after spending and putting money aside. */
  const left = computed(() => income.value - spent.value - putAside.value.total)
  /** Income minus spending: the month's profit or loss. */
  const net = computed(() => income.value - spent.value)

  /** Expense categories with what was spent this month, largest first; unused ones last. */
  const byCategory = computed<CategoryTotal[]>(() => {
    const totals = new Map<number, { spent: number, count: number }>()
    for (const t of transactions.value) {
      if (t.kind !== 'expense') continue
      const row = totals.get(t.categoryId) ?? { spent: 0, count: 0 }
      row.spent += t.amount
      row.count++
      totals.set(t.categoryId, row)
    }
    return categories.value
      .filter((c) => c.kind === 'expense')
      .map((category) => ({ category, ...(totals.get(category.id) ?? { spent: 0, count: 0 }) }))
      .sort((a, b) => b.spent - a.spent || a.category.position - b.category.position)
  })

  /** Newest first, grouped by day. */
  const days = computed(() => {
    const sorted = [...transactions.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    const groups: { date: string, items: Transaction[], net: number }[] = []
    for (const t of sorted) {
      let g = groups.at(-1)
      if (!g || g.date !== t.date) groups.push((g = { date: t.date, items: [], net: 0 }))
      g.items.push(t)
      if (t.kind !== 'transfer') g.net += t.kind === 'income' ? t.amount : -t.amount
    }
    return groups
  })

  return { month, categories, categoryById, accountById, transactions, income, spent, putAside, left, net, byCategory, days }
}

function sum(list: Transaction[]) {
  return list.reduce((total, t) => total + t.amount, 0)
}
