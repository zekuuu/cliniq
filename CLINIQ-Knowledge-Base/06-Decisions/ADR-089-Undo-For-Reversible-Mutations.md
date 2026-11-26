# ADR-089: Undo for reversible mutations

**Date:** Wednesday, November 25, 2026 — 11:01 PHT
**Status:** Accepted (Zean: “Undo should be everywhere once you do something that changes anything”; clarified Wednesday, November 25, 2026: “Include all that can be applied with undo”, and “Refuse the stale Undo”).
**Amends:** [ADR-085](ADR-085-Undo-On-Action-Toasts-And-Restore-Of-Archived-Records.md).
**Clarification:** Wednesday, November 25, 2026 — 11:20 PHT: Zean approved Undo for calendar deletion (same event), stock changes (compensating ledger entries), entered-in-error visits (reinstate), and other safe reversals. Immutable approvals, completed incident Stage 2, backup runs, password resets, and school-year transitions remain one-way.
**Implementation clarification:** Wednesday, November 25, 2026 — 17:34 PHT: A newly added inventory item is archived only while no edit or stock movement has followed. Undo of "Set a new date" cancels the new follow-up, preserves the old missed row, and leaves both rows in the audit trail.

## Decision

- Every successful data mutation with a safe, supported reverse offers Undo for eight seconds. An edit captures its prior editable values before saving and submits them through the normal update path on Undo. Existing archive, enable/disable and status reversals remain available.
- Before reversing, check that the record still matches the state produced by the original mutation. Refuse a stale Undo with an error rather than replacing another change. The reverse obeys the same access, validation and audit rules as an ordinary mutation; both operations remain in the append-only audit trail.
- A created student, staff, or inventory item may be archived to reverse its creation, subject to each module's rules. Calendar deletion retains the event and restores the same ID. Stock dispense, restock, and adjustment append compensating adjustment entries without rewriting the original ledger. Marking a visit entered in error may be undone by restoring its medicine lines, letter status, and affected follow-ups in one transaction if none changed later. A follow-up reschedule is reversed by cancelling its new row while preserving the old missed row. Other creates require a supported domain reversal before they gain Undo.
- On the white toast, Undo is a brand-green-dark text button with a visible focus ring, hover and pressed states, instead of Sonner’s black default button.

## Consequences

The shared toast and save helpers retain one eight-second Undo behavior; each mutation supplies the previous state and a safe reverse. The frontend and API contract document each supported reverse. Canonical Frontend Context Brief and Design Reference need updating after the group's document review.
