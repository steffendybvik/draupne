import type { WatchSource } from 'vue'

/**
 * A database query as a Vue ref. It re-runs when `source` (what it depends on, like the month) changes
 * and after every write to the database. Only the newest run's result is kept.
 */
export function useLiveQuery<T, S = null>(
  source: WatchSource<S> | null,
  query: (input: S) => Promise<T>,
  initial: T,
) {
  const value = shallowRef(initial) as Ref<T>
  let token = 0

  const refresh = async (input: S) => {
    const mine = ++token
    try {
      const result = await query(input)
      if (mine === token) value.value = result
    } catch (e) {
      console.error('[draupne] query failed', e)
    }
  }

  watch(
    () => [source ? toValue(source) : null, dbVersion.value] as const,
    ([input]) => refresh(input as S),
    { immediate: true },
  )
  return value
}
