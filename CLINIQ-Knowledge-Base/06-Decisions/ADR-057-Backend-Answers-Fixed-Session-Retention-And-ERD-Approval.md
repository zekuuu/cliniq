> **Note Saturday, November 07, 2026 — 16:15 PHT:** The approved ERD (item 10) gains a 48th table, `staff_record_reviews`, through [ADR-076](ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md). The decision text below is unchanged.

# ADR-057: Backend answers: fixed 7-day session, new error codes, deferred HTTPS, masked LRN, retention, and the ERD approved

**Date:** Sunday, November 1, 2026 — 01:55 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 1, 2026 — 01:23 PHT). Item 10: Zean, in chat, Sunday, November 1, 2026 — 01:39 PHT.

## Context
Part 1 of the backend preparation left questions: the API contract's 20, the ERD approval checklist, 30 ERD gaps with 7 must-fix, and the environment warnings. Zean answered them. Where he said "the best approach", the order is an ADR first, then the mock API's behaviour, then the safer choice for privacy and data integrity.

## Decision
1. **Fixed 7-day session from sign-in** (amends the build detail of ADR-015 and ADR-056). Laravel's renewing session is not enough. The sign-in time is stored, and the session ends 7 days after sign-in however active the user is.
2. **New error codes.** `invalid_credentials`, `account_locked` (423) and `password_change_required` join the error envelope.
3. **Development scope.** Development and testing happen on Zean's own machine only. The clinic computer's PHP and MariaDB versions are not needed for now and are re-checked before deployment (`LATER`).
4. **HTTPS on the LAN is deferred** to a deployment with real data. Until then development uses plain HTTP on localhost. The allowed origins, the `secure` cookie flag and the stateful domains stay environment-driven, so deployment needs no code change (`LATER`).
5. **Masked LRN.** Lists carry the masked LRN. A Staff-only flag returns the full LRN for the printouts of ADR-044, with an audit entry for each such request. *Note:* Zean's wording was "single-student printouts", but ADR-044's printouts (the Clinic Overview Report, the Monthly Report's incident table, the Incident register) each list several students, and a single-student response already carries the full LRN. This item follows ADR-044, which it does not change.
6. **Staff incidents and the Admin: accepted as built.** The Admin's totals leave staff incidents out (ADR-053). The calendar counts, the monthly report, the audit trail and approved-report ids may include them. The detail of a staff patient's incident stays Staff-only. *Challenge:* the Privacy Policy tells staff that their health information is seen only by the School Clinician. Counts and ids are not health detail, but the wording must stay true. The frontend prompt does that.
7. **Staff-patient records are kept 5 years from the archive date,** the same as students'.
8. **The audit log is kept 10 years** (ADR-037). Zean resolves the open confirmation, so it is no longer "provisional until the school confirms".
9. **ERD approval checklist answers:**

| Question | Answer |
|---|---|
| Ids | `BIGINT UNSIGNED` surrogate keys; printed documents carry a readable reference number |
| Column lengths | As drafted |
| `section`, `grade_level_at_time` | Free text for now; lookup table `LATER` |
| `personnel.type` | Free text checked by the service against the configured list; lookup table `LATER` |
| `staff_number` | CLINIQ's own `STF-0001`; optional school employee number `LATER` |
| Staff health entries and contacts | Separate tables, as drafted |
| Who was called for a staff patient | `parent_notification_attempts` holds a snapshot (name, relationship, phone) |
| `audit_logs` | Add `subject_personnel_id`, the staff twin of `subject_student_id` |
| `users.email` | Unique; reset tokens in Laravel's default table |
| `students.health_reviewed_at` | Dropped |
| Batches on a medicine line | One place, the stock movement; every reader was checked (`ERD-Review.md`) |
| Letter draft values | On a `draft` row; `snapshot_text` is the stored `body` |
| Vitals ranges, personnel types, `showFrequentVisitors` | `reference_settings`, beside the numeric `system_settings` |
| Retention of staff patients | 5 years from the archive date |
| Audit retention | 10 years |
| Indexes | Keep the drafted set, provisional until measured with realistic data |

10. **ERD approved** (Zean, in chat, Sunday, November 1, 2026 — 01:39 PHT). The ERD, Data Dictionary, Reference Schema and diagrams are approved as they stand at the end of Part 1b, on the condition that the schema loads, every constraint test passes and no must-fix gap is open. The condition held on Sunday, November 1, 2026 — 01:55 PHT: 191 of 191 tests passed. This releases migrations, seeders and models with columns (ADR-056 rule 6) for the next phase. Later changes to the approved design go through a new decision.
11. **Not changed by this ADR:** ADR-053's rule that the Admin's totals leave staff incidents out.

12. **The three items left open are answered** (Zean, in chat, Sunday, November 1, 2026 — 02:16 PHT: "do the suggested recommended"). The actor's role is stored on each audit row: `audit_logs.actor_role`, which amends ADR-017's "derived at read time", because a later role change would rewrite history and the value cannot be backfilled (D-01). `StudentListRow` is cut to the columns the list needs, so it carries no health fields and no contacts (contract Q2). Rescheduling a follow-up keeps "Stay home until cleared" and its note until the clinician clears them (contract Q7b). No schema change follows from these, so the approval of item 10 stands.

## Alternatives Considered
- Session: Laravel's sliding lifetime alone. A session in regular use would never end.
- Clinic versions now: not needed while development stays on one machine.
- HTTPS now: a local certificate adds setup with no real data to protect yet. The cost is that real data must not cross the LAN until it exists.
- Masked LRN: full LRN in every response, as the mock. Bystander and interception risk for no gain.
- Staff incidents: filter them from every Admin view. More code, and counts carry no health detail.
- Staff-patient retention: a separate period. Nothing justifies treating them differently.
- Audit retention: wait for the school. It would keep a settled design open.
- Batches on the line as well: two copies of one fact that can drift.
- Non-numeric settings as new columns or typed rows: each new value would need a migration.

## Consequences
- B0.5 gains one middleware. Part 2 has its error codes.
- `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql`, `Data-Retention-Policy.md` and `API-Contract.md` carry these answers. `Checks/` holds the constraint tests.
- Real data must not cross the LAN until HTTPS exists.
- Two mock changes from items 1 to 11 are recorded here and made on a separate frontend branch: the audit reason (ADR-017) and the Missed follow-up reschedule. The Privacy Policy wording of item 6 goes with them.
- **Canonical documents need updating:** the Project Plan's retention section (5.3) for staff patients and the settled audit period, and the access text for item 6 (`09-References/Canonical-Documents.md`).
- Four mock changes in all go on the frontend fix branch: the two above, the `StudentListRow` cut and the stay-home flag on reschedule (item 12).
