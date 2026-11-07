/**
 * Draupne's data, stored in SQLite (see `app/workers`). Everything the pages read or write goes
 * through the functions here, so SQL stays in one place.
 */

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
  /** Always positive, in minor units. `kind` gives the direction. */
  amount: number
  /** 0 for transfers, which have no category (NULL in the database). */
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

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

const TX = `SELECT id, kind, amount, COALESCE(category_id, 0) AS categoryId, account_id AS accountId,
  to_account_id AS toAccountId, date, note, created_at AS createdAt FROM transactions`
const CATEGORIES = 'SELECT id, name, emoji, kind, budget, position FROM categories'
const ACCOUNTS = 'SELECT id, name, emoji, type, opening, position FROM accounts'
const VALUATIONS = 'SELECT id, account_id AS accountId, date, value FROM valuations'

const txBind = (t: NewTransaction) => [
  t.kind, t.amount, t.kind === 'transfer' ? null : t.categoryId, t.accountId,
  t.kind === 'transfer' ? t.toAccountId ?? null : null, t.date, t.note,
]

// Categories

export const listCategories = () => dbQuery<Category>(`${CATEGORIES} ORDER BY position, id`)

export async function addCategory(c: Omit<Category, 'id' | 'position'>) {
  await dbRun(
    'INSERT INTO categories (name, emoji, kind, budget, position) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM categories))',
    [c.name, c.emoji, c.kind, c.budget],
  )
}

export const updateCategory = (id: number, c: Omit<Category, 'id' | 'position'>) =>
  dbRun('UPDATE categories SET name = ?, emoji = ?, kind = ?, budget = ? WHERE id = ?', [c.name, c.emoji, c.kind, c.budget, id])

export const deleteCategory = (id: number) => dbRun('DELETE FROM categories WHERE id = ?', [id])

/** Transactions per category, so a category in use isn't deleted. */
export async function categoryUsage() {
  const rows = await dbQuery<{ id: number, n: number }>('SELECT category_id AS id, COUNT(*) AS n FROM transactions WHERE category_id IS NOT NULL GROUP BY category_id')
  return new Map(rows.map((r) => [r.id, r.n]))
}

// Accounts and valuations

export const listAccounts = () => dbQuery<Account>(`${ACCOUNTS} ORDER BY position, id`)

export async function addAccount(a: Omit<Account, 'id' | 'position'>) {
  await dbRun(
    'INSERT INTO accounts (name, emoji, type, opening, position) VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM accounts))',
    [a.name, a.emoji, a.type, a.opening],
  )
}

export const updateAccount = (id: number, a: Omit<Account, 'id' | 'position'>) =>
  dbRun('UPDATE accounts SET name = ?, emoji = ?, type = ?, opening = ? WHERE id = ?', [a.name, a.emoji, a.type, a.opening, id])

/** Its valuations go with it (ON DELETE CASCADE); one with transactions is refused by the foreign keys. */
export const deleteAccount = (id: number) => dbRun('DELETE FROM accounts WHERE id = ?', [id])

export async function accountUsage() {
  const rows = await dbQuery<{ id: number, n: number }>(`
    SELECT id, COUNT(*) AS n FROM (
      SELECT account_id AS id FROM transactions
      UNION ALL SELECT to_account_id FROM transactions WHERE to_account_id IS NOT NULL
    ) GROUP BY id`)
  return new Map(rows.map((r) => [r.id, r.n]))
}

/** The account new expenses and income go to unless another is picked. */
export async function defaultAccountId(): Promise<number> {
  const row = await dbFirst<{ id: number }>("SELECT id FROM accounts ORDER BY type <> 'spending', position, id LIMIT 1")
  return row?.id ?? 0
}

export async function firstAccountOfType(type: AccountType): Promise<number | null> {
  return (await dbFirst<{ id: number }>('SELECT id FROM accounts WHERE type = ? ORDER BY position, id LIMIT 1', [type]))?.id ?? null
}

export const listValuations = () => dbQuery<Valuation>(`${VALUATIONS} ORDER BY date, id`)

/** One value per account per day: a second one the same day replaces the first. */
export const setValuation = (accountId: number, date: string, value: number) =>
  dbRun('INSERT INTO valuations (account_id, date, value) VALUES (?, ?, ?) ON CONFLICT (account_id, date) DO UPDATE SET value = excluded.value', [accountId, date, value])

// Transactions

export const listTransactions = () => dbQuery<Transaction>(TX)

/** A `YYYY-MM` month's transactions: dates compare as text. */
export const transactionsIn = (month: string) =>
  dbQuery<Transaction>(`${TX} WHERE date BETWEEN ? AND ?`, [`${month}-01`, `${month}-31`])

export const getTransaction = (id: number) => dbFirst<Transaction>(`${TX} WHERE id = ?`, [id])

export const addTransaction = (t: NewTransaction) =>
  dbRun('INSERT INTO transactions (kind, amount, category_id, account_id, to_account_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [...txBind(t), Date.now()])

export const updateTransaction = (id: number, t: NewTransaction) =>
  dbRun('UPDATE transactions SET kind = ?, amount = ?, category_id = ?, account_id = ?, to_account_id = ?, date = ?, note = ? WHERE id = ?', [...txBind(t), id])

export const deleteTransaction = (id: number) => dbRun('DELETE FROM transactions WHERE id = ?', [id])

export async function counts() {
  return (await dbFirst<{ transactions: number, categories: number, accounts: number }>(
    'SELECT (SELECT COUNT(*) FROM transactions) AS transactions, (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM accounts) AS accounts',
  ))!
}

// Backups

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
  const [categories, transactions, accounts, valuations] = await Promise.all([listCategories(), listTransactions(), listAccounts(), listValuations()])
  return { app: 'draupne', version: 2, exportedAt: new Date().toISOString(), categories, transactions, accounts, valuations }
}

const DEFAULT_ACCOUNT_ROWS: Account[] = [
  { id: 1, name: 'Spending account', emoji: '💳', type: 'spending', opening: 0, position: 0 },
  { id: 2, name: 'Savings', emoji: '🏦', type: 'savings', opening: 0, position: 1 },
  { id: 3, name: 'Investments', emoji: '📈', type: 'investment', opening: 0, position: 2 },
]

/** Replaces everything with the backup's contents, in one transaction. Version 1 backups land on the default accounts. */
export async function importBackup(data: unknown) {
  const b = data as Partial<Backup>
  if (b?.app !== 'draupne' || !Array.isArray(b.categories) || !Array.isArray(b.transactions)) {
    throw new Error('That file is not a Draupne backup.')
  }
  const accounts = b.accounts?.length ? b.accounts : DEFAULT_ACCOUNT_ROWS
  const fallback = accounts.find((a) => a.type === 'spending')?.id ?? accounts[0]!.id
  const statements: Statement[] = [
    { sql: 'DELETE FROM valuations' },
    { sql: 'DELETE FROM transactions' },
    { sql: 'DELETE FROM accounts' },
    { sql: 'DELETE FROM categories' },
    ...b.categories.map((c) => ({
      sql: 'INSERT INTO categories (id, name, emoji, kind, budget, position) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [c.id, c.name, c.emoji, c.kind, c.budget ?? null, c.position],
    })),
    ...accounts.map((a) => ({
      sql: 'INSERT INTO accounts (id, name, emoji, type, opening, position) VALUES (?, ?, ?, ?, ?, ?)',
      bind: [a.id, a.name, a.emoji, a.type, a.opening ?? 0, a.position],
    })),
    ...(b.valuations ?? []).map((v) => ({
      sql: 'INSERT INTO valuations (id, account_id, date, value) VALUES (?, ?, ?, ?)',
      bind: [v.id, v.accountId, v.date, v.value],
    })),
    ...b.transactions.map((t) => ({
      sql: 'INSERT INTO transactions (id, kind, amount, category_id, account_id, to_account_id, date, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      bind: [t.id, ...txBind({ ...t, accountId: t.accountId ?? fallback }), t.createdAt ?? Date.now()],
    })),
  ]
  await dbBatch(statements)
}

/** Settings → Load sample data: replaces everything with made-up EUR data. */
export async function loadSampleData() {
  await importBackup(buildSample())
}

/**
 * Before SQLite, data lived in IndexedDB (Dexie). Copy it over once, then leave the old database be.
 * Only runs when SQLite is still empty and an old database exists.
 */
export async function migrateFromIndexedDB() {
  const FLAG = 'draupne:migrated-indexeddb'
  if (localStorage.getItem(FLAG) || !('indexedDB' in window)) return
  const known = await indexedDB.databases?.().catch(() => []) ?? []
  if (!known.some((d) => d.name === 'draupne')) return localStorage.setItem(FLAG, 'none')
  if ((await counts()).transactions > 0) return localStorage.setItem(FLAG, 'skipped')

  const old = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('draupne')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const read = <T>(store: string) => new Promise<T[]>((resolve) => {
    if (!old.objectStoreNames.contains(store)) return resolve([])
    const req = old.transaction(store).objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => resolve([])
  })
  const [categories, transactions, accounts, valuations] = await Promise.all([
    read<Category>('categories'), read<Transaction>('transactions'), read<Account>('accounts'), read<Valuation>('valuations'),
  ])
  old.close()
  if (transactions.length) {
    await importBackup({ app: 'draupne', version: 2, exportedAt: new Date().toISOString(), categories, transactions, accounts, valuations })
  }
  localStorage.setItem(FLAG, new Date().toISOString())
}
