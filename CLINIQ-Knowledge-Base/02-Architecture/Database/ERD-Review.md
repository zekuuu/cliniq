# ERD Review

**Status: the approval checklist.** Rewritten Saturday, October 31, 2026 — 20:31 PHT. `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql` and `Diagrams/ERD-*` now carry the accepted decisions up to ADR-056 and the frontend's data shapes (104 exported functions in `frontend/src/lib/mock-db/api.ts`). They stay a proposed draft, not final or approved. What waits for the team is below, plus the open items in `ERD.md` sections 11 and 12. No migration, seeder or model with columns is built before that (ADR-056).

## Now in the drafts

Staff patients and the exactly-one-patient rule (ADR-043, ADR-053); batches and allocations (ADR-030, ADR-035); `birth_date`, no student `contact_number` (ADR-054); `section`, `grade_level_at_time`, `section_at_time` (ADR-047); `resting_in_clinic`; extra complaint tags (ADR-053); collected-by, stay-home, stored wording, voided and superseded letters (ADR-049); avoid-if-allergic words and brand; Acknowledge (ADR-048); backup locations and a result per location (ADR-052); `print` and `view` audit actions; the 10-year audit retention setting; the starting values in `system_settings` (ADR-051); the visit logbook fields and the panel-review columns that were in the dictionary but missing from the SQL; `users.email` (ADR-048); archiving without a reason (ADR-047).

## Questions for the team's approval

No decision or code shape settles these. The drafts hold a working answer so they load; approving means saying yes or changing it.

- [ ] **Ids.** Keep `BIGINT UNSIGNED` surrogate keys (rule K-1)? The mock uses readable string ids.
- [ ] **Column lengths** on everything new (`section` 60, `collected_by_name` 120, `recipient` 150 and others). The code sets no limit.
- [ ] **`section`:** free text, as now, or a lookup table once the registrar's list is known? The same for `grade_level_at_time`: text, as now, or a key to `grade_levels`?
- [ ] **`personnel.type`:** free text checked by the service, as now, or a lookup table? The clinic and the registrar still give the real groups.
- [ ] **`staff_number`:** CLINIQ's `STF-0001`, or the school's own employee number?
- [ ] **Staff health entries and contacts:** separate tables, as drafted (a CHECK on a CASCADE column breaks rule F-2), or one shared table?
- [ ] **Who was called for a staff patient:** `parent_notification_attempts.contact_id` points at student contacts only, and the mock keeps a name, relationship and phone snapshot that the table does not hold.
- [ ] **`audit_logs.subject_student_id`** has no staff twin.
- [ ] **`users.email`:** unique? And where do reset tokens live (Laravel's default table)?
- [ ] **`students.health_reviewed_at`:** ADR-049 and ADR-051 leave it with no use. Drop it?
- [ ] **Batches on a medicine line:** the mock keeps allocations on the line and on the transaction; the draft keeps them on the transaction only.
- [ ] **Letter draft values:** the mock holds them on the visit; the draft holds them on a `draft` row. Is `snapshot_text` the stored `body`?
- [ ] **Vitals ranges, `personnelTypes`, `showFrequentVisitors`:** not numbers, so not in `system_settings` as it stands.
- [ ] **Retention of staff patients:** no decision names a period.
- [ ] **Audit retention:** 10 years still needs the school's confirmation (D-09).
- [ ] **Indexes** on the new tables were not measured; `ERD.md` section 10 is the first draft's run.

## Checks still owed

- The 107 constraint tests and the stress load of `ERD.md` section 10 were run on the first draft, and their scripts are not in the repository. The update was loaded on MariaDB 10.11 with spot checks only.
- Not loaded on MySQL 8.
