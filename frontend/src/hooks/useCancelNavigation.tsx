import { useRef, useState, type ReactNode } from 'react'
import { DiscardChangesDialog, UnsavedChangesGuard } from '../components/forms/UnsavedChanges'
import { useGoBack } from './useGoBack'

/**
 * Cancel for an entry or edit form. It never saves or submits: it returns to the screen the user came
 * from, or to `fallback` when the form was the first screen opened (a bookmark or a new tab), so Cancel
 * never leaves the app.
 *
 * When `isDirty` (something typed or chosen that isn't saved yet), Cancel asks first, because leaving
 * can't be undone from the form (`cliniq-modal-patterns`), and so does any other way out of the route.
 * Render `discardDialog` in the form. Call `allowLeave` just before a navigation that follows a save.
 */
export function useCancelNavigation(
  fallback: string,
  isDirty = false,
): { cancel: () => void; discardDialog: ReactNode; allowLeave: () => void } {
  const goBack = useGoBack(fallback)
  const [asking, setAsking] = useState(false)
  const allowed = useRef(false)
  const allowLeave = () => {
    allowed.current = true
  }
  const leave = () => {
    allowLeave()
    goBack()
  }

  return {
    cancel: () => (isDirty ? setAsking(true) : leave()),
    allowLeave,
    discardDialog: (
      <>
        <DiscardChangesDialog open={asking} onKeep={() => setAsking(false)} onDiscard={leave} />
        <UnsavedChangesGuard dirty={isDirty} allowed={allowed} />
      </>
    ),
  }
}
