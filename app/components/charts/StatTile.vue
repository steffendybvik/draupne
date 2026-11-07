<script setup lang="ts">
/** A headline figure: label, value, and an optional signed change against a named period. */
defineProps<{
  label: string
  value: string
  /** e.g. "+12% vs October" */
  delta?: string
  /** Whether the change is good news; colours the delta and picks the arrow's meaning. */
  tone?: 'good' | 'bad' | 'neutral'
  hint?: string
}>()
</script>

<template>
  <div class="card p-4">
    <p class="text-xs font-medium text-ink-2">{{ label }}</p>
    <p class="mt-1 truncate text-2xl font-semibold tracking-tight">{{ value }}</p>
    <p
      v-if="delta"
      class="mt-1 text-xs font-medium"
      :class="tone === 'good' ? 'text-good-ink' : tone === 'bad' ? 'text-critical' : 'text-ink-3'"
    >
      {{ delta }}
    </p>
    <p v-else-if="hint" class="mt-1 text-xs text-ink-3">{{ hint }}</p>
  </div>
</template>
