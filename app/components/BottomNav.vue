<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div>
    <NuxtLink
      v-if="route.path !== '/add'"
      to="/add"
      aria-label="Add transaction"
      class="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 flex size-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/40 transition active:scale-95 dark:text-black"
    >
      <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </NuxtLink>

    <!-- A floating frosted bar, like the system's own tab bars. -->
    <nav class="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-20 mx-auto max-w-md rounded-2xl border border-line/70 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-xl">
      <div class="grid grid-cols-5 py-1.5">
        <NuxtLink
          v-for="tab in TABS"
          :key="tab.to"
          :to="tab.to"
          class="flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-medium transition"
          :class="route.path === tab.to ? 'text-accent' : 'text-ink-3'"
        >
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="tab.icon" /></svg>
          {{ tab.label }}
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
