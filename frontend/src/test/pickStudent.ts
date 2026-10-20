import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Picks a student on an entry form the way Staff do: type the LRN, then Enter (ADR-028). */
export async function pickStudent(user: UserEvent, lrn: string) {
  await user.click(await screen.findByRole('combobox', { name: /student/i }))
  await user.keyboard(lrn)
  await screen.findByRole('option', { name: new RegExp(`LRN ending in ${lrn.slice(-4)}`) })
  await user.keyboard('{Enter}')
  await screen.findByRole('button', { name: /change student/i })
}
