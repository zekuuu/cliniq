# ADR-018: Medicines and supplies given are real inventory, with stock-integrity rules

**Date:** Wednesday, October 07, 2026 — 10:43 PHT
**Status:** Accepted — amended by ADR-030 (batch-level stock, disposal and usable-stock totals)
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.

## Context
A visit's treatment was one free-text string and never touched stock. A nurse could write "paracetamol given" and the Inventory list would still show the same count, so low-stock flags were wrong and nothing linked a dispensation to the visit or student it was for. The data layer already had `dispenseInventoryItem` and `restockInventoryItem` (decrement/increment, a transaction with `studentNumber` and `visitId`, and an audit entry), but no screen used them from a visit, and the Edit Item form could overwrite stock and the expiration date directly.

The project owner asked (Wednesday, October 7, 2026) for a visit's treatment to become real inventory, and decided the rules below, including two follow-up answers given during the session: add a Restock action and lock stock/expiry on Edit Item; a visit needs treatment notes **or** at least one medicine line.

## Decision
1. **Two parts of treatment.** The text box stays, relabelled **Treatment notes** (care that isn't stock: rest, cold compress, wound cleaning, advice). **Medicines & supplies given** are repeatable lines picked from inventory. A visit needs notes or at least one line.
2. **Expiry.** Expired items are visible in the picker but disabled and can't be added; the data layer rejects them too. Nearing-expiry items stay addable with a warning. Items with no expiration date are always addable.
3. **Over-stock warns.** A quantity above current stock is allowed with a warning and a below-zero result (the existing Module 8 warn-don't-block rule).
4. **One atomic write.** Saving a visit with lines writes the visit, one `dispense` transaction per line, the stock decrements, and every audit entry together, linked by `studentNumber` and `visitId`. Any invalid line (expired, unknown item, quantity under 1, duplicate item, instructions over 120 characters) saves nothing. The mock layer enforces this generically: every write runs against a snapshot and is rolled back if it throws.
5. **Snapshots.** Each line stores the item's name and unit at the time it was first added, so a later rename doesn't change history.
6. **Edits never rewrite history.** Editing a saved visit's lines writes `adjustment` transactions linked to the visit with reason `visit_edited`: removing a line or lowering a quantity returns stock; adding or raising takes more. Each is audit-logged. The expired rule applies only to newly added or increased quantity.
7. **Adjustment transaction type.** `adjustment` joins `dispense` and `restock`: a signed quantity (the change to stock) plus a reason and an optional note.
8. **Adjust Stock (Staff).** A row action on the Inventory List: a +/- change or "set to counted quantity", a required reason (Expired - disposed, Damaged or spilled, Miscount correction, Other with a required note), and an optional note. The result can't go below 0. It writes an adjustment transaction and an audit entry; low-stock and expiry flags are recomputed on the next read.
9. **Expiry changes only through Restock.** Restock is a new row action (quantity received + the item's expiration date). Edit Item still sets name, category, unit, and threshold; stock and expiration date are read-only there (still set once on Add Item), and the data layer ignores them on an edit. To replace an expired batch: dispose of the old quantity with Adjust Stock, then Restock with the new date.
10. **Standalone Dispense** stays for non-visit use. It must name a student or choose "Not for a student (general use)". If the student already has a visit today, a notice links to that visit so the medicine is added there instead. The expired rule applies, and the data layer rejects an unknown Student Number or visit.
11. **Display.** The visit detail and the student's visit history (Student Profile, and the QR mobile hub's history) show medicines given, e.g. "Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)". Any dispense or transaction history list shows the Student Number, never the name (none exists yet).
12. **Incidents.** Incident Stage 2 records medicines with the same component; Stage 1 stays fast with no medicine entry. Incident-linked dispenses carry `incidentId`. Lines are dispensed when Stage 2 is first completed; changing them afterwards is rejected until an incident-edit rule is decided (Issues-and-TODOs).

## Provisional fields (pending the ERD)
Each of these follows the existing PROVISIONAL / `frontendOnly` convention and is listed in `08-Logs/Issues-and-TODOs.md` for the schema design:
- `Visit.itemsGiven` and `Incident.itemsGiven`: arrays of `ItemGivenLine` (`itemId`, `itemName`, `unit`, `quantity`, `instructions`).
- `InventoryTransaction.type` gains `adjustment`; `InventoryTransaction.reason` (`visit_edited` | `expired_disposed` | `damaged_spilled` | `miscount_correction` | `other`), `.note`, and `.incidentId`.

## Amendment — Thursday, October 08, 2026 — 00:04 PHT

The project owner made the same treatment rule explicit for Incident Stage 2: a completed incident may have neither treatment notes nor medicine/supply lines. Stage 2 still requires its full vitals and any applicable referral or follow-up fields; medicine-line stock, expiry, atomic-write, and post-completion editing rules are unchanged. Every incident treatment view now uses “No treatment recorded” for an empty treatment, and a pending Incident Report presents the non-blocking notice “No treatment recorded. Check this is correct before approving.” above its enabled Approve button. No new data is stored. The Modules & Features canonical document (Module 4) needs the matching update.

## Alternatives Considered
- **Derive lines from transactions only.** Rejected: instructions and the name/unit snapshot would need a home anyway, and every read would re-sum history.
- **Rewrite the original dispense on edit.** Rejected by the project owner: history must not be rewritten.
- **Block quantities above stock.** Rejected: Module 8 says a software constraint must never stop recording care that was given.
- **Automatic allergy matching.** Rejected: there's no ingredient data, so allergies are shown for awareness only.

## Consequences
- Visits, incidents, and the Dispense page now move real stock, and the Dashboard/Inventory low-stock flags reflect care actually given.
- The integrity test checks every line against its transactions (a line's quantity equals its dispenses minus `visit_edited` returns), every linked student/visit/incident exists and matches, and the seed never starts below zero.
- **Visits and incidents can't be deleted or voided anywhere in CLINIQ** (Visit Detail edits only; students are archived, never deleted), so there's no "remove all lines" path to build. If deletion or voiding is added, it must return every line's stock through adjustment transactions.
- **Canonical documents need updating:** the Modules & Features doc (Modules 3, 4, and 8) should carry the two-part treatment, the Adjust Stock action, and the expiry-through-Restock rule (`09-References/Canonical-Documents.md`).

## Amendment — Wednesday, October 07, 2026 — 21:48 PHT
The project owner asked for visit notes to be optional: "A visit can be saved with neither notes nor medicines." Rule 1's "A visit needs notes or at least one line" no longer holds. Treatment notes and medicine lines are each optional, in the New Visit form, the Visit Detail edit form, the data layer (`recordVisit`, `updateVisit`), and the seed integrity check. The forms show a non-blocking "No treatment recorded. You can still save." The stock rules above are unchanged. Session: `08-Logs/Agent-Sessions/2026-10-07-visit-optional-notes-and-disposition-fields.md`. The Modules & Features canonical doc (Module 3) needs the same change.
