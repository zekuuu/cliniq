---
name: cliniq-modal-patterns
description: Apply when building or changing a CLINIQ confirmation dialog or any other modal. Decides which actions need a confirmation step and keeps every dialog on the shared, keyboard-safe Modal.
---

# CLINIQ Modal Patterns

Use this with `cliniq-interactive-states` whenever an action might need a confirmation, or a screen opens a dialog.

## When to confirm

- Confirm an action that **can't be undone from the screen it's on**: archiving a student, approving an incident report or excuse letter, marking a backup verified, closing a follow-up as Missed or Cancelled.
- Do **not** confirm the expected, routine outcome. Marking a follow-up Completed applies at once; friction on the normal path costs the nurse time on every record.
- Do not confirm harmless or reversible actions (`Design-System.md`, Modals & Confirmation).
- Cancel on an entry or edit form asks "Discard unsaved changes?" **only when the form has unsaved input**; an untouched or just-saved form leaves at once. This lives in the shared `useCancelNavigation(fallback, isDirty)` (`frontend/src/hooks/useCancelNavigation.tsx`): pass the form's dirty state and render the returned `discardDialog`. The safe choice is "Keep Editing" (`data-autofocus`), the confirming one "Discard Changes" (`primary`, not red).

## What the dialog says and does

- Name the record it affects (the student, what, and when) and state plainly that it can't be undone from this screen.
- Button labels are Title Case. The confirming button repeats the action ("Archive Record", "Mark as Missed"), and the safe choice is "Cancel" or names what is kept ("Keep Pending").
- Reserve the red `destructive` button for deletion. Archive, approve, and status changes use `primary` or `secondary`.

## Shared implementation

- Reuse `frontend/src/components/ui/Modal.tsx`; do not hand-build a dialog. It moves focus into the dialog, keeps Tab inside it, closes on Escape or a backdrop click, and returns focus to the control that opened it.
- The overlay scrolls. A dialog taller than the viewport starts at its top, so its title and ✕ stay reachable on a phone. Do not add a local `max-h` or `overflow-y-auto` to a dialog to get this.
- The dialog surface uses `rounded-md` (`--radius-md`, 8px), matching every panel surface and standard interactive control; see `Design-System.md` for the shared mapping.
- Put `data-autofocus` on the safe choice so the dialog opens with focus there. Do not use React's `autoFocus`: it fires before the Modal can record the opener, and focus would not return to it.
- Write the audit entry only after the user confirms, never when the dialog opens (`cliniq-audit-trail`).
