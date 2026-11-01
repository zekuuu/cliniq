/**
 * One save confirmation for the screen a form returns to through history, where router state can't
 * travel (`navigate(-1)` keeps the entry's old state). The screen reads it once and clears it.
 */
let message: string | undefined

export function setSavedMessage(text: string): void {
  message = text
}

export function peekSavedMessage(): string | undefined {
  return message
}

export function clearSavedMessage(): void {
  message = undefined
}
