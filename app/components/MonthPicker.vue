<script setup lang="ts">
const { label, prev, next, reset, isCurrent } = useMonth()
</script>

<template>
  <div class="flex items-center justify-between">
    <button class="rounded-full p-2 text-ink-2 active:bg-line" aria-label="Previous month" @click="prev">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <button class="text-center" @click="reset">
      <span class="block text-lg font-semibold first-letter:uppercase">{{ label }}</span>
      <span v-if="!isCurrent" class="block text-xs text-accent">Back to this month</span>
    </button>
    <button class="rounded-full p-2 text-ink-2 active:bg-line" aria-label="Next month" @click="next">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  </div>
</template>
