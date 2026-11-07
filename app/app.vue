<script setup lang="ts">
useShortcuts()
const { label } = useMonth()
</script>

<template>
  <!-- Desktop title bar (only with window-controls-overlay); the rest of it is a drag handle. -->
  <div class="titlebar items-center gap-3 border-b border-line bg-card/80 px-3 text-sm backdrop-blur-xl">
    <span class="font-semibold">Draupne</span>
    <span class="text-ink-3 first-letter:uppercase">{{ label }}</span>
  </div>

  <div class="below-titlebar md:flex md:min-h-dvh">
    <SideNav class="hidden md:flex" />
    <main class="mx-auto w-full max-w-xl px-4 pt-safe pb-28 md:max-w-6xl md:px-8 md:pt-8 md:pb-12">
      <NuxtPage />
    </main>
  </div>
  <BottomNav class="md:hidden" />
</template>
