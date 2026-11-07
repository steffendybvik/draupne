// Writes a Draupne backup with made-up data to import from Settings → Import backup.
// September 2025 up to today, in EUR, on a €5,500 net monthly salary: most months save money,
// a few cost more than came in (Christmas, a broken laptop and car, the summer holiday, a dentist bill).
// Usage: node scripts/sample-backup.mjs [out.json]
import fs from 'node:fs'

const names = [
  ['Housing', '🏠', 'expense', 1700], ['Groceries', '🛒', 'expense', 600], ['Eating out', '🍽️', 'expense', 250],
  ['Transport', '🚆', 'expense', 120], ['Bills', '🧾', 'expense', null], ['Subscriptions', '🔁', 'expense', 80],
  ['Shopping', '🛍️', 'expense', 200], ['Gifts', '🎁', 'expense', null], ['Electronics', '💻', 'expense', null],
  ['Hardware', '🛠️', 'expense', null], ['Furniture', '🛋️', 'expense', null], ['Health', '💊', 'expense', null],
  ['Fun', '🎉', 'expense', 150], ['Travel', '✈️', 'expense', null], ['Work', '💼', 'expense', null],
  ['Other', '📦', 'expense', null], ['Salary', '💶', 'income', null], ['Other income', '💰', 'income', null],
]
const categories = names.map(([name, emoji, kind, budget], i) => ({ id: i + 1, name, emoji, kind, budget: budget && budget * 100, position: i }))
const C = Object.fromEntries(categories.map((c) => [c.name, c.id]))

let seed = 11
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const r = (lo, hi) => lo + rnd() * (hi - lo)
const pad = (n) => String(n).padStart(2, '0')
const today = new Date()
const transactions = []

for (let d = new Date(2025, 8, 1); d <= today; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
  const y = d.getFullYear()
  const mon = d.getMonth()
  const ym = `${y}-${pad(mon + 1)}`
  const isNow = y === today.getFullYear() && mon === today.getMonth()
  const last = isNow ? today.getDate() : new Date(y, mon + 1, 0).getDate()
  const day = () => 1 + Math.floor(rnd() * last)
  const add = (cat, eur, dd, note = '', kind = 'expense') => {
    if (dd > last) return
    transactions.push({ id: transactions.length + 1, kind, amount: Math.round(eur * 100), categoryId: C[cat], date: `${ym}-${pad(dd)}`, note, createdAt: Date.UTC(y, mon, dd) + transactions.length })
  }
  const winter = mon >= 10 || mon <= 2

  // Income
  add('Salary', 5500, 25, 'Salary', 'income')
  if (mon === 11) add('Other income', 1200, 15, 'Christmas bonus', 'income')
  if (rnd() < 0.25) add('Other income', r(40, 250), day(), 'Sold on Marketplace', 'income')

  // Fixed monthly costs
  add('Housing', 1650, 1, 'Rent')
  add('Bills', winter ? r(110, 150) : r(55, 80), 4, 'Electricity')
  add('Bills', 45, 6, 'Internet'); add('Bills', 25, 7, 'Phone'); add('Bills', 32, 10, 'Home insurance')
  add('Subscriptions', 13.99, 5, 'Netflix'); add('Subscriptions', 11.99, 9, 'Spotify'); add('Subscriptions', 2.99, 14, 'iCloud+')
  add('Subscriptions', 20, 18, 'ChatGPT'); add('Subscriptions', 39, 2, 'Gym')
  add('Transport', 49, 1, 'Monthly transit pass')

  // Everyday spending
  for (let i = 0; i < 12; i++) add('Groceries', r(18, 85), day(), ['Lidl', 'Albert Heijn', 'Aldi', 'Market'][i % 4])
  for (let i = 0; i < 4 + Math.floor(rnd() * 4); i++) add('Eating out', r(14, 75), day(), ['Dinner', 'Lunch', 'Coffee & cake', 'Sushi'][i % 4])
  for (let i = 0; i < 2; i++) add('Transport', r(12, 40), day(), 'Taxi')
  add('Shopping', r(40, 260), day(), ['Clothes', 'Shoes', 'Home stuff'][mon % 3])
  add('Fun', r(30, 160), day(), ['Cinema', 'Concert', 'Bar'][mon % 3])
  add('Health', r(10, 60), day(), 'Pharmacy')
  if (rnd() < 0.5) add('Hardware', r(15, 90), day(), ['Drill bits', 'Paint', 'Light bulbs', 'Screws & plugs'][mon % 4])
  if (rnd() < 0.4) add('Work', r(20, 140), day(), ['Train to client', 'Co-working day', 'Work lunch', 'Books'][mon % 4])
  if (rnd() < 0.35) add('Gifts', r(25, 80), day(), 'Birthday present')
  if (rnd() < 0.2) add('Other', r(20, 120), day(), 'Misc')

  // One-offs through the year
  if (mon === 8 && y === 2025) { add('Furniture', 890, 13, 'Sofa'); add('Electronics', 129, 20, 'Headphones') }
  if (mon === 10) { add('Gifts', r(250, 400), 22, 'Christmas presents'); add('Electronics', 249, 28, 'Black Friday monitor') }
  if (mon === 11) { add('Gifts', r(200, 350), 12, 'More Christmas presents'); add('Travel', 1450, 19, 'Flights home for Christmas'); add('Travel', 2200, 27, 'Ski trip') }
  if (mon === 1) { add('Electronics', 1300, 16, 'New laptop'); add('Transport', 1450, 21, 'Car repair') }
  if (mon === 2) add('Furniture', 340, 8, 'Desk chair')
  if (mon === 3) add('Travel', 980, 10, 'Easter weekend in Lisbon')
  if (mon === 4) { add('Hardware', 310, 17, 'Balcony tools & planters'); add('Work', 450, 22, 'Conference ticket') }
  if (mon === 6) { add('Travel', 2900, 5, 'Summer holiday'); add('Eating out', 520, 12, 'Holiday dinners') }
  if (mon === 7) add('Furniture', 620, 24, 'Bookshelf & lamp')
  if (mon === 9 && y === 2026) { add('Health', 1850, 8, 'Dentist'); add('Fun', 950, 17, 'Wedding weekend') }
}

const backup = { app: 'draupne', version: 1, exportedAt: new Date().toISOString(), categories, transactions }
const out = process.argv[2] ?? 'draupne-sample.json'
fs.writeFileSync(out, JSON.stringify(backup, null, 2))

// Summary: income, spent and net per month.
const months = {}
for (const t of transactions) {
  const m = (months[t.date.slice(0, 7)] ??= { income: 0, spent: 0 })
  m[t.kind === 'income' ? 'income' : 'spent'] += t.amount
}
for (const [m, v] of Object.entries(months)) console.log(m, `in €${v.income / 100}`.padEnd(12), `out €${Math.round(v.spent / 100)}`.padEnd(11), `net €${Math.round((v.income - v.spent) / 100)}`)
console.log(`${transactions.length} transactions → ${out}`)
