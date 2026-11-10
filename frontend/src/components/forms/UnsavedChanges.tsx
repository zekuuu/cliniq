import { useContext, useEffect, type RefObject } from 'react'
import { markFormDirty } from '../../lib/sessionActivity'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** The shared "Discard unsaved changes?" dialog (ADR-021, `cliniq-modal-patterns`). */
export function DiscardChangesDialog({
  open,
  onKeep,
  onDiscard,
}: {
  open: boolean
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <Modal open={open} title="Discard unsaved changes?" onClose={onKeep}>
      <p className="text-sm text-text-secondary">
        What you entered on this form hasn't been saved. If you leave now, it will be lost.
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="neutral" data-autofocus onClick={onKeep}>
          Keep Editing
        </Button>
        <Button variant="primary" onClick={onDiscard}>
          Discard Changes
        </Button>
      </div>
    </Modal>
  )
}

function RouteLeaveGuard({ dirty, allowed }: { dirty: boolean; allowed?: RefObject<boolean> }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed?.current && currentLocation.pathname !== nextLocation.pathname,
  )
  return (
    <DiscardChangesDialog
      open={blocker.state === 'blocked'}
      onKeep={() => blocker.reset?.()}
      onDiscard={() => blocker.proceed?.()}
    />
  )
}

/**
 * Asks before browser Back, a sidebar link or an Alt shortcut leaves a dirty form (ADR-021).
 * `useBlocker` needs the data router `App` uses; under a plain test router there is nothing to guard.
 */
export function UnsavedChangesGuard({
  dirty,
  allowed,
}: {
  dirty: boolean
  allowed?: RefObject<boolean>
}) {
  // The idle sign-out warns that unsaved changes will be lost (ADR-078).
  useEffect(() => (dirty ? markFormDirty() : undefined), [dirty])
  return useContext(UNSAFE_DataRouterContext) ? (
    <RouteLeaveGuard dirty={dirty} allowed={allowed} />
  ) : null
}
