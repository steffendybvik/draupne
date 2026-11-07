/**
 * Opens the SQLite database as the app starts, and brings over data from the old IndexedDB store once.
 * In development an empty database gets the sample data, so there's always something to look at.
 */
export default defineNuxtPlugin(async () => {
  try {
    await migrateFromIndexedDB()
  } catch (e) {
    console.error('[draupne] moving IndexedDB data failed', e)
  }
  if (import.meta.dev) {
    try {
      if ((await counts()).transactions === 0) {
        await loadSampleData()
        const { settings } = useSettings()
        settings.value.currency = 'EUR'
        console.info('[draupne] dev: empty database, loaded the sample data')
      }
    } catch (e) {
      console.error('[draupne] dev: seeding sample data failed', e)
    }
  }
})
