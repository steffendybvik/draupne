import type { Account, AccountType, Transaction, Valuation } from '~/utils/db'

export interface AccountState {
  account: Account
  /** Money in the account by its own bookkeeping: opening + in − out. */
  balance: number
  /** Investments: what you put in (opening + transfers in − transfers out). */
  invested: number
  /** What it's worth: the latest valuation plus what moved since, or the balance if never valued. */
  value: number
  /** Investments: value − invested. */
  gain: number
  valuedOn: string | null
}

export const ACCOUNT_TYPES: { type: AccountType, label: string, emoji: string }[] = [
  { type: 'spending', label: 'Spending', emoji: '💳' },
  { type: 'savings', label: 'Savings', emoji: '🏦' },
  { type: 'investment', label: 'Investment', emoji: '📈' },
  { type: 'cash', label: 'Cash', emoji: '💵' },
  { type: 'credit', label: 'Credit card', emoji: '🧾' },
]

/** Where money ends up when it's put aside: savings and investment accounts. */
export const isSaving = (a?: Account) => a?.type === 'savings' || a?.type === 'investment'

/** Accounts with balances, investment values and net worth, kept live from IndexedDB. */
export function useAccounts() {
  const accounts = useLiveQuery(null, () => db.accounts.orderBy('position').toArray(), [] as Account[])
  const valuations = useLiveQuery(null, () => db.valuations.orderBy('date').toArray(), [] as Valuation[])
  const all = useLiveQuery(null, () => db.transactions.toArray(), [] as Transaction[])
  const accountById = computed(() => new Map(accounts.value.map((a) => [a.id, a])))

  /** Every account as it stood at the end of `date` (inclusive). */
  function stateAt(date: string): AccountState[] {
    const rows = new Map(accounts.value.map((a) => [a.id, { balance: a.opening, invested: a.opening }]))
    // Flows after each account's latest valuation, to roll the valuation forward.
    const lastValuation = new Map<number, Valuation>()
    for (const v of valuations.value) if (v.date <= date) lastValuation.set(v.accountId, v)
    const since = new Map<number, number>()
    const move = (id: number | null | undefined, delta: number, investedDelta: number, day: string) => {
      const row = id ? rows.get(id) : undefined
      if (!row) return
      row.balance += delta
      row.invested += investedDelta
      const v = lastValuation.get(id!)
      if (v && day > v.date) since.set(id!, (since.get(id!) ?? 0) + delta)
    }
    for (const t of all.value) {
      if (t.date > date) continue
      if (t.kind === 'income') move(t.accountId, t.amount, 0, t.date)
      else if (t.kind === 'expense') move(t.accountId, -t.amount, 0, t.date)
      else {
        move(t.accountId, -t.amount, -t.amount, t.date)
        move(t.toAccountId, t.amount, t.amount, t.date)
      }
    }
    return accounts.value.map((account) => {
      const row = rows.get(account.id)!
      const v = lastValuation.get(account.id)
      const value = v ? v.value + (since.get(account.id) ?? 0) : row.balance
      const invested = account.type === 'investment' ? row.invested : row.balance
      return { account, balance: row.balance, invested, value, gain: value - invested, valuedOn: v?.date ?? null }
    })
  }

  const today = computed(() => stateAt(todayISO()))
  const netWorth = computed(() => today.value.reduce((s, r) => s + r.value, 0))

  /** Net worth at the end of each of the `n` months ending with `end`. */
  function netWorthByMonth(end: string, n: number) {
    return Array.from({ length: n }, (_, i) => {
      const month = shiftMonth(end, i - n + 1)
      const rows = stateAt(`${month}-31`)
      return { month, total: rows.reduce((s, r) => s + r.value, 0), rows }
    })
  }

  /** Money moved into savings and into investments during a month (net of what came back out). */
  function putAside(month: string) {
    let savings = 0
    let investing = 0
    for (const t of all.value) {
      if (t.kind !== 'transfer' || !t.date.startsWith(month)) continue
      const from = accountById.value.get(t.accountId)
      const to = accountById.value.get(t.toAccountId ?? 0)
      // Moving between two saving accounts doesn't change how much was put aside.
      if (isSaving(from) === isSaving(to)) continue
      const sign = isSaving(to) ? 1 : -1
      const target = isSaving(to) ? to! : from!
      if (target.type === 'investment') investing += sign * t.amount
      else savings += sign * t.amount
    }
    return { savings, investing, total: savings + investing }
  }

  return { accounts, accountById, valuations, stateAt, today, netWorth, netWorthByMonth, putAside }
}
