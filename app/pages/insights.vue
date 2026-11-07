<script setup lang="ts">
import type { BreakdownRow } from '~/composables/useHistory'

const { month, categories, categoryById, transactions, income, spent, net: left, byCategory } = useMonthData()
const { lastMonths, cumulativeSpent, spentByCategory, years } = useHistory()
const { money, moneyRound, moneySigned } = useSettings()

const prevMonth = computed(() => shiftMonth(month.value, -1))
const thisLabel = computed(() => monthLong(month.value))
const prevLabel = computed(() => monthLong(prevMonth.value))
const isCurrent = computed(() => month.value === todayISO().slice(0, 7))

// Pace: this month only up to today (the future hasn't happened), last month in full.
const pace = computed(() => {
  const current = cumulativeSpent(month.value)
  return {
    current: isCurrent.value ? current.slice(0, Number(todayISO().slice(8, 10))) : current,
    previous: cumulativeSpent(prevMonth.value),
  }
})
const totalBudget = computed(() => categories.value.reduce((s, c) => s + (c.kind === 'expense' ? c.budget ?? 0 : 0), 0))

// While a month is running, compare with last month at the same day, not with all of it.
const spentBefore = computed(() => {
  const p = pace.value.previous
  return isCurrent.value ? p[Math.min(pace.value.current.length, p.length) - 1] ?? 0 : p.at(-1) ?? 0
})
const spentDelta = computed(() => {
  if (!spentBefore.value) return undefined
  const change = Math.round(((spent.value - spentBefore.value) / spentBefore.value) * 100)
  const vs = isCurrent.value ? `same day in ${prevLabel.value}` : prevLabel.value
  return { text: `${change > 0 ? '▲ +' : change < 0 ? '▼ ' : ''}${change}% vs ${vs}`, tone: change > 0 ? 'bad' : change < 0 ? 'good' : 'neutral' } as const
})
const savingsRate = computed(() => (income.value > 0 ? Math.round((left.value / income.value) * 100) : null))

// Twelve months of P&L, ending with the viewed month; the average counts only months with data.
const pnl = computed(() => lastMonths(month.value, 12))
// The running month isn't over (payday may still be ahead), so averages use complete months only.
const thisMonth = todayISO().slice(0, 7)
const active = computed(() => pnl.value.filter((m) => m.count && m.month < thisMonth))
const avgNet = computed(() => (active.value.length ? Math.round(active.value.reduce((s, m) => s + m.net, 0) / active.value.length) : 0))
const totalNet = computed(() => pnl.value.reduce((s, m) => s + m.net, 0))
const wins = computed(() => active.value.filter((m) => m.net >= 0).length)

const breakdown = computed<BreakdownRow[]>(() => {
  const before = spentByCategory(prevMonth.value)
  return byCategory.value.map((r) => ({ category: r.category, spent: r.spent, previous: before.get(r.category.id) ?? 0 }))
})

const biggest = computed(() => transactions.value.filter((t) => t.kind === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5))

function shortDate(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function pctChange(now: number, before?: number) {
  if (!before) return null
  return Math.round(((now - before) / Math.abs(before)) * 100)
}
</script>

<template>
  <div class="min-w-0 space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Insights</h1>
        <p class="text-sm text-ink-2">Where the money goes, and whether you're coming out ahead.</p>
      </div>
      <div class="w-full md:w-72"><MonthPicker /></div>
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ChartsStatTile label="Spent" :value="moneyRound(spent)" :delta="spentDelta?.text" :tone="spentDelta?.tone" hint="Nothing last month to compare" />
      <ChartsStatTile label="Income" :value="moneyRound(income)" :hint="`${transactions.filter((t) => t.kind === 'income').length} payments`" />
      <ChartsStatTile
        :label="left >= 0 ? 'Surplus this month' : 'Overspent this month'"
        :value="moneySigned(left)"
        :delta="savingsRate !== null ? `${left >= 0 ? '▲' : '▼'} ${savingsRate}% of income` : undefined"
        :tone="left >= 0 ? 'good' : 'bad'"
        hint="No income logged"
      />
      <ChartsStatTile
        label="Average monthly P&L"
        :value="moneySigned(avgNet)"
        :delta="active.length ? `${wins} of ${active.length} complete months a win` : undefined"
        :tone="avgNet >= 0 ? 'good' : 'bad'"
        hint="Complete months, last 12"
      />
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <section class="card min-w-0 p-5 lg:col-span-3">
        <h2 class="font-semibold">Spending pace</h2>
        <p class="mb-3 text-xs text-ink-3">Spent so far, day by day</p>
        <ChartsPaceChart
          :current="pace.current"
          :previous="pace.previous"
          :current-label="thisLabel"
          :previous-label="prevLabel"
          :budget="totalBudget || undefined"
        />
      </section>

      <section class="card min-w-0 p-5 lg:col-span-2">
        <h2 class="font-semibold">Biggest expenses</h2>
        <p class="mb-3 text-xs text-ink-3">{{ thisLabel }}</p>
        <p v-if="!biggest.length" class="py-8 text-center text-sm text-ink-3">No expenses yet.</p>
        <ol class="space-y-1">
          <li v-for="t in biggest" :key="t.id">
            <NuxtLink :to="`/add?id=${t.id}`" class="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-raised">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-raised text-lg">{{ categoryById.get(t.categoryId)?.emoji ?? '❔' }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium">{{ t.note || categoryById.get(t.categoryId)?.name }}</span>
                <span class="block text-xs text-ink-3">{{ shortDate(t.date) }} · {{ categoryById.get(t.categoryId)?.name }}</span>
              </span>
              <span class="text-sm font-semibold tabular-nums">{{ money(t.amount) }}</span>
            </NuxtLink>
          </li>
        </ol>
      </section>
    </div>

    <section class="card p-5">
      <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 class="font-semibold">Spending by category</h2>
          <p class="text-xs text-ink-3">{{ thisLabel }}, against {{ prevLabel }}</p>
        </div>
        <p class="text-sm text-ink-2">{{ money(spent) }} total</p>
      </div>
      <p v-if="!spent" class="py-6 text-center text-sm text-ink-3">Nothing spent this month yet.</p>
      <ChartsCategoryBreakdown v-else :rows="breakdown" :total="spent" :previous-label="prevLabel" />
    </section>

    <section class="card p-5">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 class="font-semibold">Profit &amp; loss</h2>
          <p class="text-xs text-ink-3">Income minus spending, last 12 months · tap a month to open it</p>
        </div>
        <p class="text-sm">
          <span class="text-ink-2">12-month total</span>
          <span class="ml-1.5 font-semibold tabular-nums" :class="totalNet >= 0 ? 'text-good-ink' : 'text-critical'">{{ totalNet >= 0 ? '▲' : '▼' }} {{ moneySigned(totalNet) }}</span>
        </p>
      </div>
      <ChartsPnlChart :months="pnl" :selected="month" :average="active.length ? avgNet : undefined" @select="(m) => (month = m)" />
    </section>

    <section class="card overflow-hidden">
      <div class="p-5 pb-3">
        <h2 class="font-semibold">Year over year</h2>
        <p class="text-xs text-ink-3">Each year's result, and the change from the year before</p>
      </div>
      <p v-if="!years.length" class="px-5 pb-6 text-sm text-ink-3">No transactions yet.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[36rem] text-sm tabular-nums">
          <thead class="border-y border-line bg-raised text-xs text-ink-3">
            <tr>
              <th class="px-5 py-2 text-left font-medium">Year</th>
              <th class="px-3 py-2 text-right font-medium">Income</th>
              <th class="px-3 py-2 text-right font-medium">Spent</th>
              <th class="px-3 py-2 text-right font-medium">Net P&amp;L</th>
              <th class="px-3 py-2 text-right font-medium">Avg / month</th>
              <th class="px-5 py-2 text-right font-medium">Avg / month vs year before</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="(y, i) in years" :key="y.year">
              <td class="px-5 py-3 font-semibold">{{ y.year }} <span class="text-xs font-normal text-ink-3">· {{ y.months }} mo</span></td>
              <td class="px-3 py-3 text-right">{{ moneyRound(y.income) }}</td>
              <td class="px-3 py-3 text-right">{{ moneyRound(y.spent) }}</td>
              <td class="px-3 py-3 text-right font-semibold" :class="y.net >= 0 ? 'text-good-ink' : 'text-critical'">
                {{ y.net >= 0 ? '▲' : '▼' }} {{ moneySigned(y.net) }}
              </td>
              <td class="px-3 py-3 text-right">{{ moneySigned(y.avgNet) }}</td>
              <td class="px-5 py-3 text-right">
                <template v-if="years[i + 1]">
                  <span :class="y.avgNet >= years[i + 1]!.avgNet ? 'text-good-ink' : 'text-critical'">
                    {{ y.avgNet >= years[i + 1]!.avgNet ? '▲ better' : '▼ worse' }} {{ moneySigned(y.avgNet - years[i + 1]!.avgNet) }}
                  </span>
                  <span v-if="pctChange(y.avgNet, years[i + 1]!.avgNet) !== null" class="ml-1 text-xs text-ink-3">({{ pctChange(y.avgNet, years[i + 1]!.avgNet)! > 0 ? '+' : '' }}{{ pctChange(y.avgNet, years[i + 1]!.avgNet) }}%)</span>
                </template>
                <span v-else class="text-ink-3">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
