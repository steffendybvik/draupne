<script setup lang="ts">
const route = useRoute()
const tabs = [
  { to: '/', label: 'Month', icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/budgets', label: 'Budgets', icon: 'M12 3v9l7 4M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z' },
  { to: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4' },
]
</script>

<template>
  <NuxtLink
    v-if="route.path !== '/add'"
    to="/add"
    aria-label="Add transaction"
    class="fixed right-[max(1rem,calc(50%-18rem+1rem))] bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-black/20 active:scale-95 dark:text-black"
  >
    <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  </NuxtLink>

  <nav class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/90 pb-safe backdrop-blur-lg">
    <div class="mx-auto grid max-w-xl grid-cols-3 pt-2">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-col items-center gap-0.5 text-xs"
        :class="route.path === tab.to ? 'text-accent' : 'text-ink-3'"
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="tab.icon" /></svg>
        {{ tab.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
