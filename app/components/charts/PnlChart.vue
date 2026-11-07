<script setup lang="ts">
import type { MonthTotals } from '~/composables/useHistory'

/**
 * Monthly profit and loss: one column per month, up from zero for a win, down for a loss.
 * Diverging colours (blue win, red loss), plus the sign and words in labels and tooltip.
 */
const props = defineProps<{
  months: MonthTotals[]
  /** The month being viewed; its column gets the value label. */
  selected?: string
  average?: number
}>()
const emit = defineEmits<{ select: [month: string] }>()
const { moneySigned, moneyAxis, money } = useSettings()

const root = ref<HTMLElement>()
const width = useElementWidth(root)
const height = 240
const pad = { top: 22, right: 12, bottom: 26, left: 48 }

const ticks = computed(() => niceTicksSigned(Math.min(0, ...props.months.map((m) => m.net)), Math.max(1, ...props.months.map((m) => m.net))))
const yMin = computed(() => ticks.value[0]!)
const yMax = computed(() => ticks.value.at(-1)!)
const innerW = computed(() => Math.max(10, width.value - pad.left - pad.right))
const innerH = height - pad.top - pad.bottom
const y = (v: number) => pad.top + ((yMax.value - v) / (yMax.value - yMin.value || 1)) * innerH

const band = computed(() => innerW.value / Math.max(1, props.months.length))
const barW = computed(() => Math.min(24, band.value * 0.6))
const bars = computed(() => props.months.map((m, i) => {
  const cx = pad.left + band.value * (i + 0.5)
  return {
    ...m,
    cx,
    path: barPath(cx - barW.value / 2, barW.value, y(0), y(m.net)),
    fill: m.net >= 0 ? 'var(--color-pos)' : 'var(--color-neg)',
  }
}))

const hover = ref<number | null>(null)
const tip = computed(() => {
  if (hover.value === null) return null
  const b = bars.value[hover.value]!
  return { ...b, left: Math.min(Math.max(0, b.cx - 84), width.value - 168) }
})
const showLabel = (i: number) => bars.value[i]!.month === props.selected || bars.value.length <= 6
</script>

<template>
  <div ref="root" class="relative w-full min-w-0 overflow-hidden">
    <svg
      :width="width"
      :height="height"
      class="block select-none"
      role="img"
      :aria-label="`Monthly profit and loss, ${months.length} months`"
      @pointerleave="hover = null"
    >
      <g class="text-[11px] tabular-nums" fill="var(--color-ink-3)">
        <template v-for="t in ticks" :key="t">
          <line :x1="pad.left" :x2="width - pad.right" :y1="y(t)" :y2="y(t)" :stroke="t === 0 ? 'var(--color-axis)' : 'var(--color-grid)'" stroke-width="1" />
          <text :x="pad.left - 8" :y="y(t)" text-anchor="end" dominant-baseline="middle">{{ t > 0 ? '+' : '' }}{{ moneyAxis(t) }}</text>
        </template>
      </g>

      <g v-for="(b, i) in bars" :key="b.month">
        <!-- Hit target: the whole column band, not just the painted bar. -->
        <rect
          :x="b.cx - band / 2"
          :y="pad.top"
          :width="band"
          :height="innerH"
          fill="transparent"
          class="cursor-pointer outline-none"
          tabindex="0"
          :aria-label="`${monthShort(b.month, true)}: ${b.net >= 0 ? 'win' : 'loss'} ${moneySigned(b.net)}`"
          @pointerenter="hover = i"
          @focus="hover = i"
          @blur="hover = null"
          @click="emit('select', b.month)"
          @keydown.enter="emit('select', b.month)"
        />
        <rect v-if="hover === i" :x="b.cx - band / 2 + 2" :y="pad.top" :width="band - 4" :height="innerH" rx="6" fill="var(--color-ink)" fill-opacity="0.04" class="pointer-events-none" />
        <path :d="b.path" :fill="b.fill" class="pointer-events-none transition-opacity" :opacity="hover === null || hover === i ? 1 : 0.55" />
        <text
          v-if="showLabel(i) && b.count"
          :x="b.cx"
          :y="b.net >= 0 ? y(b.net) - 6 : y(b.net) + 14"
          text-anchor="middle"
          class="pointer-events-none text-[11px] font-semibold tabular-nums"
          fill="var(--color-ink)"
        >
          {{ moneyAxis(b.net) }}
        </text>
        <text
          v-if="band >= 34 || i % 2 === (bars.length - 1) % 2"
          :x="b.cx"
          :y="height - 6"
          text-anchor="middle"
          class="pointer-events-none text-[11px]"
          :fill="b.month === selected ? 'var(--color-ink)' : 'var(--color-ink-3)'"
          :font-weight="b.month === selected ? 600 : 400"
        >
          {{ monthShort(b.month) }}
        </text>
      </g>

      <g v-if="average !== undefined" class="pointer-events-none">
        <line :x1="pad.left" :x2="width - pad.right" :y1="y(average)" :y2="y(average)" stroke="var(--color-ink-2)" stroke-width="1" />
        <text :x="width - pad.right" :y="y(average) - 5" text-anchor="end" class="text-[11px] font-medium" fill="var(--color-ink-2)">avg {{ moneySigned(average) }}</text>
      </g>
    </svg>

    <div
      v-if="tip"
      class="pointer-events-none absolute top-0 w-42 rounded-xl bg-card p-2.5 text-xs shadow-lg ring-1 ring-line"
      :style="{ left: `${tip.left}px` }"
    >
      <p class="mb-1 text-ink-3">{{ monthShort(tip.month, true) }}</p>
      <p class="text-sm font-semibold tabular-nums">{{ moneySigned(tip.net) }} <span class="text-xs font-medium" :class="tip.net >= 0 ? 'text-good-ink' : 'text-critical'">{{ tip.net >= 0 ? '▲ win' : '▼ loss' }}</span></p>
      <p class="mt-1 flex justify-between gap-2 text-ink-2"><span>Income</span><span class="tabular-nums">{{ money(tip.income) }}</span></p>
      <p class="flex justify-between gap-2 text-ink-2"><span>Spent</span><span class="tabular-nums">{{ money(tip.spent) }}</span></p>
    </div>
  </div>
</template>
