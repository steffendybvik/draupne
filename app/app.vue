<script setup lang="ts">
useShortcuts()
const { label } = useMonth()
const reloadPage = () => location.reload()
</script>

<template>
  <!-- Desktop title bar (only with window-controls-overlay); the rest of it is a drag handle. -->
  <div class="titlebar items-center gap-3 border-b border-line bg-card/80 px-3 text-sm backdrop-blur-xl">
    <span class="font-semibold">Draupne</span>
    <span class="text-ink-3 first-letter:uppercase">{{ label }}</span>
  </div>

  <!-- The database couldn't open: most often the app is already open in another window. -->
  <div v-if="dbState.status === 'failed'" class="fixed inset-x-0 top-0 z-50 flex justify-center p-3">
    <div role="alert" class="card max-w-md p-4 text-sm">
      <p class="font-semibold">{{ dbState.busy ? 'Draupne is open in another window' : 'Your data couldn\'t be opened' }}</p>
      <p class="mt-1 text-ink-2">
        {{ dbState.busy ? 'Only one window can use the database at a time. Close the other one, then reload.' : dbState.message }}
      </p>
      <button class="mt-3 rounded-lg bg-accent px-3 py-1.5 font-semibold text-white dark:text-black" @click="reloadPage">Reload</button>
    </div>
  </div>

  <div class="below-titlebar md:flex md:min-h-dvh">
    <SideNav class="hidden md:flex" />
    <main class="mx-auto w-full max-w-xl px-4 pt-safe pb-28 md:max-w-6xl md:px-8 md:pt-8 md:pb-12">
      <NuxtPage />
    </main>
  </div>
  <BottomNav class="md:hidden" />
</template>
