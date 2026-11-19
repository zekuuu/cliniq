/**
 * Back to the top after a successful submit and from the "Scroll to top" button (ADR-083). The page
 * scrolls on the window (the shell has no inner scroller); a Modal scrolls its own overlay, so a call
 * from inside a dialog scrolls that instead. Smooth unless the person asked for reduced motion.
 * Focus moves to the main content (or `focus`), so keyboard and screen-reader users start there too.
 */
export function scrollToTop(from?: Element | null, focus?: HTMLElement | null) {
  const behavior: ScrollBehavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth'
  const overlay = from?.closest<HTMLElement>('[data-modal-overlay]')
  if (overlay) {
    overlay.scrollTo?.({ top: 0, behavior })
    return
  }
  window.scrollTo({ top: 0, behavior })
  ;(focus ?? document.getElementById('main-content'))?.focus({ preventScroll: true })
}
