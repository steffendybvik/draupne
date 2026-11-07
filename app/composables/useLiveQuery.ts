import { liveQuery } from 'dexie'
import type { WatchSource } from 'vue'

/**
 * A Dexie query as a Vue ref that updates whenever the tables it reads change.
 * `source` is what the query depends on (like the month); it re-subscribes when that changes.
 * Dexie runs the query outside Vue's tracking, so the dependency has to be given explicitly.
 */
export function useLiveQuery<T, S = null>(
  source: WatchSource<S> | null,
  query: (input: S) => T | Promise<T>,
  initial: T,
) {
  const value = shallowRef(initial) as Ref<T>
  let sub: { unsubscribe(): void } | undefined

  const subscribe = (input: S) => {
    sub?.unsubscribe()
    sub = liveQuery(() => query(input)).subscribe({
      next: (v) => { value.value = v },
      error: (e) => console.error('[draupne] query failed', e),
    })
  }

  if (source) watch(source, subscribe, { immediate: true })
  else subscribe(null as S)

  onScopeDispose(() => sub?.unsubscribe())
  return value
}
