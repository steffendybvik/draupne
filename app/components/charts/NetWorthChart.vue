<script setup lang="ts">
import type { AccountState } from '~/composables/useAccounts'

/** Net worth at each month's end: one series, a line with a light wash. Crosshair shows the split. */
const props = defineProps<{ months: { month: string, total: number, rows: AccountState[] }[] }>()
const { money, moneyAxis } = useSettings()

const root = ref<HTMLElement>()
const width = useElementWidth(root)
const height = 220
const pad = { top: 14, right: 16, bottom: 26, left: 48 }

const ticks = computed(() => niceTicksSigned(Math.min(0, ...props.months.map((m) => m.total)), Math.max(1, ...props.months.map((m) => m.total))))
const yMin = computed(() => ticks.value[0]!)
const yMax = computed(() => ticks.value.at(-1)!)
const innerW = computed(() => Math.max(10, width.value - pad.left - pad.right))
const innerH = height - pad.top - pad.bottom
const x = (i: number) => pad.left + (props.months.length <= 1 ? innerW.value / 2 : (i / (props.months.length - 1)) * innerW.value)
const y = (v: number) => pad.top + ((yMax.value - v) / (yMax.value - yMin.value || 1)) * innerH

const line = computed(() => props.months.map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(m.total).toFixed(1)}`).join(' '))
const area = computed(() => props.months.length ? `${line.value} L${x(props.months.length - 1)},${y(Math.max(0, yMin.value))} L${x(0)},${y(Math.max(0, yMin.value))} Z` : '')
const last = computed(() => props.months.length - 1)

const hover = ref<number | null>(null)
function onMove(e: PointerEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const px = e.clientX - rect.left - pad.left
  hover.value = Math.min(props.months.length - 1, Math.max(0, Math.round((px / innerW.value) * (props.months.length - 1))))
}
const tip = computed(() => {
  if (hover.value === null) return null
  const m = props.months[hover.value]!
  return { ...m, left: Math.min(Math.max(0, x(hover.value) + 12), width.value - 200), rows: m.rows.filter((r) => r.value) }
})
const showMonth = (i: number) => innerW.value / Math.max(1, props.months.length) >= 34 || i % 2 === last.value % 2
</script>

<template>
  <div ref="root" class="relative w-full min-w-0 overflow-hidden">
    <svg
      :width="width"
      :height="height"
      class="block touch-pan-y select-none"
      role="img"
      :aria-label="`Net worth over ${months.length} months, now ${money(months.at(-1)?.total ?? 0)}`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <g class="text-[11px] tabular-nums" fill="var(--color-ink-3)">
        <template v-for="t in ticks" :key="t">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" :stroke="t === 0 ? 'var(--color-axis)' : 'var(--color-grid)'" stroke-width="1" />
          <text :x="pad.left - 8" :y="y(t)" text-anchor="end" dominant-baseline="middle">{{ moneyAxis(t) }}</text>
        </template>
        <template v-for="(m, i) in months" :key="m.month">
          <text v-if="showMonth(i)" :x="x(i)" :y="height - 6" text-anchor="middle">{{ monthShort(m.month) }}</text>
        </template>
      </g>
      <path :d="area" fill="var(--color-s1)" fill-opacity="0.1" />
      <path :d="line" fill="none" stroke="var(--color-s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-if="months.length" :cx="x(last)" :cy="y(months[last]!.total)" r="4.5" fill="var(--color-s1)" stroke="var(--color-card)" stroke-width="2" />
      <g v-if="hover !== null">
        <line :x1="x(hover)" :x2="x(hover)" :y1="pad.top" :y2="pad.top + innerH" stroke="var(--color-axis)" stroke-width="1" />
        <circle :cx="x(hover)" :cy="y(months[hover]!.total)" r="4" fill="var(--color-s1)" stroke="var(--color-card)" stroke-width="2" />
      </g>
    </svg>
    <div v-if="tip" class="pointer-events-none absolute top-2 w-48 rounded-xl bg-card p-2.5 text-xs shadow-lg ring-1 ring-line" :style="{ left: `${tip.left}px` }">
      <p class="text-ink-3">End of {{ monthShort(tip.month, true) }}</p>
      <p class="mb-1 text-sm font-semibold tabular-nums">{{ money(tip.total) }}</p>
      <p v-for="r in tip.rows" :key="r.account.id" class="flex justify-between gap-2 text-ink-2">
        <span class="truncate">{{ r.account.emoji }} {{ r.account.name }}</span><span class="tabular-nums">{{ moneyAxis(r.value) }}</span>
      </p>
    </div>
  </div>
</template>
