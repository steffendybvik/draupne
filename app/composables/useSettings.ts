const KEY = 'draupne:settings'

interface Settings {
  currency: string
}

const defaults: Settings = { currency: 'NOK' }

/** Small preferences in localStorage; finance data stays in IndexedDB. */
export function useSettings() {
  const settings = useState<Settings>('settings', () => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    } catch {
      return { ...defaults }
    }
  })

  watch(settings, (s) => localStorage.setItem(KEY, JSON.stringify(s)), { deep: true })

  const formatter = computed(() => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: settings.value.currency,
    maximumFractionDigits: 2,
  }))
  const compact = computed(() => new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: settings.value.currency,
    maximumFractionDigits: 0,
  }))

  const axis = computed(() => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }))

  return {
    settings,
    /** Compact, no currency, for axis ticks: 12K. */
    moneyAxis: (minor: number) => axis.value.format(Math.round(minor / 100)),
    /** Signed and rounded, for profit/loss: +1 234 kr / −560 kr. */
    moneySigned: (minor: number) => (minor > 0 ? '+' : minor < 0 ? '−' : '') + compact.value.format(Math.abs(Math.round(minor / 100))),
    /** Minor units → "kr 1 234,50" in the device's locale. */
    money: (minor: number) => formatter.value.format(minor / 100),
    /** Rounded to whole units, for headline figures. */
    moneyRound: (minor: number) => compact.value.format(Math.round(minor / 100)),
  }
}
