<script setup lang="ts">
import type { Category, CategoryKind } from '~/utils/db'

const { categories, byCategory, spent } = useMonthData()
const { moneyRound } = useSettings()

const usage = useLiveQuery(null, async () => {
  const counts = new Map<number, number>()
  await db.transactions.each((t) => counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1))
  return counts
}, new Map<number, number>())

const budgeted = computed(() => byCategory.value.filter((r) => r.category.budget))
const unbudgeted = computed(() => byCategory.value.filter((r) => !r.category.budget))
const totalBudget = computed(() => budgeted.value.reduce((s, r) => s + r.category.budget!, 0))
const budgetedSpent = computed(() => budgeted.value.reduce((s, r) => s + r.spent, 0))
const incomeCategories = computed(() => categories.value.filter((c) => c.kind === 'income'))

// One category open for editing at a time.
const editing = ref<number | 'new' | null>(null)
const form = reactive({ name: '', emoji: '', budget: '', kind: 'expense' as CategoryKind })
const confirmDelete = ref(false)

function open(c?: Category, kind: CategoryKind = 'expense') {
  confirmDelete.value = false
  editing.value = c?.id ?? 'new'
  form.name = c?.name ?? ''
  form.emoji = c?.emoji ?? (kind === 'income' ? '💰' : '📦')
  form.budget = c?.budget ? amountToInput(c.budget) : ''
  form.kind = c?.kind ?? kind
}

async function save() {
  const name = form.name.trim()
  if (!name) return
  const data = {
    name,
    emoji: form.emoji.trim() || '📦',
    kind: form.kind,
    budget: form.kind === 'expense' ? parseAmount(form.budget) : null,
  }
  if (editing.value === 'new') {
    const last = await db.categories.orderBy('position').last()
    await db.categories.add({ ...data, position: (last?.position ?? 0) + 1 } as never)
  } else if (editing.value) {
    await db.categories.update(editing.value, data)
  }
  editing.value = null
}

async function remove(id: number) {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await db.categories.delete(id)
  editing.value = null
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5">
    <div class="md:flex md:items-end md:justify-between md:gap-3">
      <h1 class="hidden text-3xl font-semibold tracking-tight md:block">Budgets</h1>
      <div class="md:w-72"><MonthPicker /></div>
    </div>

    <section v-if="totalBudget" class="card p-5">
      <p class="text-sm text-ink-2">Budgeted categories</p>
      <p class="mt-1 text-4xl font-semibold tracking-tight">{{ moneyRound(Math.abs(totalBudget - budgetedSpent)) }}</p>
      <p class="text-sm text-ink-2">{{ totalBudget - budgetedSpent < 0 ? 'over budget' : 'left to spend' }}</p>
      <div class="mt-4">
        <BudgetMeter :spent="budgetedSpent" :budget="totalBudget" />
      </div>
      <p v-if="spent > budgetedSpent" class="mt-3 text-xs text-ink-3">
        Plus {{ moneyRound(spent - budgetedSpent) }} in categories without a budget.
      </p>
    </section>
    <p v-else class="card p-5 text-sm text-ink-2">
      Give a category a monthly budget to see how you're tracking against it. Tap any category below.
    </p>

    <template v-for="group in [{ title: 'Budgets', rows: budgeted }, { title: 'No budget', rows: unbudgeted }]" :key="group.title">
      <section v-if="group.rows.length">
        <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">{{ group.title }}</h2>
        <ul class="divide-y divide-line card overflow-hidden">
          <li v-for="row in group.rows" :key="row.category.id">
            <CategoryEditor
              v-if="editing === row.category.id"
              v-model="form"
              :uses="usage.get(row.category.id) ?? 0"
              :confirm-delete="confirmDelete"
              @save="save"
              @cancel="editing = null"
              @delete="remove(row.category.id)"
            />
            <button v-else class="w-full px-4 py-3 text-left hover:bg-raised active:bg-raised" @click="open(row.category)">
              <span class="flex items-center justify-between gap-3">
                <span class="truncate font-medium">{{ row.category.emoji }} {{ row.category.name }}</span>
                <span v-if="!row.category.budget" class="shrink-0 text-sm tabular-nums text-ink-2">{{ moneyRound(row.spent) }}</span>
              </span>
              <span v-if="row.category.budget" class="mt-2 block">
                <BudgetMeter :spent="row.spent" :budget="row.category.budget" />
              </span>
            </button>
          </li>
        </ul>
      </section>
    </template>

    <section>
      <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">Income categories</h2>
      <ul class="divide-y divide-line card overflow-hidden">
        <li v-for="c in incomeCategories" :key="c.id">
          <CategoryEditor
            v-if="editing === c.id"
            v-model="form"
            :uses="usage.get(c.id) ?? 0"
            :confirm-delete="confirmDelete"
            @save="save"
            @cancel="editing = null"
            @delete="remove(c.id)"
          />
          <button v-else class="w-full px-4 py-3 text-left font-medium hover:bg-raised active:bg-raised" @click="open(c)">
            {{ c.emoji }} {{ c.name }}
          </button>
        </li>
      </ul>
    </section>

    <div v-if="editing === 'new'" class="card overflow-hidden">
      <CategoryEditor v-model="form" is-new @save="save" @cancel="editing = null" />
    </div>
    <div v-else class="grid grid-cols-2 gap-2">
      <button class="card py-3 text-sm font-medium text-accent transition hover:bg-raised" @click="open(undefined, 'expense')">+ Expense category</button>
      <button class="card py-3 text-sm font-medium text-accent transition hover:bg-raised" @click="open(undefined, 'income')">+ Income category</button>
    </div>
  </div>
</template>
