import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useGoBack } from './useGoBack'

/**
 * Cancel for an entry or edit form. It never saves or submits: it returns to the screen the user came
 * from, or to `fallback` when the form was the first screen opened (a bookmark or a new tab), so Cancel
 * never leaves the app.
 *
 * When `isDirty` (something typed or chosen that isn't saved yet), Cancel asks first, because leaving
 * can't be undone from the form (`cliniq-modal-patterns`). Render `discardDialog` in the form.
 */
export function useCancelNavigation(
  fallback: string,
  isDirty = false,
): { cancel: () => void; discardDialog: ReactNode } {
  const leave = useGoBack(fallback)
  const [asking, setAsking] = useState(false)

  return {
    cancel: () => (isDirty ? setAsking(true) : leave()),
    discardDialog: (
      <Modal open={asking} title="Discard unsaved changes?" onClose={() => setAsking(false)}>
        <p className="text-sm text-text-secondary">
          What you entered on this form hasn't been saved. If you leave now, it will be lost.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setAsking(false)}>
            Keep Editing
          </Button>
          <Button variant="primary" onClick={leave}>
            Discard Changes
          </Button>
        </div>
      </Modal>
    ),
  }
}
