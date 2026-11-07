<script setup lang="ts">
const props = defineProps<{ spent: number, budget: number }>()
const { moneyRound } = useSettings()

const ratio = computed(() => props.spent / props.budget)
// Fill carries severity; status always comes with an icon and words, never colour alone.
const status = computed(() => {
  if (ratio.value > 1) return { fill: 'bg-critical', icon: '⛔', text: `${moneyRound(props.spent - props.budget)} over` }
  if (ratio.value >= 0.85) return { fill: 'bg-warning', icon: '⚠️', text: `${moneyRound(props.budget - props.spent)} left` }
  return { fill: 'bg-bar', icon: '', text: `${moneyRound(props.budget - props.spent)} left` }
})
</script>

<template>
  <div>
    <div
      class="h-2 rounded-full bg-track"
      role="meter"
      :aria-valuenow="spent"
      :aria-valuemax="budget"
      aria-valuemin="0"
      :aria-label="status.text"
    >
      <div class="h-2 rounded-full" :class="status.fill" :style="{ width: `${Math.min(100, Math.max(ratio * 100, ratio > 0 ? 2 : 0))}%` }" />
    </div>
    <div class="mt-1 flex justify-between text-xs text-ink-2">
      <span class="tabular-nums">{{ moneyRound(spent) }} of {{ moneyRound(budget) }}</span>
      <span :class="ratio > 1 ? 'font-medium text-critical' : ''"><span v-if="status.icon" aria-hidden="true">{{ status.icon }} </span>{{ status.text }}</span>
    </div>
  </div>
</template>
