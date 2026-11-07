<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/20/solid'

const { label, prev, next, reset, isCurrent } = useMonth()
</script>

<template>
  <div class="card flex items-center justify-between p-1">
    <button class="rounded-xl p-2 text-ink-2 transition hover:bg-raised active:bg-raised" aria-label="Previous month" title="Previous month (←)" @click="prev">
      <ChevronLeftIcon class="size-5" aria-hidden="true" />
    </button>
    <button class="min-w-0 px-2 text-center" :title="isCurrent ? undefined : 'Back to this month'" @click="reset">
      <span class="block truncate font-semibold first-letter:uppercase">{{ label }}</span>
      <span v-if="!isCurrent" class="block text-[11px] text-accent">Back to this month</span>
    </button>
    <button class="rounded-xl p-2 text-ink-2 transition hover:bg-raised active:bg-raised" aria-label="Next month" title="Next month (→)" @click="next">
      <ChevronRightIcon class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
