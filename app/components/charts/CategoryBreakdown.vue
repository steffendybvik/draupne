<script setup lang="ts">
import type { BreakdownRow } from '~/composables/useHistory'

/**
 * Where the money went: a tall segmented bar of the biggest parts (top five + Other),
 * then every category as ranked bars with its share and change against last month.
 */
const props = defineProps<{ rows: BreakdownRow[], total: number, previousLabel: string }>()
const { money, moneyRound, moneySigned } = useSettings()

const SLOTS = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5']
// Labels inside the segment: near-black on yellow, white elsewhere.
const INK = ['text-white', 'text-white', 'text-white', 'text-[#0b0b0b]', 'text-white']

const ranked = computed(() => props.rows.filter((r) => r.spent > 0).sort((a, b) => b.spent - a.spent))
const segments = computed(() => {
  const top = ranked.value.slice(0, 5).map((r, i) => ({ key: String(r.category.id), name: r.category.name, value: r.spent, fill: SLOTS[i]!, ink: INK[i]! }))
  const rest = ranked.value.slice(5).reduce((s, r) => s + r.spent, 0)
  if (rest > 0) top.push({ key: 'other', name: 'Other', value: rest, fill: 'bg-other', ink: 'text-[#0b0b0b]' })
  return top
})
const pct = (v: number) => (props.total ? Math.round((v / props.total) * 100) : 0)
const max = computed(() => Math.max(1, ...ranked.value.map((r) => r.spent)))
const slotOf = (id: number) => {
  const i = ranked.value.findIndex((r) => r.category.id === id)
  return i >= 0 && i < 5 ? SLOTS[i]! : 'bg-other'
}
const hover = ref<string | null>(null)
</script>

<template>
  <div>
    <div
      class="flex h-7 gap-0.5"
      role="img"
      :aria-label="segments.map((s) => `${s.name} ${pct(s.value)}%`).join(', ')"
    >
      <div
        v-for="s in segments"
        :key="s.key"
        class="flex min-w-0 items-center overflow-visible rounded px-2 text-[11px] font-semibold transition-opacity"
        :class="[s.fill, s.ink, hover && hover !== s.key ? 'opacity-50' : '']"
        :style="{ flexGrow: s.value, flexBasis: 0 }"
        :title="`${s.name}: ${money(s.value)} (${pct(s.value)}%)`"
        @pointerenter="hover = s.key"
        @pointerleave="hover = null"
      >
        <span v-if="pct(s.value) >= 9" class="whitespace-nowrap">{{ pct(s.value) }}%</span>
      </div>
    </div>
    <!-- Legend: names only, in block order. -->
    <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <li v-for="s in segments" :key="s.key" class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-sm" :class="s.fill" />{{ s.name }}
      </li>
    </ul>

    <table class="mt-5 w-full text-sm">
      <thead class="sr-only">
        <tr><th>Category</th><th>Spent</th><th>Share</th><th>Change vs {{ previousLabel }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in ranked" :key="r.category.id" class="group" @pointerenter="hover = slotOf(r.category.id) === 'bg-other' ? 'other' : String(r.category.id)" @pointerleave="hover = null">
          <td class="w-full py-2 pr-4">
            <div class="mb-1.5 flex items-baseline justify-between gap-3">
              <span class="flex min-w-0 items-center gap-2 truncate">
                <span class="size-2.5 shrink-0 rounded-sm" :class="slotOf(r.category.id)" aria-hidden="true" />
                {{ r.category.emoji }} {{ r.category.name }}
              </span>
            </div>
            <div class="h-1.5 rounded-full bg-track">
              <div class="h-1.5 rounded-full bg-bar" :style="{ width: `${Math.max(2, (r.spent / max) * 100)}%` }" />
            </div>
          </td>
          <td class="py-2 text-right font-semibold whitespace-nowrap tabular-nums">{{ moneyRound(r.spent) }}</td>
          <td class="w-16 py-2 pl-3 text-right text-ink-3 tabular-nums">{{ pct(r.spent) }}%</td>
          <td class="hidden w-28 py-2 pl-3 text-right text-xs whitespace-nowrap tabular-nums sm:table-cell">
            <span v-if="!r.previous" class="text-ink-3">new</span>
            <!-- Spending more is bad news here: red with ▲, green with ▼. -->
            <span v-else :class="r.spent > r.previous ? 'text-critical' : r.spent < r.previous ? 'text-good-ink' : 'text-ink-3'">
              {{ r.spent > r.previous ? '▲' : r.spent < r.previous ? '▼' : '' }} {{ moneySigned(r.spent - r.previous) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
