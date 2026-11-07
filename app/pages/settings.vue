<script setup lang="ts">
const { settings } = useSettings()
const message = ref('')
const failed = ref(false)
const fileInput = ref<HTMLInputElement>()
// shallowRef: a deep reactive proxy of the parsed file can't be stored in IndexedDB (DataCloneError).
const confirmImport = shallowRef<unknown>(null)

const CURRENCIES = ['NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD', 'CHF']

const counts = useLiveQuery(null, async () => ({
  transactions: await db.transactions.count(),
  categories: await db.categories.count(),
}), { transactions: 0, categories: 0 })

const installed = ref(false)
onMounted(() => {
  installed.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  // Ask the browser not to clear our data under storage pressure.
  navigator.storage?.persist?.()
})

function say(text: string, error = false) {
  message.value = text
  failed.value = error
}

async function download() {
  const backup = await exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `draupne-${todayISO()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  say(`Exported ${backup.transactions.length} transactions.`)
}

async function pick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    confirmImport.value = JSON.parse(await file.text())
    say('')
  } catch {
    say('That file is not valid JSON.', true)
  }
  ;(event.target as HTMLInputElement).value = ''
}

async function restore() {
  try {
    await importBackup(confirmImport.value)
    say('Backup restored.')
  } catch (e) {
    say((e as Error).message, true)
  }
  confirmImport.value = null
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>

    <section>
      <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">Currency</h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="c in CURRENCIES"
          :key="c"
          class="rounded-full px-4 py-2 text-sm font-medium ring-1"
          :class="settings.currency === c ? 'bg-accent text-white ring-accent dark:text-black' : 'bg-card ring-line'"
          @click="settings.currency = c"
        >
          {{ c }}
        </button>
      </div>
    </section>

    <section>
      <h2 class="mb-2 px-1 text-sm font-medium text-ink-2">Your data</h2>
      <div class="space-y-3 card p-4">
        <p class="text-sm text-ink-2">
          {{ counts.transactions }} transactions in {{ counts.categories }} categories, stored only on this device.
          Export a backup now and then, and import it to move to another device.
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button class="rounded-xl bg-accent py-2.5 text-sm font-semibold text-white dark:text-black" @click="download">Export backup</button>
          <button class="rounded-xl bg-raised py-2.5 text-sm font-semibold text-accent ring-1 ring-line" @click="fileInput?.click()">Import backup</button>
        </div>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="pick">

        <div v-if="confirmImport" class="rounded-xl bg-critical/10 p-3 text-sm">
          <p>Importing replaces everything on this device with the backup.</p>
          <div class="mt-2 flex justify-end gap-2">
            <button class="rounded-lg px-3 py-1.5 text-ink-2" @click="confirmImport = null">Cancel</button>
            <button class="rounded-lg bg-critical px-3 py-1.5 font-semibold text-white" @click="restore">Replace my data</button>
          </div>
        </div>
        <p v-if="message" role="status" class="text-sm" :class="failed ? 'text-critical' : 'text-good-ink'">{{ message }}</p>
      </div>
    </section>

    <section v-if="!installed" class="rounded-2xl bg-accent-soft/40 p-4 text-sm ring-1 ring-line">
      <p class="font-medium">Add Draupne to your home screen</p>
      <p class="mt-1 text-ink-2">
        On iPhone: Share → Add to Home Screen. It then opens full screen, works offline, and Safari keeps your data.
      </p>
    </section>

    <p class="text-center text-xs text-ink-3">Draupne · everything stays on your device</p>
  </div>
</template>
