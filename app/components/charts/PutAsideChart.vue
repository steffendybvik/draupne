<script setup lang="ts">
/**
 * Money put aside per month, stacked: savings (slot 1) under investing (slot 2), 2px surface gap between.
 * An optional target draws as a hairline.
 */
const props = defineProps<{ months: { month: string, savings: number, investing: number }[], target?: number }>()
const { money, moneyAxis } = useSettings()

const root = ref<HTMLElement>()
const width = useElementWidth(root)
const height = 200
const pad = { top: 14, right: 12, bottom: 26, left: 44 }

const totals = computed(() => props.months.map((m) => Math.max(0, m.savings) + Math.max(0, m.investing)))
const ticks = computed(() => niceTicks(Math.max(1, ...totals.value, props.target ?? 0)))
const yMax = computed(() => ticks.value.at(-1) || 1)
const innerW = computed(() => Math.max(10, width.value - pad.left - pad.right))
const innerH = height - pad.top - pad.bottom
const y = (v: number) => pad.top + innerH - (v / yMax.value) * innerH
const band = computed(() => innerW.value / Math.max(1, props.months.length))
const barW = computed(() => Math.min(24, band.value * 0.6))

const bars = computed(() => props.months.map((m, i) => {
  const cx = pad.left + band.value * (i + 0.5)
  const s = Math.max(0, m.savings)
  const inv = Math.max(0, m.investing)
  const x0 = cx - barW.value / 2
  const base = y(0)
  const top = y(s + inv)
  // Rounded data-end on whichever segment is on top; the lower one is square, with a 2px gap.
  const savingsPath = inv > 0 ? rectPath(x0, barW.value, y(s), base) : barPath(x0, barW.value, base, y(s))
  const investPath = inv > 0 ? barPath(x0, barW.value, s > 0 ? y(s) - 2 : base, top) : ''
  return { ...m, cx, savingsPath, investPath }
}))
function rectPath(x: number, w: number, top: number, bottom: number) {
  return bottom - top < 0.5 ? '' : `M${x},${bottom} V${top} H${x + w} V${bottom} Z`
}

const hover = ref<number | null>(null)
const tip = computed(() => {
  if (hover.value === null) return null
  const b = bars.value[hover.value]!
  return { ...b, left: Math.min(Math.max(0, b.cx - 80), width.value - 160) }
})
</script>

<template>
  <div ref="root" class="relative w-full min-w-0 overflow-hidden">
    <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-s1" />Savings</span>
      <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-s2" />Investing</span>
      <span v-if="target" class="flex items-center gap-1.5"><span class="h-px w-4 bg-ink-3" />Target</span>
    </div>
    <svg :width="width" :height="height" class="block select-none" role="img" aria-label="Saved and invested per month" @pointerleave="hover = null">
      <g class="text-[11px] tabular-nums" fill="var(--color-ink-3)">
        <template v-for="t in ticks" :key="t">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" :stroke="t === 0 ? 'var(--color-axis)' : 'var(--color-grid)'" stroke-width="1" />
          <text :x="pad.left - 8" :y="y(t)" text-anchor="end" dominant-baseline="middle">{{ moneyAxis(t) }}</text>
        </template>
      </g>
      <g v-for="(b, i) in bars" :key="b.month">
        <rect
          :x="b.cx - band / 2" :y="pad.top" :width="band" :height="innerH" fill="transparent" tabindex="0" class="outline-none"
          :aria-label="`${monthShort(b.month, true)}: savings ${money(b.savings)}, investing ${money(b.investing)}`"
          @pointerenter="hover = i" @focus="hover = i" @blur="hover = null"
        />
        <rect v-if="hover === i" :x="b.cx - band / 2 + 2" :y="pad.top" :width="band - 4" :height="innerH" rx="6" fill="var(--color-ink)" fill-opacity="0.04" class="pointer-events-none" />
        <path :d="b.savingsPath" fill="var(--color-s1)" class="pointer-events-none" />
        <path :d="b.investPath" fill="var(--color-s2)" class="pointer-events-none" />
        <text v-if="band >= 34 || i % 2 === (bars.length - 1) % 2" :x="b.cx" :y="height - 6" text-anchor="middle" class="pointer-events-none text-[11px]" fill="var(--color-ink-3)">{{ monthShort(b.month) }}</text>
      </g>
      <g v-if="target" class="pointer-events-none">
        <line :x1="pad.left" :x2="width - pad.right" :y1="y(target)" :y2="y(target)" stroke="var(--color-ink-2)" stroke-width="1" />
      </g>
    </svg>
    <div v-if="tip" class="pointer-events-none absolute top-6 w-40 rounded-xl bg-card p-2.5 text-xs shadow-lg ring-1 ring-line" :style="{ left: `${tip.left}px` }">
      <p class="mb-1 text-ink-3">{{ monthShort(tip.month, true) }}</p>
      <p class="text-sm font-semibold tabular-nums">{{ money(tip.savings + tip.investing) }}</p>
      <p class="flex justify-between gap-2 text-ink-2"><span class="flex items-center gap-1.5"><span class="h-0.5 w-3 rounded-full bg-s1" />Savings</span><span class="tabular-nums">{{ money(tip.savings) }}</span></p>
      <p class="flex justify-between gap-2 text-ink-2"><span class="flex items-center gap-1.5"><span class="h-0.5 w-3 rounded-full bg-s2" />Investing</span><span class="tabular-nums">{{ money(tip.investing) }}</span></p>
    </div>
  </div>
</template>
