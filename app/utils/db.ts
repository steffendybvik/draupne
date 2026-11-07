import Dexie, { type EntityTable } from 'dexie'

export type Kind = 'expense' | 'income'

export interface Category {
  id: number
  name: string
  emoji: string
  kind: Kind
  /** Monthly budget in minor units (øre, cents). Expense categories only. */
  budget: number | null
  position: number
}

export interface Transaction {
  id: number
  kind: Kind
  /** Always positive, in minor units. `kind` gives the sign. */
  amount: number
  categoryId: number
  /** Local date as `YYYY-MM-DD`, so months group without time-zone surprises. */
  date: string
  note: string
  createdAt: number
}

export const db = new Dexie('draupne') as Dexie & {
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
}

db.version(1).stores({
  categories: '++id, kind, position',
  transactions: '++id, date, categoryId, kind',
})

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'position'>[] = [
  { name: 'Housing', emoji: '🏠', kind: 'expense', budget: null },
  { name: 'Groceries', emoji: '🛒', kind: 'expense', budget: null },
  { name: 'Eating out', emoji: '🍽️', kind: 'expense', budget: null },
  { name: 'Transport', emoji: '🚆', kind: 'expense', budget: null },
  { name: 'Bills', emoji: '🧾', kind: 'expense', budget: null },
  { name: 'Subscriptions', emoji: '🔁', kind: 'expense', budget: null },
  { name: 'Shopping', emoji: '🛍️', kind: 'expense', budget: null },
  { name: 'Gifts', emoji: '🎁', kind: 'expense', budget: null },
  { name: 'Electronics', emoji: '💻', kind: 'expense', budget: null },
  { name: 'Hardware', emoji: '🛠️', kind: 'expense', budget: null },
  { name: 'Furniture', emoji: '🛋️', kind: 'expense', budget: null },
  { name: 'Health', emoji: '💊', kind: 'expense', budget: null },
  { name: 'Fun', emoji: '🎉', kind: 'expense', budget: null },
  { name: 'Travel', emoji: '✈️', kind: 'expense', budget: null },
  { name: 'Work', emoji: '💼', kind: 'expense', budget: null },
  { name: 'Other', emoji: '📦', kind: 'expense', budget: null },
  { name: 'Salary', emoji: '💶', kind: 'income', budget: null },
  { name: 'Other income', emoji: '💰', kind: 'income', budget: null },
]

// v2 adds Gifts, Electronics, Hardware, Furniture and Work to databases made before they existed.
db.version(2).stores({}).upgrade(async (tx) => {
  const table = tx.table<Category, number>('categories')
  const existing = await table.toArray()
  const names = new Set(existing.map((c) => c.name.toLowerCase()))
  let position = Math.max(-1, ...existing.map((c) => c.position)) + 1
  const missing = DEFAULT_CATEGORIES.filter((c) => c.kind === 'expense' && !names.has(c.name.toLowerCase()))
  await table.bulkAdd(missing.map((c) => ({ ...c, position: position++ })) as Category[])
})

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(DEFAULT_CATEGORIES.map((c, position) => ({ ...c, position })))
})

/** First and last day of a `YYYY-MM` month, for range queries on `date`. */
export function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${month}-31`]
}

export function transactionsIn(month: string) {
  const [from, to] = monthRange(month)
  return db.transactions.where('date').between(from, to, true, true).toArray()
}

export interface Backup {
  app: 'draupne'
  version: 1
  exportedAt: string
  categories: Category[]
  transactions: Transaction[]
}

export async function exportBackup(): Promise<Backup> {
  const [categories, transactions] = await Promise.all([db.categories.toArray(), db.transactions.toArray()])
  return { app: 'draupne', version: 1, exportedAt: new Date().toISOString(), categories, transactions }
}

/** Replaces everything with the backup's contents. */
export async function importBackup(data: unknown) {
  const b = data as Partial<Backup>
  if (b?.app !== 'draupne' || !Array.isArray(b.categories) || !Array.isArray(b.transactions)) {
    throw new Error('That file is not a Draupne backup.')
  }
  await db.transaction('rw', db.categories, db.transactions, async () => {
    await db.categories.clear()
    await db.transactions.clear()
    await db.categories.bulkAdd(b.categories!)
    await db.transactions.bulkAdd(b.transactions!)
  })
}
