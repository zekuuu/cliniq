Date/Day/Time: Saturday, October 31, 2026 — 20:34 PHT
Agent: Claude Code (Opus 5.5)
Task: Finish the accuracy pass (tests, stamps, one number) and bring the ERD drafts up to date with the accepted decisions
Status: Completed
Prompt/Request: Zean's review of `docs/accuracy-pass`, Saturday, October 31, 2026 — 20:14 PHT, by a pasted prompt: add tests for the optional section and Change Password; mark estimated stamps; fix the "103"; and keep the ERD, Data Dictionary, Reference Schema and diagrams in step with accepted decisions and real data shapes, as documents only, with no migration, seeder or model with columns. No commit and no push.
Files Modified: see `git status` on `docs/accuracy-pass`; started from `7bf21855`. Nothing is committed.
Changes Made: see below.
Reason: The drafts had fallen behind the decisions, so the backend would have reviewed a stale design.
Testing Performed: typecheck passes; lint unchanged (1 error, 2 warnings); tests 849 passed, 12 failed of 861, the same 12 baseline failures. The baseline run on this branch was 833 passed, 13 failed, its flake this time in `IncidentEntryPage.test.tsx`, not `IncidentSafety.test.tsx`; the final run had no flake. `Reference-Schema.sql` loaded on a scratch MariaDB 10.11.16 (from XAMPP, port 3399): 44 tables, 424 columns, 72 CHECKs, then the scratch database was dropped. Good rows for a student and a staff patient saved; both patients, no patient, a second live letter and a follow-up for the wrong patient were each refused. Stale-term search and table, column and Mermaid drift check clean. Link and anchor check: every `Data-Dictionary.md` anchor resolves. Diagrams regenerated and the Overview looked at by eye.
Known Issues: the 107 constraint tests and the stress load of `ERD.md` were not repeated (their scripts are not in the repository). Not loaded on MySQL 8.
Next Steps: Zean reviews, commits and merges; the team works through `ERD-Review.md`.

## Part A

- `StudentSection.test.tsx` (8 tests): saves with and without a section; profile and printout only when present; never on the Student List or Visit Log; `sectionAtTime` kept after a change; none for no section or a staff patient; history rows; audit by field name; integrity check.
- `ChangePasswordPage.test.tsx` (9 tests, 2 kept): wrong current password; success and audit; the Admin; under 8 characters; mismatch; reuse; top bar for both roles (2); signed-out visitor.
- `integrity.ts`: `section` and `sectionAtTime` allowed as optional fields. The check rejected them before.
- Estimated stamps marked "(time estimated)": the accuracy-pass session log 2, `Backend-Changelog.md` 1, `Backend-Issues-and-TODOs.md` 1, `Changelog.md` 1, `Issues-and-TODOs.md` 3, `Issues-Done-Archive.md` 18.
- A clearing of a section on a record that had one stores null, not an absent field, so the audit can see the change.

## Part B: change table

9 tables changed, 46 columns added, 6 removed; 9 new tables with 60 columns.

| Table | Added | Removed |
|---|---|---|
| `users` | email | — |
| `students` | birth_date, section, sex | archive_note, archive_reason, contact_number |
| `inventory_items` | brand | current_stock, expiration_date |
| `visits` | assisted_by, collected_by_name, collected_by_relationship, collected_by_time, entered_in_error_at, entered_in_error_by_user_id, entered_in_error_reason, escalated_incident_id, grade_level_at_time, late_entry, late_entry_reason, parent_guardian, personnel_id, remarks, section_at_time, temperature_c, time_out | — |
| `excuse_letters` | live_visit_id, recipient, stay_home_note, stay_home_until_cleared, superseded_at, superseded_by_user_id, superseded_reason, voided_at, voided_by_user_id, voided_reason | — |
| `incidents` | body_part, general_notes, grade_level_at_time, no_further_action_reason, personnel_id, section_at_time, source_visit_id | — |
| `incident_report_approvals` | acknowledged_at, acknowledged_by_user_id | — |
| `follow_ups` | personnel_id, status_reason, stay_home_note, stay_home_until_cleared | — |
| `inventory_transactions` | personnel_id | expiration_date_after |

| File | It said | It says now | Source |
|---|---|---|---|
| All three | 35 tables | 44: `personnel`, `personnel_health_entries`, `personnel_emergency_contacts`, `visit_extra_complaints`, `inventory_batches`, `inventory_item_allergy_words`, `inventory_transaction_batches`, `backup_locations`, `backup_location_results` | ADR-030, 043, 049, 052, 053 |
| `Reference-Schema.sql` | `student_id NOT NULL` on visits, incidents, follow-ups | Student or staff, exactly one, with same-patient keys for each | ADR-043, ADR-053 |
| Same | One letter per visit, two statuses | One live letter, `voided`, `superseded` | `issueReplacementExcuseLetter`, ADR-049 |
| Same | `inventory_items.current_stock`, `expiration_date` | Stock lives in batches | ADR-030 |
| Same | Columns the dictionary listed but the SQL lacked (`sex`, `brand`, `late_entry` and others) | Present | `entities.ts` |
| Same | Audit actions without `print`, `view` | Added | ADR-026, 038, 048 |
| Same | Frequent-visitor window 30 | 14, plus the other starting values | ADR-051 |
| `ERD.md` | D-03, 06, 07, 08, 09, 19, 20 open | Closed or answered | ADR-049, 051, 030, 031 |
| `ERD.md`, dictionary | `SmartTriage`, 64 functions, "MySQL" lines, 3 roles | `FirstAidChecklist`, 104, removed, 2 | ADR-007, ADR-029 |
| `ADR-056`, `Backend-Loop-Engineering.md` rule 4, Readiness Checklist | Drafts untouched until approval | Kept in step; approval gates migrations and open choices | Zean, this prompt |
