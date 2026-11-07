<script setup lang="ts">
const { label, prev, next, reset, isCurrent } = useMonth()
</script>

<template>
  <div class="card flex items-center justify-between p-1">
    <button class="rounded-xl p-2 text-ink-2 transition hover:bg-raised active:bg-raised" aria-label="Previous month" title="Previous month (←)" @click="prev">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <button class="min-w-0 px-2 text-center" :title="isCurrent ? undefined : 'Back to this month'" @click="reset">
      <span class="block truncate font-semibold first-letter:uppercase">{{ label }}</span>
      <span v-if="!isCurrent" class="block text-[11px] text-accent">Back to this month</span>
    </button>
    <button class="rounded-xl p-2 text-ink-2 transition hover:bg-raised active:bg-raised" aria-label="Next month" title="Next month (→)" @click="next">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  </div>
</template>
