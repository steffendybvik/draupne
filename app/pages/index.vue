<script setup lang="ts">
const { categoryById, transactions, income, spent, left, byCategory, days } = useMonthData()
const { money, moneyRound } = useSettings()

const spending = computed(() => byCategory.value.filter((c) => c.spent > 0))
const maxSpent = computed(() => Math.max(1, ...spending.value.map((c) => c.spent)))

function dayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const today = todayISO()
  if (date === today) return 'Today'
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="space-y-5">
    <div class="md:flex md:items-end md:justify-between md:gap-3">
      <h1 class="hidden text-3xl font-semibold tracking-tight md:block">Month</h1>
      <div class="md:w-72"><MonthPicker /></div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
    <div class="space-y-5 lg:sticky lg:top-8">
    <!-- Hero: what's left this month -->
    <section class="card p-5">
      <p class="text-sm text-ink-2">Left this month</p>
      <p
        class="mt-1 text-5xl font-semibold tracking-tight md:text-6xl"
        :class="left < 0 ? 'text-critical' : 'text-ink'"
      >
        {{ moneyRound(left) }}
      </p>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-raised p-3">
          <p class="text-xs text-ink-2">Income</p>
          <p class="mt-0.5 text-lg font-semibold">{{ moneyRound(income) }}</p>
        </div>
        <div class="rounded-2xl bg-raised p-3">
          <p class="text-xs text-ink-2">Spent</p>
          <p class="mt-0.5 text-lg font-semibold">{{ moneyRound(spent) }}</p>
        </div>
      </div>
    </section>

    <!-- Spending by category: one series, so one hue; names and amounts in text ink -->
    <section v-if="spending.length" class="card p-5">
      <h2 class="mb-3 text-sm font-medium text-ink-2">Spending by category</h2>
      <ul class="space-y-3">
        <li
          v-for="row in spending"
          :key="row.category.id"
          :title="`${row.category.name}: ${money(row.spent)} across ${row.count} ${row.count === 1 ? 'payment' : 'payments'} (${Math.round(row.spent / spent * 100)}% of spending)`"
        >
          <div class="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span class="truncate">{{ row.category.emoji }} {{ row.category.name }}</span>
            <span class="font-medium tabular-nums">{{ moneyRound(row.spent) }}</span>
          </div>
          <div class="h-2 rounded-full bg-track">
            <div class="h-2 rounded-full bg-bar" :style="{ width: `${Math.max(2, row.spent / maxSpent * 100)}%` }" />
          </div>
        </li>
      </ul>
    </section>

    </div>

    <!-- Transactions -->
    <section>
      <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">
        Transactions <span class="text-ink-3">· {{ transactions.length }}</span>
      </h2>

      <div v-if="!days.length" class="card p-8 text-center">
        <p class="text-3xl">🧾</p>
        <p class="mt-2 font-medium">Nothing logged this month</p>
        <p class="mt-1 text-sm text-ink-2">Tap + to add an expense or income.</p>
      </div>

      <div v-for="day in days" :key="day.date" class="mb-3">
        <div class="flex justify-between px-1 pb-1 text-xs text-ink-3">
          <span>{{ dayLabel(day.date) }}</span>
          <span class="tabular-nums">{{ day.net > 0 ? '+' : '' }}{{ money(day.net) }}</span>
        </div>
        <ul class="divide-y divide-line card overflow-hidden">
          <li v-for="t in day.items" :key="t.id">
            <NuxtLink :to="`/add?id=${t.id}`" class="flex items-center gap-3 px-4 py-3 hover:bg-raised active:bg-raised">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-raised text-lg">
                {{ categoryById.get(t.categoryId)?.emoji ?? '❔' }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ t.note || categoryById.get(t.categoryId)?.name || 'Uncategorised' }}</span>
                <span v-if="t.note" class="block truncate text-xs text-ink-3">{{ categoryById.get(t.categoryId)?.name }}</span>
              </span>
              <span class="shrink-0 font-medium tabular-nums" :class="t.kind === 'income' ? 'text-good-ink' : ''">
                {{ t.kind === 'income' ? '+' : '−' }}{{ money(t.amount) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>
    </div>
  </div>
</template>
