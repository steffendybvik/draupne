/** The month being viewed, `YYYY-MM`, shared across pages. */
export function useMonth() {
  const month = useState('month', () => todayISO().slice(0, 7))
  const label = computed(() => {
    const [y, m] = month.value.split('-').map(Number) as [number, number]
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  })
  const isCurrent = computed(() => month.value === todayISO().slice(0, 7))
  return {
    month,
    label,
    isCurrent,
    prev: () => { month.value = shiftMonth(month.value, -1) },
    next: () => { month.value = shiftMonth(month.value, 1) },
    reset: () => { month.value = todayISO().slice(0, 7) },
  }
}
