import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** The notice shows this long before the sign-out (ADR-048). */
export const IDLE_WARNING_MS = 60_000

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'wheel'] as const

/**
 * Calls `onTimeout` after `minutes` without pointer, key or scroll activity, and returns true during
 * the last minute so the screen can warn. `null` turns it off (the clinician has no timeout, ADR-048).
 */
export function useIdleSignOut(minutes: number | null, onTimeout: () => void): boolean {
  const [warning, setWarning] = useState(false)
  const timeoutRef = useRef(onTimeout)
  useLayoutEffect(() => {
    timeoutRef.current = onTimeout
  })

  useEffect(() => {
    if (minutes === null) return
    const limit = minutes * 60_000
    let last = Date.now()
    const activity = () => {
      last = Date.now()
      setWarning(false)
    }
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, activity, { capture: true, passive: true })
    const timer = setInterval(() => {
      const idle = Date.now() - last
      if (idle >= limit) {
        clearInterval(timer)
        timeoutRef.current()
      } else setWarning(idle >= limit - IDLE_WARNING_MS)
    }, 1000)
    return () => {
      clearInterval(timer)
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, activity, { capture: true })
    }
  }, [minutes])

  return warning
}
