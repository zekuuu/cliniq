import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Answers the "Confirm it's you" dialog (panel review AC-7) with the dev account's password. */
export async function confirmItsYou(user: UserEvent, password = 'demo-nurse') {
  const dialog = await screen.findByRole('dialog', { name: "Confirm it's you" })
  await user.type(within(dialog).getByLabelText(/your password/i), password)
  await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
}
