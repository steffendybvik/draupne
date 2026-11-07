// Writes the sample data (app/utils/sample.ts) as a backup file to import from Settings.
// The app can also load it directly: Settings → Load sample data.
// Usage: node scripts/sample-backup.mjs [out.json]   (Node 23.6+ runs the .ts import as is)
import fs from 'node:fs'
import { buildSample } from '../app/utils/sample.ts'

const backup = buildSample()
const out = process.argv[2] ?? 'draupne-sample.json'
fs.writeFileSync(out, JSON.stringify(backup, null, 2))

const months = {}
for (const t of backup.transactions) {
  if (t.kind === 'transfer') continue
  const m = (months[t.date.slice(0, 7)] ??= { income: 0, spent: 0 })
  m[t.kind === 'income' ? 'income' : 'spent'] += t.amount
}
for (const [m, v] of Object.entries(months)) console.log(m, `in €${v.income / 100}`.padEnd(12), `out €${Math.round(v.spent / 100)}`.padEnd(11), `net €${Math.round((v.income - v.spent) / 100)}`)
console.log(`${backup.transactions.length} transactions → ${out}`)
