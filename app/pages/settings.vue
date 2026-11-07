<script setup lang="ts">
const { settings } = useSettings()
const message = ref('')
const failed = ref(false)
const fileInput = ref<HTMLInputElement>()
// What "Replace my data" will do once confirmed: a JSON backup, a .sqlite file, or the sample data.
// shallowRef keeps the parsed file a plain object (a deep reactive proxy can't cross to the worker).
const pendingReplace = shallowRef<{ label: string, run: () => Promise<void> } | null>(null)

const CURRENCIES = ['NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD', 'CHF']

const totals = useLiveQuery(null, () => counts(), { transactions: 0, categories: 0, accounts: 0 })

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

function save(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

async function downloadJson() {
  const backup = await exportBackup()
  save(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `draupne-${todayISO()}.json`)
  say(`Exported ${backup.transactions.length} transactions as JSON.`)
}

async function downloadDatabase() {
  const bytes = await dbExport()
  save(new Blob([bytes as BlobPart], { type: 'application/vnd.sqlite3' }), `draupne-${todayISO()}.sqlite`)
  say('Exported the database. It opens in any SQLite tool.')
}

/** A backup can be either file: SQLite files start with "SQLite format 3". */
async function pick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(bytes.slice(0, 15)) === 'SQLite format 3') {
    pendingReplace.value = { label: file.name, run: () => dbImport(bytes) }
    return say('')
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes))
    pendingReplace.value = { label: file.name, run: () => importBackup(data) }
    say('')
  } catch {
    say('That file is neither a Draupne backup nor a database.', true)
  }
}

function askSample() {
  pendingReplace.value = {
    label: 'sample data',
    run: async () => {
      await loadSampleData()
      settings.value.currency = 'EUR'
    },
  }
  say('')
}

async function replace() {
  const job = pendingReplace.value
  pendingReplace.value = null
  if (!job) return
  try {
    await job.run()
    say(job.label === 'sample data' ? 'Sample data loaded: September 2025 to today, in EUR.' : 'Backup restored.')
  } catch (e) {
    say((e as Error).message, true)
  }
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
      <div class="card space-y-3 p-4">
        <p class="text-sm text-ink-2">
          {{ totals.transactions }} transactions in {{ totals.accounts }} accounts and {{ totals.categories }} categories,
          in a SQLite database stored only on this device.
          <span v-if="dbState.status === 'ready' && !dbState.persistent" class="font-medium text-critical">
            This browser can't keep it between visits, so export a backup before you close it.
          </span>
        </p>
        <div class="grid grid-cols-2 gap-2">
          <button class="rounded-xl bg-accent py-2.5 text-sm font-semibold text-white dark:text-black" @click="downloadJson">Export backup</button>
          <button class="rounded-xl bg-raised py-2.5 text-sm font-semibold text-accent ring-1 ring-line" @click="fileInput?.click()">Import backup</button>
          <button class="rounded-xl bg-raised py-2.5 text-sm font-semibold text-accent ring-1 ring-line" @click="downloadDatabase">Export .sqlite</button>
          <button class="rounded-xl bg-raised py-2.5 text-sm font-semibold text-accent ring-1 ring-line" @click="askSample">Load sample data</button>
        </div>
        <p class="text-xs text-ink-3">Import takes a JSON backup or a .sqlite file. The .sqlite export opens in any SQLite tool.</p>
        <input ref="fileInput" type="file" accept="application/json,.json,.sqlite,.sqlite3,.db" class="hidden" @change="pick">

        <div v-if="pendingReplace" class="rounded-xl bg-critical/10 p-3 text-sm">
          <p>Loading <b>{{ pendingReplace.label }}</b> replaces everything on this device. Export a backup first if you want to keep it.</p>
          <div class="mt-2 flex justify-end gap-2">
            <button class="rounded-lg px-3 py-1.5 text-ink-2" @click="pendingReplace = null">Cancel</button>
            <button class="rounded-lg bg-critical px-3 py-1.5 font-semibold text-white" @click="replace">Replace my data</button>
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
