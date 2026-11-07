<script setup lang="ts">
import { ArrowsRightLeftIcon, PencilSquareIcon, PlusIcon } from '@heroicons/vue/20/solid'
import type { Account, AccountType } from '~/utils/db'

const { month } = useMonth()
const { accounts, today, netWorth, netWorthByMonth, putAside } = useAccounts()
const { income } = useMonthData()
const { money, moneyRound, moneySigned, settings } = useSettings()

const trend = computed(() => netWorthByMonth(month.value, 12))
const lastMonthEnd = computed(() => trend.value.at(-2)?.total ?? 0)
const change = computed(() => netWorth.value - lastMonthEnd.value)
const aside = computed(() => putAside(month.value))
const asideRate = computed(() => (income.value > 0 ? Math.round((aside.value.total / income.value) * 100) : null))
const asideTrend = computed(() => Array.from({ length: 12 }, (_, i) => {
  const m = shiftMonth(month.value, i - 11)
  return { month: m, ...putAside(m) }
}))

const investments = computed(() => today.value.filter((r) => r.account.type === 'investment'))
const invested = computed(() => investments.value.reduce((s, r) => s + r.invested, 0))
const gain = computed(() => investments.value.reduce((s, r) => s + r.gain, 0))
const pct = (part: number, whole: number) => (whole ? `${part >= 0 ? '+' : ''}${((part / whole) * 100).toFixed(1)}%` : '')

// Grouped by type (spending first, then savings, investments…), in the order you set within a type.
const sorted = computed(() => [...today.value].sort((a, b) =>
  ACCOUNT_TYPES.findIndex((t) => t.type === a.account.type) - ACCOUNT_TYPES.findIndex((t) => t.type === b.account.type)
  || a.account.position - b.account.position))
const typeLabel = (type: AccountType) => ACCOUNT_TYPES.find((t) => t.type === type)?.label ?? type

// Usage per account, so one with transactions can't be deleted.
const usage = useLiveQuery(null, () => accountUsage(), new Map<number, number>())

// Editing: one account at a time, or a new one.
const editing = ref<number | 'new' | null>(null)
const form = reactive({ name: '', emoji: '', type: 'spending' as AccountType, opening: '' })
const confirmDelete = ref(false)
function open(a?: Account) {
  confirmDelete.value = false
  valuing.value = null
  editing.value = a?.id ?? 'new'
  form.name = a?.name ?? ''
  form.emoji = a?.emoji ?? '🏦'
  form.type = a?.type ?? 'savings'
  form.opening = a?.opening ? amountToInput(Math.abs(a.opening)) : ''
}
async function save() {
  const name = form.name.trim()
  if (!name) return
  const data = { name, emoji: form.emoji.trim() || '🏦', type: form.type, opening: parseAmount(form.opening) ?? 0 }
  if (editing.value === 'new') {
    await addAccount(data)
  } else if (editing.value) {
    await updateAccount(editing.value, data)
  }
  editing.value = null
}
async function remove(id: number) {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  await deleteAccount(id)
  editing.value = null
}

// Updating an investment's value: a valuation for today.
const valuing = ref<number | null>(null)
const valueText = ref('')
function startValuing(id: number, current: number) {
  editing.value = null
  valuing.value = id
  valueText.value = amountToInput(Math.max(0, current))
}
async function saveValue(id: number) {
  const value = parseAmount(valueText.value)
  if (value === null) return
  const date = todayISO()
  await setValuation(id, date, value)
  valuing.value = null
}
</script>

<template>
  <div class="min-w-0 space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Accounts</h1>
        <p class="text-sm text-ink-2">Everything you have, and how much you put aside.</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/add?kind=transfer&back=accounts" class="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110 dark:text-black"><ArrowsRightLeftIcon class="size-4" aria-hidden="true" />Move money</NuxtLink>
        <button class="card flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-accent transition hover:bg-raised" @click="open()"><PlusIcon class="size-4" aria-hidden="true" />Account</button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <ChartsStatTile
        label="Net worth"
        :value="moneyRound(netWorth)"
        :delta="trend.length > 1 ? `${change >= 0 ? '▲' : '▼'} ${moneySigned(change)} this month` : undefined"
        :tone="change >= 0 ? 'good' : 'bad'"
      />
      <ChartsStatTile
        label="Saved & invested"
        :value="moneyRound(aside.total)"
        :delta="asideRate !== null ? `${asideRate}% of income` : undefined"
        tone="neutral"
        :hint="monthLong(month)"
      />
      <ChartsStatTile label="Invested" :value="moneyRound(invested)" hint="Put into investment accounts" />
      <ChartsStatTile
        label="Investment gain"
        :value="moneySigned(gain)"
        :delta="invested ? `${gain >= 0 ? '▲' : '▼'} ${pct(gain, invested)} on what you put in` : undefined"
        :tone="gain >= 0 ? 'good' : 'bad'"
        hint="Update values to see it"
      />
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section class="card min-w-0 p-5">
        <h2 class="font-semibold">Net worth</h2>
        <p class="mb-3 text-xs text-ink-3">All accounts at each month's end</p>
        <ChartsNetWorthChart :months="trend" />
      </section>
      <section class="card min-w-0 p-5">
        <h2 class="font-semibold">Saved &amp; invested</h2>
        <p class="mb-3 text-xs text-ink-3">Moved into savings and investment accounts, per month</p>
        <ChartsPutAsideChart :months="asideTrend" />
      </section>
    </div>

    <section>
      <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">Your accounts</h2>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="r in sorted" :key="r.account.id" class="card p-4">
          <AccountEditor
            v-if="editing === r.account.id"
            v-model="form"
            :uses="usage.get(r.account.id) ?? 0"
            :confirm-delete="confirmDelete"
            @save="save"
            @cancel="editing = null"
            @delete="remove(r.account.id)"
          />
          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-raised text-xl">{{ r.account.emoji }}</span>
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ r.account.name }}</p>
                  <p class="text-xs text-ink-3">{{ typeLabel(r.account.type) }}</p>
                </div>
              </div>
              <button class="rounded-lg p-1.5 text-ink-3 transition hover:bg-raised hover:text-ink" :aria-label="`Edit ${r.account.name}`" title="Edit" @click="open(r.account)"><PencilSquareIcon class="size-4" aria-hidden="true" /></button>
            </div>
            <p class="mt-3 text-2xl font-semibold tracking-tight" :class="r.value < 0 ? 'text-critical' : ''">{{ money(r.value) }}</p>

            <template v-if="r.account.type === 'investment'">
              <dl class="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-xl bg-raised p-2">
                  <dt class="text-ink-3">Invested</dt>
                  <dd class="font-semibold tabular-nums">{{ moneyRound(r.invested) }}</dd>
                </div>
                <div class="rounded-xl bg-raised p-2">
                  <dt class="text-ink-3">Gain</dt>
                  <dd class="font-semibold tabular-nums" :class="r.gain > 0 ? 'text-good-ink' : r.gain < 0 ? 'text-critical' : ''">
                    {{ r.gain > 0 ? '▲' : r.gain < 0 ? '▼' : '' }} {{ moneySigned(r.gain) }} <span class="font-normal text-ink-3">{{ pct(r.gain, r.invested) }}</span>
                  </dd>
                </div>
              </dl>
              <form v-if="valuing === r.account.id" class="mt-3 flex gap-2" @submit.prevent="saveValue(r.account.id)">
                <label class="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-raised px-3 py-2 ring-1 ring-line focus-within:ring-accent">
                  <span class="text-xs text-ink-3">Worth today</span>
                  <input v-model="valueText" inputmode="decimal" class="min-w-0 flex-1 bg-transparent text-right text-sm outline-none" autofocus>
                  <span class="text-xs text-ink-3">{{ settings.currency }}</span>
                </label>
                <button type="button" class="rounded-xl px-2 text-sm text-ink-2" @click="valuing = null">Cancel</button>
                <button type="submit" class="rounded-xl bg-accent px-3 text-sm font-semibold text-white dark:text-black">Save</button>
              </form>
              <p v-else class="mt-3 flex items-center justify-between text-xs text-ink-3">
                <span>{{ r.valuedOn ? `Value from ${r.valuedOn}` : 'Never valued: showing what you put in' }}</span>
                <button class="font-medium text-accent" @click="startValuing(r.account.id, r.value)">Update value</button>
              </p>
            </template>
          </template>
        </div>
      </div>
    </section>

    <div v-if="editing === 'new'" class="card max-w-md p-4">
      <AccountEditor v-model="form" is-new @save="save" @cancel="editing = null" />
    </div>
  </div>
</template>
