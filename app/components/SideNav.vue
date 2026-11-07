<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/20/solid'
const route = useRoute()
const isMac = import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform)
</script>

<template>
  <aside class="sticky top-0 h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-card/60 px-3 py-6 backdrop-blur-xl">
    <div class="mb-6 flex items-center gap-2.5 px-2">
      <img src="/logo.svg" alt="" class="size-7 rounded-lg">
      <span class="text-[15px] font-semibold tracking-tight">Draupne</span>
    </div>

    <NuxtLink
      to="/add"
      class="mb-4 flex items-center justify-between rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 transition hover:brightness-110 active:scale-[0.98] dark:text-black"
    >
      <span class="flex items-center gap-2">
        <PlusIcon class="size-4" aria-hidden="true" />
        New transaction
      </span>
      <kbd class="rounded bg-white/20 px-1.5 text-[11px] font-medium dark:bg-black/15">N</kbd>
    </NuxtLink>

    <NuxtLink
      v-for="(tab, i) in TABS"
      :key="tab.to"
      :to="tab.to"
      class="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition"
      :class="route.path === tab.to ? 'bg-accent/10 font-medium text-accent' : 'text-ink-2 hover:bg-ink/5 hover:text-ink'"
    >
      <component :is="route.path === tab.to ? tab.active : tab.icon" class="size-5" aria-hidden="true" />
      <span class="flex-1">{{ tab.label }}</span>
      <kbd class="text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100">{{ isMac ? '⌘' : 'Ctrl ' }}{{ i + 1 }}</kbd>
    </NuxtLink>

    <p class="mt-auto px-2 text-xs leading-relaxed text-ink-3">
      ← → step months<br>Stored only on this device
    </p>
  </aside>
</template>
