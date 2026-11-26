# ADR-085: An Undo on the toast for reversible actions, and archived records can be restored

**Date:** Sunday, November 22, 2026 — 01:30 PHT
**Status:** Accepted (Zean, Sunday, November 22, 2026: "for action buttons, add undo for everything applicable, e.g. for archive, etc. they have seconds until they can undo until the toast gone". Answers in the run's pop-up: Undo "Call the reverse"; student and staff archive "Yes, add restore"; follow-up "Restore old reason"; duration "8 seconds".)
**Amends:** [ADR-083](ADR-083-Action-Feedback-In-Sonner-Toasts-Forms-Reset-And-Scroll-To-Top.md) (a toast's action button) and [ADR-084](ADR-084-No-Dispensing-Beyond-Stock-And-One-Toast-Per-Action.md) (one toast per action). **Fulfils** the "an archived record can be restored" of ADR-047, ADR-051 and ADR-069, which had no restore route until now.

## Context
- Every action's result is a toast (ADR-083), and a toast with an action stays 8 seconds. A mistaken click (disabling the wrong account, archiving the wrong student) could only be put right on another screen, or not at all: there was no restore for an archived student or staff record.

## Decision
1. **Undo on the toast.** A reversible action's success toast carries an **Undo** button for its 8 seconds (`ACTION_MS`; hovering pauses it, and the countdown line shows the time left). The shared helper is `notify.undoable(message, undo, { undone, onUndone })` in `frontend/src/lib/notify.ts`; `useSaveFeedback().run` takes an `undo` option for the same.
2. **Undo calls the reverse request.** The action is saved at once; Undo sends the opposite request, shows "Undoing…" and then "Undone: …", and reloads the screen. The audit log keeps both entries (it is insert-only), e.g. "Disabled account" then "Enabled account". A refused Undo (the last Admin, the last enabled backup location) shows the reason as an error toast.
3. **Actions that get Undo:** account enable/disable; backup location enable/disable; Sports Report archive/restore; follow-up status change (back to the previous status and its previous reason); student archive; staff archive. Emergency-contact verification was removed by ADR-088.
4. **Restore of archived records.** New routes `POST /api/students/{id}/restore` and `POST /api/personnel/{id}/restore` (Staff only) clear `archived_at`, `archived_by_user_id`, `archive_reason` and `archived_school_year`, refuse a record that is not archived with `409 not_archived`, and audit an `update` with the summary "Restored from the archive" (the Sports Report's wording). The mock has `restoreStudent` and `restorePersonnel`.
5. **A follow-up set to Pending or Completed clears its reason**, so an Undo of Missed or Cancelled leaves no stale reason behind (backend `FollowUpService::setStatus` and the mock's `setFollowUpStatus`).
6. **One-way actions get no Undo:** marking a visit entered in error, approving an excuse letter or an incident report, completing an incident's Stage 2, ending or starting a school year (ADR-075), stock dispense, restock and adjustments (an append-only ledger, ADR-084), running or verifying a backup, resetting a password, turning off the authenticator, deleting a calendar event, and "Set a new date" on a follow-up. Their confirmation dialogs keep saying they can't be undone.

   **Amended Wednesday, November 25, 2026 — 17:34 PHT by ADR-089:** entered-in-error visits, stock changes, calendar deletion, and a follow-up's new date now have domain-specific Undo. The other one-way actions above retain their clinical or security restrictions.

## Consequences
- Two more API routes (131 to 133). No migration: the archive columns already allow null.
- An Undo appears in the Audit Log as its own entry, not as a deletion of the first.
- The Undo is lost once the toast closes; after that the record is changed back the usual way (for an archived record, only by an Undo for now: there is still no Restore button on the Archive screen).

## Canonical documents to update
Frontend Context Brief and Frontend Design Reference (feedback: Undo on the toast); Modules & Features (Modules 1 and 2: an archived record can be restored by Undo).
