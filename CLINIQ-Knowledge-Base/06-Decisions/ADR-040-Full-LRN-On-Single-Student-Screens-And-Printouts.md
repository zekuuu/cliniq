> **Note, Saturday, November 07, 2026 — 11:54 PHT:** Zean, in chat: "censor LRN in audit log", then "only show in audit log print". The Audit Log screen now shows the masked LRN through `<Lrn>`; only its printout shows the full LRN. Still never the name. Session: [2026-11-07-audit-log-masked-lrn](../08-Logs/Agent-Sessions/2026-11-07-audit-log-masked-lrn.md)

> **Note, Tuesday, November 03, 2026 — 19:49 PHT:** Zean, frontend review round 2, R33: "display it", to the question of what the Audit Log should show for a student (the groupmate said the LRN is still hidden). The Audit Log screen and its printout now show the full LRN ("LRN 000000250032") for a student-related record, never the name. This widens where the full LRN appears; lists, pickers, the Dashboard and Reports screens stay masked. Session: [2026-11-03-frontend-review-round-2-part-3](../08-Logs/Agent-Sessions/2026-11-03-frontend-review-round-2-part-3.md)

# ADR-040: The full LRN shows on every single-student screen and its printout

**Date:** Sunday, October 25, 2026 — 22:33 PHT
**Status:** Accepted (Zean, Sunday, October 25, 2026 — 22:33 PHT). Built the same day ([2026-10-25-full-lrn-on-single-student-views](../08-Logs/Agent-Sessions/2026-10-25-full-lrn-on-single-student-views.md)). Amends ADR-028's masking rule.

## Context
ADR-028 (confirmed Wednesday, October 21, 2026) masked the LRN to its last four digits on lists, pickers, printouts and the Audit Trail, and showed it in full only on the Student Profile and the Add/Edit Student form. In use, Zean found the LRN "still censored when it shouldn't be". The Student Health Record printout, the Incident Report, the Excuse Letter and Visit Details each show one deliberately opened student by full name, so hiding the LRN there protects nothing. It also makes the record harder to match with the school's files.

## Decision
1. **The full LRN shows on every screen about one opened student, and on that screen's printout.** These are the Student Profile and its Student Health Record printout, the Incident Report (screen, approval dialog and printout), the Parent Notification screen, the Excuse Letter (screen and printout), Visit Details, and the New Visit, Report Incident and PE/Sports Referral headers once a student is picked.
2. **Everything that shows several students, or is glanceable, stays masked** (`●●●●●●●●1234`, read as "LRN ending in 1234"). This covers the Visit, Incident, Follow-up and Student lists, the Dashboard and its Clinic Overview Report, Reports and their printouts, the Incomplete Records queue, the student pickers (including the picked-student chip), the duplicate-student warning, the Dispense confirmation, and the Audit Trail.
3. The LRN still never goes in an address, query string, tab title or audit entry.

## Alternatives Considered
- **Full LRN on single-student screens only, printouts masked** (paper can leave the clinic). Offered; Zean chose screens and their printouts.
- **Full LRN on printouts only.** Offered; not chosen.

## Consequences
- `cliniq-display-privacy` and `cliniq-print-patterns` change their LRN rule. ADR-028 gets a note.
- A single-student printout now identifies the child by learner number as well as by name. It already carried the full name, and the Admin can't print (ADR-038), so only the clinician prints these.
- The canonical documents (Frontend Context Brief, Modules & Features, Project Plan) are updated in the same change.
