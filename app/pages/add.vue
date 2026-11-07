<script setup lang="ts">
import type { Category, Kind } from '~/utils/db'

const route = useRoute()
const router = useRouter()
const { month } = useMonth()

const editingId = computed(() => (route.query.id ? Number(route.query.id) : null))
const categories = useLiveQuery(null, () => db.categories.orderBy('position').toArray(), [] as Category[])

const kind = ref<Kind>('expense')
const amountText = ref('')
const categoryId = ref<number | null>(null)
// New entries default to today, or the 1st of the month being viewed when that isn't this month.
const date = ref(month.value === todayISO().slice(0, 7) ? todayISO() : `${month.value}-01`)
const note = ref('')
const error = ref('')
const confirmDelete = ref(false)
const amountInput = ref<HTMLInputElement>()

const amount = computed(() => parseAmount(amountText.value))
const choices = computed(() => categories.value.filter((c) => c.kind === kind.value))

watch(kind, () => {
  if (!choices.value.some((c) => c.id === categoryId.value)) categoryId.value = null
})

onMounted(async () => {
  if (editingId.value) {
    const t = await db.transactions.get(editingId.value)
    if (!t) return router.replace('/')
    kind.value = t.kind
    await nextTick()
    amountText.value = amountToInput(t.amount)
    categoryId.value = t.categoryId
    date.value = t.date
    note.value = t.note
  } else {
    amountInput.value?.focus()
  }
})

async function save() {
  error.value = ''
  if (!amount.value) return (error.value = 'Enter an amount.')
  if (!categoryId.value) return (error.value = 'Pick a category.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) return (error.value = 'Pick a date.')

  const data = { kind: kind.value, amount: amount.value, categoryId: categoryId.value, date: date.value, note: note.value.trim() }
  if (editingId.value) await db.transactions.update(editingId.value, data)
  else await db.transactions.add({ ...data, createdAt: Date.now() } as never)

  month.value = date.value.slice(0, 7)
  router.push('/')
}

async function remove() {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await db.transactions.delete(editingId.value!)
  router.push('/')
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <header class="flex items-center justify-between">
      <NuxtLink to="/" class="-ml-2 rounded-full px-2 py-1 text-accent">Cancel</NuxtLink>
      <h1 class="font-semibold">{{ editingId ? 'Edit' : 'New' }} {{ kind }}</h1>
      <button type="submit" class="-mr-2 rounded-full px-2 py-1 font-semibold text-accent">Save</button>
    </header>

    <div class="grid grid-cols-2 rounded-full bg-line p-1 text-sm font-medium">
      <button
        v-for="k in (['expense', 'income'] as const)"
        :key="k"
        type="button"
        class="rounded-full py-2 capitalize transition"
        :class="kind === k ? 'bg-card shadow-sm' : 'text-ink-2'"
        @click="kind = k"
      >
        {{ k }}
      </button>
    </div>

    <label class="block rounded-3xl bg-card p-5 text-center ring-1 ring-line">
      <span class="text-sm text-ink-2">Amount</span>
      <input
        ref="amountInput"
        v-model="amountText"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0"
        class="mt-1 w-full bg-transparent text-center text-5xl font-semibold tracking-tight outline-none placeholder:text-ink-3"
        :class="kind === 'income' ? 'text-good-ink' : ''"
      >
    </label>

    <fieldset>
      <legend class="mb-2 px-1 text-sm font-medium text-ink-2">Category</legend>
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <button
          v-for="c in choices"
          :key="c.id"
          type="button"
          class="flex flex-col items-center gap-1 rounded-2xl bg-card px-2 py-3 text-xs ring-1 transition"
          :class="categoryId === c.id ? 'ring-2 ring-accent' : 'ring-line'"
          :aria-pressed="categoryId === c.id"
          @click="categoryId = c.id"
        >
          <span class="text-2xl">{{ c.emoji }}</span>
          <span class="w-full truncate text-center">{{ c.name }}</span>
        </button>
      </div>
    </fieldset>

    <div class="divide-y divide-line overflow-hidden rounded-2xl bg-card ring-1 ring-line">
      <label class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="text-ink-2">Date</span>
        <input v-model="date" type="date" required class="bg-transparent text-right outline-none">
      </label>
      <label class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="text-ink-2">Note</span>
        <input v-model="note" placeholder="Optional" class="min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-ink-3">
      </label>
    </div>

    <p v-if="error" role="alert" class="px-1 text-sm text-critical">{{ error }}</p>

    <button type="submit" class="w-full rounded-2xl bg-accent py-3.5 font-semibold text-white active:opacity-90 dark:text-black">
      {{ editingId ? 'Save changes' : `Add ${kind}` }}
    </button>

    <button
      v-if="editingId"
      type="button"
      class="w-full rounded-2xl py-3 font-medium text-critical"
      :class="confirmDelete ? 'bg-critical/10' : ''"
      @click="remove"
      @blur="confirmDelete = false"
    >
      {{ confirmDelete ? 'Tap again to delete' : 'Delete' }}
    </button>
  </form>
</template>
