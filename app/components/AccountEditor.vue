<script setup lang="ts">
import type { AccountType } from '~/utils/db'

const form = defineModel<{ name: string, emoji: string, type: AccountType, opening: string }>({ required: true })
defineProps<{ uses?: number, confirmDelete?: boolean, isNew?: boolean }>()
defineEmits<{ save: [], cancel: [], delete: [] }>()
const { settings } = useSettings()
</script>

<template>
  <form class="space-y-3" @submit.prevent="$emit('save')">
    <div class="flex gap-2">
      <input v-model="form.emoji" aria-label="Emoji" maxlength="4" class="w-14 rounded-xl bg-raised px-2 py-2 text-center text-xl ring-1 ring-line outline-none focus:ring-accent">
      <input v-model="form.name" aria-label="Name" placeholder="Account name" required class="min-w-0 flex-1 rounded-xl bg-raised px-3 py-2 ring-1 ring-line outline-none focus:ring-accent">
    </div>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="t in ACCOUNT_TYPES"
        :key="t.type"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition"
        :class="form.type === t.type ? 'bg-accent text-white ring-accent dark:text-black' : 'bg-raised ring-line'"
        @click="form.type = t.type"
      >
        {{ t.emoji }} {{ t.label }}
      </button>
    </div>
    <label class="flex items-center gap-2 rounded-xl bg-raised px-3 py-2 ring-1 ring-line focus-within:ring-accent">
      <span class="text-sm text-ink-2">Starting balance</span>
      <input v-model="form.opening" inputmode="decimal" placeholder="0" class="min-w-0 flex-1 bg-transparent text-right outline-none placeholder:text-ink-3">
      <span class="text-sm text-ink-3">{{ settings.currency }}</span>
    </label>
    <p class="text-xs text-ink-3">What was in it before you started tracking here.</p>
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
