import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Picks a student on an entry form the way Staff do: type the Student Number, then Enter. */
export async function pickStudent(user: UserEvent, studentNumber: string) {
  await user.click(await screen.findByRole('combobox', { name: /student/i }))
  await user.keyboard(studentNumber)
  await screen.findByRole('option', { name: new RegExp(studentNumber) })
  await user.keyboard('{Enter}')
  await screen.findByRole('button', { name: /change student/i })
}
