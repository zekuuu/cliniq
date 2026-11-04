import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Opens the header's account menu (ADR-066), where Change password, Keyboard shortcuts and Sign out now live. */
export async function openAccountMenu(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: /^Account menu, / }))
  return screen.findByRole('menu', { name: 'Account' })
}
