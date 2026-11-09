import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { API_ACTIVITY_EVENT } from '../lib/sessionActivity'

/** The warning shows this long before the sign-out (ADR-078; one minute under ADR-048). */
export const IDLE_WARNING_MS = 120_000

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
] as const

/**
 * Calls `onTimeout` after `minutes` without keyboard, pointer, scroll or touch activity or an API call. Once the
 * warning shows, only `stay` keeps the session
 * (ADR-078: each role's own setting). Returns the whole seconds left during the last two minutes, so
 * the screen can warn with a countdown, else `null`; `stay` restarts the count. `null` minutes turn it off.
 * A change of `minutes` starts a fresh countdown.
 */
export function useIdleSignOut(
  minutes: number | null,
  onTimeout: () => void,
): { secondsLeft: number | null; stay: () => void } {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const timeoutRef = useRef(onTimeout)
  const lastRef = useRef(0)
  // While the warning is open only an explicit choice (`stay`) keeps the session: a Tab or a pointer
  // move toward "Sign out now" must not close the warning under the person's hand.
  const warningRef = useRef(false)
  useLayoutEffect(() => {
    timeoutRef.current = onTimeout
  })

  useEffect(() => {
    if (minutes === null) return
    const limit = minutes * 60_000
    lastRef.current = Date.now()
    warningRef.current = false
    const activity = () => {
      if (warningRef.current) return
      lastRef.current = Date.now()
      setSecondsLeft(null)
    }
    for (const name of ACTIVITY_EVENTS)
      window.addEventListener(name, activity, { capture: true, passive: true })
    window.addEventListener(API_ACTIVITY_EVENT, activity)
    const timer = setInterval(() => {
      const idle = Date.now() - lastRef.current
      if (idle >= limit) {
        clearInterval(timer)
        timeoutRef.current()
      } else {
        warningRef.current = idle >= limit - IDLE_WARNING_MS
        setSecondsLeft(warningRef.current ? Math.ceil((limit - idle) / 1000) : null)
      }
    }, 1000)
    return () => {
      clearInterval(timer)
      for (const name of ACTIVITY_EVENTS)
        window.removeEventListener(name, activity, { capture: true })
      window.removeEventListener(API_ACTIVITY_EVENT, activity)
    }
  }, [minutes])

  const stay = useCallback(() => {
    warningRef.current = false
    lastRef.current = Date.now()
    setSecondsLeft(null)
  }, [])

  return { secondsLeft, stay }
}
