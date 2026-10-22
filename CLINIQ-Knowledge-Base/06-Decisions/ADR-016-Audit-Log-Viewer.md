# ADR-016: Audit Log Viewer — New Module 11

**Date:** Wednesday, September 30, 2026 — 17:28 PHT
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 07:00):** the CLINIQ Student Number this ADR mentions was replaced by the LRN (ADR-028, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); lists show it masked. The rest of the decision stands.

## Context
The Audit Trail (Module-Overview.md, "Audit Trail — Cross-Cutting") has always specified the **write** side only: every login, scan, submission, approval, and create/update/delete/archive gets logged with who and when. Nothing specified a **read** side — no screen anywhere lets a person actually open that log. Confirmed by checking Screen-Inventory.md, the Use-Case Diagram, and the built frontend: every "audit" reference in the app writes an entry; none reads one back. This quietly undercut the log's stated purpose — it's described as what makes the PE/Sports Instructor's access "accountable," but accountability requires someone to actually be able to look.

## Decision
Add **Module 11: Audit Log Viewer**, a new, dedicated, read-only screen (**Screen #35**) — not folded into Reports or User Management, since it's a distinct concern from either (Reports summarize clinic activity; User Management manages accounts; this reviews *actions*).

**Access:** Staff (view) and Admin/Principal (view) — the roles the user specified. PE/Sports Instructor: no access, consistent with their narrow scope everywhere else.

**Immutable by design.** No role can edit or delete an entry from this screen, ever — an editable audit log isn't one. This isn't stated elsewhere in the requirements, so it's recorded here explicitly.

**What the screen needs, beyond a raw list — my judgment call, since the user delegated this:**
- **Filters:** date range (reusing the shared `DateRangePicker`, per the component-skills rule), user (who performed the action), action type (`login` / `logout` / `scan` / `submit` / `approve` / `create` / `update` / `delete` / `archive`, multi-select), and target/module type (student / visit / incident / inventory / user / report / backup / follow-up) — this last one lets Staff or Admin narrow to "everything touching Inventory" or similar, which a flat list alone doesn't support.
- **Sort:** newest first by default, matching the Visit Log List convention already in the app.
- **Pagination:** required — this log grows with every login and every scan, unlike any other list in the app.
- **Row content:** timestamp, who (resolved to the account's name, not a raw user id), the action type (as a status-style badge, matching `StatusBadge` usage elsewhere), and the target record — reused from the shared list pattern where the row links through to that record (e.g., a `submit` row for a visit links to that Visit's detail).
- **Display-privacy rule applies.** This is a multi-record, glanceable list, so where the target record is a student, the row shows the **Student Number, not the name** — the same rule as every other list screen in the app (`cliniq-display-privacy`).
- **Export.** Given the log's stated RA 10173 purpose, being able to hand a filtered export to a DPO or during an actual compliance review is a real, likely need — added as print/export, matching the pattern Reports already has.

**Considered and declined: logging views of this screen itself.** A "meta-audit" (who viewed the audit log, and when) would be consistent with how seriously this system treats accountability elsewhere. Not adding it for now: unlike a QR scan or a profile view, opening this screen doesn't access student health data directly — most entries are operational (logins, submissions) rather than PHI. Revisit if the client wants oversight of who reviews the log itself.

## Alternatives Considered
- **Fold into Reports Generation** — rejected; Reports is about summarizing clinic *activity* for stakeholders, this is about reviewing individual *actions* for accountability. Different audience question, different shape of screen (a report is generated and read later; this is filtered and browsed live).
- **Fold into User Management** — rejected; User Management is about accounts, not actions, and Admin/Principal has no other reason to open User Management (they have no account-management access there today).
- **Staff-only access** — rejected; the user specified both Staff and Admin/Principal, and Admin/Principal is the role already described as the compliance/sponsor stakeholder — a natural fit for reviewing accountability data.

## Consequences
- Module count goes from 10 to 11. Every place that states "10 modules" needs updating: `Module-Overview.md`'s own Access Summary table, the canonical `CLINIQ_Modules_and_Features.md`, the Project Plan's Modularity & Scalability NFR (Rev 2.6), `09-References/Canonical-Documents.md`, and the root `README.md`.
- `Screen-Inventory.md` gains #35.
- `Frontend-Loop-Engineering.md`'s F2 checklist gains a new "Audit Log (Module 11)" group.
- The mock-data layer (`frontend/src/lib/mock-db/`) already has an `auditLog` array with a compatible shape (`userId`, `actionType`, `targetRecord: {type, id}`, `timestamp`) — the new screen reads through the existing data-access layer, per ADR-014, and needs no new mock-data design, only more seeded entries to be worth browsing (currently 7).
