/*
 * Signals the idle sign-out listens to (ADR-078), kept out of React so the mock data layer and the
 * forms can raise them without knowing about the shell.
 */

/** Any API call counts as activity: the mock raises this on every request. */
export const API_ACTIVITY_EVENT = 'cliniq:api-activity'
/** The idle sign-out settings were saved: the shell reads them again for the next countdown. */
export const IDLE_SETTINGS_CHANGED_EVENT = 'cliniq:idle-settings-changed'

export function emit(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name))
}

// How many forms on screen hold unsaved changes, so the idle warning can say they will be lost.
let dirtyForms = 0
const listeners = new Set<() => void>()

/** A form became dirty; call the returned function when it is clean again or unmounts. */
export function markFormDirty(): () => void {
  dirtyForms += 1
  listeners.forEach((listener) => listener())
  return () => {
    dirtyForms -= 1
    listeners.forEach((listener) => listener())
  }
}

export function subscribeDirtyForms(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function anyFormDirty(): boolean {
  return dirtyForms > 0
}
