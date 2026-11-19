import { waitFor } from '@testing-library/react'

/** The toast (ADR-083) whose text includes `text`, as `toHaveTextContent` reads a message. */
export function findToast(text: string): Promise<HTMLElement> {
  return waitFor(() => {
    const toast = [...document.querySelectorAll<HTMLElement>('[data-sonner-toast]')].find(
      (element) => element.textContent?.includes(text),
    )
    if (!toast) throw new Error(`No toast containing "${text}"`)
    return toast
  })
}
