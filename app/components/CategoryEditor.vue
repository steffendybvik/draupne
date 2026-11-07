<script setup lang="ts">
import type { Kind } from '~/utils/db'

const form = defineModel<{ name: string, emoji: string, budget: string, kind: Kind }>({ required: true })
defineProps<{ uses?: number, confirmDelete?: boolean, isNew?: boolean }>()
defineEmits<{ save: [], cancel: [], delete: [] }>()
const { settings } = useSettings()
</script>

<template>
  <form class="space-y-3 bg-surface/60 px-4 py-4" @submit.prevent="$emit('save')">
    <div class="flex gap-2">
      <input v-model="form.emoji" aria-label="Emoji" maxlength="4" class="w-14 rounded-xl bg-card px-2 py-2 text-center text-xl ring-1 ring-line outline-none focus:ring-accent">
      <input v-model="form.name" aria-label="Name" placeholder="Name" required class="min-w-0 flex-1 rounded-xl bg-card px-3 py-2 ring-1 ring-line outline-none focus:ring-accent">
    </div>
    <label v-if="form.kind === 'expense'" class="flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-line focus-within:ring-accent">
      <span class="text-sm text-ink-2">Monthly budget</span>
      <input v-model="form.budget" inputmode="decimal" placeholder="None" class="min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-ink-3">
      <span class="text-sm text-ink-3">{{ settings.currency }}</span>
    </label>
    <div class="flex items-center gap-2">
      <button
        v-if="!isNew"
        type="button"
        class="rounded-xl px-3 py-2 text-sm text-critical disabled:text-ink-3"
        :disabled="!!uses"
        :title="uses ? `Used by ${uses} transactions, so it can't be deleted` : undefined"
        @click="$emit('delete')"
      >
        {{ uses ? `In use (${uses})` : confirmDelete ? 'Tap again to delete' : 'Delete' }}
      </button>
      <span class="flex-1" />
      <button type="button" class="rounded-xl px-3 py-2 text-sm text-ink-2" @click="$emit('cancel')">Cancel</button>
      <button type="submit" class="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white dark:text-black">Save</button>
    </div>
  </form>
</template>
