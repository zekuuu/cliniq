import { useState, type KeyboardEvent } from 'react'

/**
 * A "Caps Lock is on." hint for password fields (panel review LG-4): Login, Force Password Change and
 * "Confirm it's you". Spread `handlers` on the input and pass `hint` as its hint.
 */
export function useCapsLock() {
  const [on, setOn] = useState(false)
  const read = (event: KeyboardEvent<HTMLInputElement>) => setOn(event.getModifierState('CapsLock'))
  return {
    hint: on ? 'Caps Lock is on.' : undefined,
    handlers: { onKeyDown: read, onKeyUp: read, onBlur: () => setOn(false) },
  }
}
