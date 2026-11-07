<script setup lang="ts">
/**
 * Spending pace: cumulative spend through the month, this month against last month.
 * This month is the story (accent); last month is context (gray). Budget is a hairline reference.
 */
const props = defineProps<{
  current: number[]
  previous: number[]
  currentLabel: string
  previousLabel: string
  /** Total monthly budget, if any categories have one. */
  budget?: number
}>()
const { money, moneyAxis } = useSettings()

const root = ref<HTMLElement>()
const width = useElementWidth(root)
const height = 220
const pad = { top: 12, right: 16, bottom: 26, left: 44 }

const days = computed(() => Math.max(props.current.length, props.previous.length, 28))
const ticks = computed(() => niceTicks(Math.max(1, ...props.current, ...props.previous, props.budget ?? 0)))
const yMax = computed(() => ticks.value.at(-1) || 1)
const innerW = computed(() => Math.max(10, width.value - pad.left - pad.right))
const innerH = height - pad.top - pad.bottom

const x = (i: number) => pad.left + (days.value <= 1 ? 0 : (i / (days.value - 1)) * innerW.value)
const y = (v: number) => pad.top + innerH - (v / yMax.value) * innerH

function line(values: number[]) {
  return values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}
const currentPath = computed(() => line(props.current))
const previousPath = computed(() => line(props.previous))
const areaPath = computed(() => {
  if (!props.current.length) return ''
  return `${currentPath.value} L${x(props.current.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
})
const end = computed(() => {
  const i = props.current.length - 1
  return i >= 0 ? { x: x(i), y: y(props.current[i]!), value: props.current[i]! } : null
})
const xTicks = computed(() => [1, 8, 15, 22, days.value].filter((d, i, a) => a.indexOf(d) === i && d <= days.value))

// Crosshair: snaps to the nearest day.
const hover = ref<number | null>(null)
function onMove(e: PointerEvent) {
  const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
  const px = e.clientX - rect.left - pad.left
  hover.value = Math.min(days.value - 1, Math.max(0, Math.round((px / innerW.value) * (days.value - 1))))
}
const tip = computed(() => {
  if (hover.value === null) return null
  const i = hover.value
  return {
    left: Math.min(x(i) + 12, width.value - 168),
    day: i + 1,
    current: props.current[i],
    previous: props.previous[i],
  }
})
</script>

<template>
  <div ref="root" class="relative w-full min-w-0 overflow-hidden">
    <!-- Legend: two series, so always present; keys mirror the marks (lines). -->
    <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <span class="flex items-center gap-1.5"><span class="h-0.5 w-4 rounded-full bg-s1" />{{ currentLabel }}</span>
      <span class="flex items-center gap-1.5"><span class="h-0.5 w-4 rounded-full bg-other" />{{ previousLabel }}</span>
      <span v-if="budget" class="flex items-center gap-1.5"><span class="h-px w-4 bg-ink-3" />Budget</span>
    </div>

    <svg
      :width="width"
      :height="height"
      class="block touch-pan-y select-none"
      role="img"
      :aria-label="`Spending so far: ${currentLabel} ${money(current.at(-1) ?? 0)}, ${previousLabel} ${money(previous.at(-1) ?? 0)}`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <g class="text-[11px] tabular-nums" fill="var(--color-ink-3)">
        <template v-for="t in ticks" :key="t">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" :stroke="t === 0 ? 'var(--color-axis)' : 'var(--color-grid)'" stroke-width="1" />
          <text :x="pad.left - 8" :y="y(t)" text-anchor="end" dominant-baseline="middle">{{ moneyAxis(t) }}</text>
        </template>
        <text v-for="d in xTicks" :key="d" :x="x(d - 1)" :y="height - 6" text-anchor="middle">{{ d }}</text>
      </g>

      <g v-if="budget">
        <line :x1="pad.left" :x2="width - pad.right" :y1="y(budget)" :y2="y(budget)" stroke="var(--color-ink-3)" stroke-width="1" />
        <text :x="width - pad.right" :y="y(budget) - 5" text-anchor="end" class="text-[11px]" fill="var(--color-ink-2)">Budget {{ moneyAxis(budget) }}</text>
      </g>

      <path :d="previousPath" fill="none" stroke="var(--color-other)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <path :d="areaPath" fill="var(--color-s1)" fill-opacity="0.1" />
      <path :d="currentPath" fill="none" stroke="var(--color-s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-if="end" :cx="end.x" :cy="end.y" r="4.5" fill="var(--color-s1)" stroke="var(--color-card)" stroke-width="2" />

      <g v-if="hover !== null">
        <line :x1="x(hover)" :x2="x(hover)" :y1="pad.top" :y2="y(0)" stroke="var(--color-axis)" stroke-width="1" />
        <circle v-if="current[hover] !== undefined" :cx="x(hover)" :cy="y(current[hover]!)" r="4" fill="var(--color-s1)" stroke="var(--color-card)" stroke-width="2" />
        <circle v-if="previous[hover] !== undefined" :cx="x(hover)" :cy="y(previous[hover]!)" r="4" fill="var(--color-other)" stroke="var(--color-card)" stroke-width="2" />
      </g>
    </svg>

    <div
      v-if="tip"
      class="pointer-events-none absolute top-8 w-40 rounded-xl bg-card p-2.5 text-xs shadow-lg ring-1 ring-line"
      :style="{ left: `${tip.left}px` }"
    >
      <p class="mb-1 text-ink-3">Day {{ tip.day }}</p>
      <p v-if="tip.current !== undefined" class="flex items-center gap-1.5"><span class="h-0.5 w-3 rounded-full bg-s1" /><b class="font-semibold tabular-nums">{{ money(tip.current) }}</b><span class="truncate text-ink-3">{{ currentLabel }}</span></p>
      <p v-if="tip.previous !== undefined" class="flex items-center gap-1.5"><span class="h-0.5 w-3 rounded-full bg-other" /><b class="font-semibold tabular-nums">{{ money(tip.previous) }}</b><span class="truncate text-ink-3">{{ previousLabel }}</span></p>
    </div>
  </div>
</template>
