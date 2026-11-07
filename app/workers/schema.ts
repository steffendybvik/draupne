/**
 * The SQLite schema, as ordered migrations. `PRAGMA user_version` records how many have run.
 * Money is in minor units (cents), dates are local `YYYY-MM-DD` text.
 */

export const DEFAULT_CATEGORIES: { name: string, emoji: string, kind: 'expense' | 'income' }[] = [
  { name: 'Housing', emoji: '🏠', kind: 'expense' },
  { name: 'Groceries', emoji: '🛒', kind: 'expense' },
  { name: 'Eating out', emoji: '🍽️', kind: 'expense' },
  { name: 'Transport', emoji: '🚆', kind: 'expense' },
  { name: 'Bills', emoji: '🧾', kind: 'expense' },
  { name: 'Subscriptions', emoji: '🔁', kind: 'expense' },
  { name: 'Shopping', emoji: '🛍️', kind: 'expense' },
  { name: 'Gifts', emoji: '🎁', kind: 'expense' },
  { name: 'Electronics', emoji: '💻', kind: 'expense' },
  { name: 'Hardware', emoji: '🛠️', kind: 'expense' },
  { name: 'Furniture', emoji: '🛋️', kind: 'expense' },
  { name: 'Health', emoji: '💊', kind: 'expense' },
  { name: 'Fun', emoji: '🎉', kind: 'expense' },
  { name: 'Travel', emoji: '✈️', kind: 'expense' },
  { name: 'Work', emoji: '💼', kind: 'expense' },
  { name: 'Other', emoji: '📦', kind: 'expense' },
  { name: 'Salary', emoji: '💶', kind: 'income' },
  { name: 'Other income', emoji: '💰', kind: 'income' },
]

export const DEFAULT_ACCOUNTS: { name: string, emoji: string, type: string }[] = [
  { name: 'Spending account', emoji: '💳', type: 'spending' },
  { name: 'Savings', emoji: '🏦', type: 'savings' },
  { name: 'Investments', emoji: '📈', type: 'investment' },
]

const q = (s: string) => `'${s.replace(/'/g, "''")}'`

export const MIGRATIONS: string[] = [
  // 1: categories, accounts, transactions, valuations, with the defaults.
  `
  CREATE TABLE categories (
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL,
    emoji    TEXT    NOT NULL DEFAULT '📦',
    kind     TEXT    NOT NULL CHECK (kind IN ('expense', 'income')),
    budget   INTEGER CHECK (budget IS NULL OR budget > 0),
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE accounts (
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL,
    emoji    TEXT    NOT NULL DEFAULT '🏦',
    type     TEXT    NOT NULL CHECK (type IN ('spending', 'savings', 'investment', 'cash', 'credit')),
    opening  INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE transactions (
    id            INTEGER PRIMARY KEY,
    kind          TEXT    NOT NULL CHECK (kind IN ('expense', 'income', 'transfer')),
    amount        INTEGER NOT NULL CHECK (amount > 0),
    category_id   INTEGER REFERENCES categories (id),
    account_id    INTEGER NOT NULL REFERENCES accounts (id),
    to_account_id INTEGER REFERENCES accounts (id),
    date          TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    note          TEXT    NOT NULL DEFAULT '',
    created_at    INTEGER NOT NULL,
    -- Expenses and income have a category; transfers have a destination instead.
    CHECK (
      (kind = 'transfer' AND category_id IS NULL AND to_account_id IS NOT NULL AND to_account_id <> account_id)
      OR (kind <> 'transfer' AND category_id IS NOT NULL AND to_account_id IS NULL)
    )
  );
  CREATE INDEX transactions_date ON transactions (date);
  CREATE INDEX transactions_category ON transactions (category_id);
  CREATE INDEX transactions_account ON transactions (account_id);
  CREATE INDEX transactions_to_account ON transactions (to_account_id);

  CREATE TABLE valuations (
    id         INTEGER PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    value      INTEGER NOT NULL,
    UNIQUE (account_id, date)
  );

  INSERT INTO categories (name, emoji, kind, position) VALUES
    ${DEFAULT_CATEGORIES.map((c, i) => `(${q(c.name)}, ${q(c.emoji)}, ${q(c.kind)}, ${i})`).join(',\n    ')};

  INSERT INTO accounts (name, emoji, type, position) VALUES
    ${DEFAULT_ACCOUNTS.map((a, i) => `(${q(a.name)}, ${q(a.emoji)}, ${q(a.type)}, ${i})`).join(',\n    ')};
  `,
]
