import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { formatLongDate, formatMonthYear } from '../lib/dates'

async function openToYear(user: UserEvent, trigger: HTMLElement, year: number) {
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: /^Choose / })
  // Zoom out to the year pages, then page until the target year is on screen.
  for (let i = 0; i < 2; i++) {
    const zoom = within(dialog).queryByRole('button', { name: /, choose (month|year)$/ })
    if (zoom) await user.click(zoom)
  }
  for (let i = 0; i < 50 && !within(dialog).queryByRole('button', { name: String(year) }); i++) {
    const firstYear = Number(within(dialog).getByRole('group').getAttribute('aria-label')!.slice(0, 4))
    await user.click(
      within(dialog).getByRole('button', { name: year < firstYear ? 'Previous years' : 'Next years' }),
    )
  }
  await user.click(within(dialog).getByRole('button', { name: String(year) }))
  return dialog
}

/** Picks `YYYY-MM-DD` from the shared `DatePicker` the way a user does, through its calendar. */
export async function pickDate(user: UserEvent, trigger: HTMLElement, value: string) {
  const dialog = await openToYear(user, trigger, Number(value.slice(0, 4)))
  await user.click(within(dialog).getByRole('button', { name: formatMonthYear(value) }))
  await user.click(within(dialog).getByRole('button', { name: formatLongDate(value) }))
}

/** Picks `YYYY-MM` from the shared `MonthPicker`. */
export async function pickMonth(user: UserEvent, trigger: HTMLElement, value: string) {
  const dialog = await openToYear(user, trigger, Number(value.slice(0, 4)))
  await user.click(within(dialog).getByRole('button', { name: formatMonthYear(`${value}-01`) }))
}
