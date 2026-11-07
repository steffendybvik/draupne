/** The rendered width of an element, kept current with a ResizeObserver. */
export function useElementWidth(el: Ref<HTMLElement | undefined>, initial = 320) {
  const width = ref(initial)
  let ro: ResizeObserver | undefined
  onMounted(() => {
    ro = new ResizeObserver(([entry]) => { if (entry) width.value = entry.contentRect.width })
    if (el.value) {
      width.value = el.value.clientWidth || initial
      ro.observe(el.value)
    }
  })
  onBeforeUnmount(() => ro?.disconnect())
  return width
}
