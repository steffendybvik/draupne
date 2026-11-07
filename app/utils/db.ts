import Dexie, { type EntityTable } from 'dexie'

/** What a category is for. */
export type CategoryKind = 'expense' | 'income'
/** A transaction: money out, money in, or moved between two of your own accounts. */
export type Kind = CategoryKind | 'transfer'

export type AccountType = 'spending' | 'savings' | 'investment' | 'cash' | 'credit'

export interface Account {
  id: number
  name: string
  emoji: string
  type: AccountType
  /** Balance before the first transaction in Draupne, in minor units. */
  opening: number
  position: number
}

/** What an investment account was worth on a day, entered by hand. */
export interface Valuation {
  id: number
  accountId: number
  date: string
  value: number
}

export interface Category {
  id: number
  name: string
  emoji: string
  kind: CategoryKind
  /** Monthly budget in minor units (øre, cents). Expense categories only. */
  budget: number | null
  position: number
}

export interface Transaction {
  id: number
  kind: Kind
  /** Always positive, in minor units. `kind` gives the sign. */
  amount: number
  /** 0 for transfers, which have no category. */
  categoryId: number
  /** The account the money leaves (expense, transfer) or arrives in (income). */
  accountId: number
  /** Transfers only: the account the money arrives in. */
  toAccountId?: number | null
  /** Local date as `YYYY-MM-DD`, so months group without time-zone surprises. */
  date: string
  note: string
  createdAt: number
}

export const db = new Dexie('draupne') as Dexie & {
  categories: EntityTable<Category, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  accounts: EntityTable<Account, 'id'>
  valuations: EntityTable<Valuation, 'id'>
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

export const DEFAULT_ACCOUNTS: Omit<Account, 'id'>[] = [
  { name: 'Spending account', emoji: '💳', type: 'spending', opening: 0, position: 0 },
  { name: 'Savings', emoji: '🏦', type: 'savings', opening: 0, position: 1 },
  { name: 'Investments', emoji: '📈', type: 'investment', opening: 0, position: 2 },
]

// v3 adds accounts: everything so far happened on the spending account.
db.version(3).stores({
  accounts: '++id, type, position',
  valuations: '++id, accountId, date',
  transactions: '++id, date, categoryId, kind, accountId',
}).upgrade(async (tx) => {
  const ids = await tx.table('accounts').bulkAdd(DEFAULT_ACCOUNTS, { allKeys: true }) as number[]
  await tx.table('transactions').toCollection().modify({ accountId: ids[0] })
})

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(DEFAULT_CATEGORIES.map((c, position) => ({ ...c, position })))
  tx.table('accounts').bulkAdd(DEFAULT_ACCOUNTS)
})

/** The account new expenses and income go to unless another is picked. */
export async function defaultAccountId(): Promise<number> {
  const all = await db.accounts.orderBy('position').toArray()
  return (all.find((a) => a.type === 'spending') ?? all[0])?.id ?? 0
}

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
  version: 1 | 2
  exportedAt: string
  categories: Category[]
  transactions: Transaction[]
  /** Since version 2. */
  accounts?: Account[]
  valuations?: Valuation[]
}

export async function exportBackup(): Promise<Backup> {
  const [categories, transactions, accounts, valuations] = await Promise.all([
    db.categories.toArray(), db.transactions.toArray(), db.accounts.toArray(), db.valuations.toArray(),
  ])
  return { app: 'draupne', version: 2, exportedAt: new Date().toISOString(), categories, transactions, accounts, valuations }
}

/** Replaces everything with the backup's contents. Version 1 backups land on the default accounts. */
export async function importBackup(data: unknown) {
  const b = data as Partial<Backup>
  if (b?.app !== 'draupne' || !Array.isArray(b.categories) || !Array.isArray(b.transactions)) {
    throw new Error('That file is not a Draupne backup.')
  }
  await db.transaction('rw', [db.categories, db.transactions, db.accounts, db.valuations], async () => {
    await Promise.all([db.categories.clear(), db.transactions.clear(), db.accounts.clear(), db.valuations.clear()])
    await db.categories.bulkAdd(b.categories!)
    if (b.accounts?.length) {
      await db.accounts.bulkAdd(b.accounts)
      await db.valuations.bulkAdd(b.valuations ?? [])
      await db.transactions.bulkAdd(b.transactions!)
    } else {
      const ids = await db.accounts.bulkAdd(DEFAULT_ACCOUNTS as Account[], { allKeys: true })
      await db.transactions.bulkAdd(b.transactions!.map((t) => ({ ...t, accountId: t.accountId ?? ids[0]! })))
    }
  })
}
