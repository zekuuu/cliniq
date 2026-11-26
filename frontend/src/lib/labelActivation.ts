/** Keep native label names for assistive technology without making the label a click target. */
export function preventLabelActivation(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return

  const label = target.closest('label')
  if (!label) return

  // A control inside a wrapping label must still receive its own direct click.
  const control = target.closest('input, select, textarea, button, a, [role="button"], [role="checkbox"], [role="radio"], [role="switch"]')
  if (control && label.contains(control)) return

  event.preventDefault()
}
