/** Opens the SQLite database as the app starts, and brings over data from the old IndexedDB store once. */
export default defineNuxtPlugin(() => {
  migrateFromIndexedDB().catch((e) => console.error('[draupne] moving IndexedDB data failed', e))
})
