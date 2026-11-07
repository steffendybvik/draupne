/**
 * Desktop keyboard shortcuts: N add · ←/→ step months · ⌘/Ctrl 1–4 switch sections · Esc leaves Add.
 * Plain keys are ignored while typing in a field.
 */
export function useShortcuts() {
  const router = useRouter()
  const route = useRoute()
  const { prev, next } = useMonth()

  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null
    const typing = !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

    if ((e.metaKey || e.ctrlKey) && /^[1-4]$/.test(e.key)) {
      e.preventDefault()
      router.push(TABS[Number(e.key) - 1]!.to)
      return
    }
    if (e.key === 'Escape' && route.path === '/add') {
      router.push('/')
      return
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      router.push('/add')
    } else if (e.key === 'ArrowLeft' && route.path !== '/add') {
      prev()
    } else if (e.key === 'ArrowRight' && route.path !== '/add') {
      next()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}
