# ERD Review

**Status: the approval checklist.** Rewritten Saturday, October 31, 2026 — 20:31 PHT. `ERD.md`, `Data-Dictionary.md`, `Reference-Schema.sql` and `Diagrams/ERD-*` now carry the accepted decisions up to ADR-056 and the frontend's data shapes (104 exported functions in `frontend/src/lib/mock-db/api.ts`). They stay a proposed draft, not final or approved. Extended Saturday, October 31, 2026 — 22:08 PHT with the coverage matrix, the provisional fields, the recommendations and the checklist additions below (Part 1 of the backend preparation). What waits for the team is below, plus the open items in `ERD.md` sections 11 and 12. No migration, seeder or model with columns is built before that (ADR-056).

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

## Coverage matrix

Each entity and each group of mock functions against the tables that hold it. Gap numbers refer to the next section. The check covers all 104 exported functions of `api.ts` at commit `b0a0fed7`.

| Mock entity | Functions | Tables | Gaps |
|---|---|---|---|
| `User` | `listUsers`, `getUser`, `getPrincipalName`, `saveUser`, `setUserActive`, `resetUserPassword` | `users`, `password_histories` | G1, G2 |
| `devAccounts`, sign-in | `authenticateMockUser`, `changeOwnPassword`, `changeMockPassword`, `logoutMockSession` | `users`, `password_histories` | G2, G3 |
| `Student` | `listStudents`, `searchStudents`, `getStudent`, `checkStudentDuplicates`, `saveStudent`, `archiveStudent`, `getStudentHistory` | `students`, `student_health_entries`, `emergency_contacts` | G4, G5, G6, G7 |
| `RecordReview` | `getIncompleteRecordQueue`, `saveStudent` | `student_record_reviews` | G8 |
| `Personnel` | `listPersonnel`, `getPersonnel`, `searchPersonnel`, `savePersonnel`, `archivePersonnel`, `getPersonnelHistory`, `getPersonnelTypes`, `getPersonnelDepartments` | `personnel`, `personnel_health_entries`, `personnel_emergency_contacts` | G5, G6 |
| `Visit` | `listVisits`, `getVisit`, `recordVisit`, `updateVisit`, `markVisitEnteredInError` | `visits`, `visit_extra_complaints`, `treatment_item_lines` | G9, G10 |
| `ExcuseLetterApproval`, draft | `getExcuseLetterApproval`, `getExcuseLetterById`, `getStudentExcuseLetters`, `listPendingExcuseLetters`, `approveExcuseLetter`, `issueReplacementExcuseLetter` | `excuse_letters` | G11 |
| `PeReferral` | `submitPeReferral` | `pe_referrals` | G12 |
| `Incident` | `listIncidents`, `getIncident`, `saveIncidentStageOne`, `completeIncidentStageTwo`, `getIncidentTrail`, `listApprovedIncidentReportIds`, `approveIncidentReport`, `acknowledgeIncidentReport` | `incidents`, `incident_vital_readings`, `hospital_referrals`, `incident_report_approvals`, `treatment_item_lines` | G13, G14, G15 |
| `ParentNotificationAttempt` | `addParentNotification`, `completeIncidentStageTwo` | `parent_notification_attempts` | G16 |
| `FollowUp` | `listFollowUps`, `setFollowUpStatus`, `rescheduleFollowUp` | `follow_ups` | G17 |
| `InventoryItem`, batches | `listInventory`, `getInventoryItem`, `saveInventoryItem`, `restockInventoryItem` | `inventory_items`, `inventory_batches`, `inventory_item_allergy_words` | G18, G19 |
| `InventoryTransaction` | `dispenseInventoryItem`, `adjustInventoryStock`, `listInventoryHistory`, `getMonthlyReport` | `inventory_transactions`, `inventory_transaction_batches` | G19, G20, G21 |
| `Report` | `listReports`, `getMonthlyReport` | `reports` | G22 |
| `SportsReport` | The 7 Sports Report functions | `sports_reports`, `sports_report_students` | G23 |
| `BackupLog`, `BackupLocation` | `getBackupStatus`, `verifyLatestBackup`, `recordBackupNow`, the 3 location functions | `backup_logs`, `backup_locations`, `backup_location_results` | G24 |
| `CalendarEvent`, `Holiday`, Dashboard | `getDashboardSummary`, `listClusterAlerts`, `getCalendarDays`, `getHolidays`, the 4 event functions | `calendar_events`, `holidays`, `holiday_sync_runs`, read models | None |
| `AuditLogEntry` | `listAuditLog`, `recordView`, `recordPrint`, every write | `audit_logs` | G25, G26 |
| `IssueReport` | `createIssueReport`, `listIssueReports` | `issue_reports` | None |
| `config`, vocabularies | The 7 reference getters, `getAdminIdleMinutes` | `system_settings`, `complaint_types`, `triage_steps`, `grade_levels` | G27, G28 |
| Retention | None in the mock | Purge procedure, `ERD.md` section 7 | G29, G30 |

### Gaps

**Would break a port or the purge.** Fix these in the draft once approved.

| # | Gap | Evidence | Recommendation |
|---|---|---|---|
| G15 | The vitals CHECKs refuse what the mock saves. Temperature 25 to 45, pulse 20 to 300, SpO2 30 to 100, blood pressure pairs. The rule is "warn, never block": a slip such as 370 saves in the mock and fails here. | `chk_vitals_*`; `vitalsWarningRanges` note in `mock-db.json`; `lib/vitals.ts` | Drop the range CHECKs, keep the warnings in the service. |
| G20 | `inventory_transaction_batches.quantity` is `INT UNSIGNED`, but a return or a write-off stores a negative allocation. Every visit edit that returns stock, and every negative adjustment, would fail. | `api.ts:2071`, `:2190`; schema line 739 | Make it signed `INT`, with a CHECK that it is not 0. |
| G25 | `audit_logs.target_id` is `BIGINT`, but several targets are not record ids: `draft-<visit>`, `<incident>-<n>` for a notification, a backup's timestamp, a report name, a print's document title. | `api.ts:268`, `:1339`, `:1693`, `:2432` | Keep `target_id` for real records and add a nullable `target_ref VARCHAR(120)`. |
| G29 | Purge step 2 sets `visit_id` to NULL, but `chk_txn_visit_edit` needs it on a `visit_edited` row, so the purge fails on any student with an edited visit. | `ERD.md` section 7; schema line 724 | Drop that CHECK, or relax it to allow a purged row. |
| G30 | The purge never clears `sports_report_students`, whose RESTRICT key then blocks deleting the student. `emergency_contact_verifications.incident_id`, and the two-way key between `visits` and `incidents`, also block its steps. | `ERD.md` section 7; schema lines 499, 505, 579, 796 | Add these to the ordered steps. The mock already reads a missing student as `missing`. |
| G2 | `users` has no `profile_picture`. The mock stores one as a data URL. | `User.profilePicture`, `api.ts:580` | `MEDIUMTEXT`, or a file path once uploads exist. |
| G7 | `students.grade_level_id` is a key, but the mock treats grade as free text and derives the list from students. An unknown grade fails on the key. | `selectors.ts` `gradeLevels`; `api.ts:794` | Validate against `grade_levels` (422) and read the list from that table. |

**Shape differences the service must bridge.** Decide each one.

| # | Gap | Evidence | Recommendation |
|---|---|---|---|
| G1 | `chk_users_username_len` wants 3 or more characters. The mock has no limit. | Schema line 47 | Add the same rule to the request. |
| G3 | Failed attempts for unknown usernames have no home. | Contract Q6 | Use the cache, not a table. |
| G4 | `students.sex` is nullable, and the mock's `toStudent` reads a missing sex as `female`. | `selectors.ts:242` | Return null and let the record read incomplete. That removes a silent wrong answer. |
| G5 | Contacts have one `is_primary` but no order. The mock keeps an ordered list, and an edit that only reorders is audited. | `Student.emergencyContacts`; `changedSummary` | Add `sort_order` to both contact tables. |
| G6 | Health entries have no order, and `uq_health_entry` under a case-insensitive collation refuses "Peanuts" beside "peanuts". The mock allows both. | `Student.allergies`; schema line 189 | Add `sort_order`; de-duplicate in the service. |
| G8 | `RecordReview.importedBy` is free text; the draft has `source` and a batch. | `api.ts:819` | Derive the label from `source`. |
| G9 | Disposition changed with a draft in place: `ERD.md` section 9 says the draft is deleted, but the mock refuses the save. | `api.ts:1139`, `:1278` | Follow the mock. The wording in `ERD.md` changes with the approval. |
| G10 | The name-correction reason has no column (contract Q3). | `api.ts:804` | Add `students.name_correction_reason`, or a small history table. |
| G11 | Letter ids: the mock's `draft-<visit>` is a derived id; the draft has one row. | `api.ts:1425` | Return the row id and a `status`. |
| G12 | `chk_pe_disposition` allows 3 values and `PeReferral.disposition` has 4. | `PeSportsReferralPage.tsx:31` offers 3 | Keep 3 and narrow the API type. |
| G13 | `treatmentNotes` sits inside `Incident.vitals`, and the column is `incidents.treatment_notes`. Legacy `oxygenSaturation` is free text. | `lib/vitals.ts` | The API merges one `vitals` object. Convert the legacy key in the dev seeder. |
| G14 | Blood pressure is free text in the mock ("120/80"), and two numbers in the draft. The mock accepts any text; only the usual-range note parses it. | `lib/vitals.ts` `usualRangeNotes` | Store numbers; 422 on anything not `NN/NN`. This is a change in behaviour, so it needs a yes. |
| G16 | No name, relationship or `source` on `parent_notification_attempts`, and `contact_id` reaches student contacts only. | `CalledContact` | Add the snapshot columns; drop `contact_id`, since a snapshot needs no key. |
| G17 | `follow_ups.status_reason` is 300 characters; the mock prefixes `Visit entered in error: ` to a reason of up to 300. | `api.ts:1344` | Make it `VARCHAR(340)`. |
| G18 | Active item names are unique in the draft and not in the mock (contract Q11). | Schema line 308 | Keep the rule; add `duplicate_item_name`. |
| G19 | The draft writes an `opening` ledger row; the mock writes none. The monthly sheet winds back from today's stock, so a counted opening row would make a new item's Total Available 0. | `api.ts:1927`, `:2334` | Keep `opening`, and have the sheet count it with New Purchase. |
| G21 | Allocations on a line (see the list above). The service also needs `stock_after`, which the mock never holds. | `ItemGivenLine.batchAllocations` | Keep on the transaction; join by line. |
| G22 | `reports.generated_by_user_id` is required, but the mock's reports have no author, and no function creates a report. | `SeedReport`; `listReports` has no caller | Drop the `reports` table and `listReports` (ADR-050: computed live). |
| G23 | `sports_reports.look_back` strings differ from `30`, `60`, `90`, `'school_year'`. | `SportsReportWindow` | Map in the API. |
| G24 | `chk_backup_verify_ok` refuses verifying a failed run; the mock allows it (contract Q10). `backup_locations.status` defaults to `not_found`; the mock says `found`. | `api.ts:2426`, `:2534` | Keep the draft: the backend really checks the path. |
| G26 | `audit_logs.summary` is 255 characters, and a long changed list can exceed it. | `changedSummary` | Truncate at a field boundary in the service. |
| G27 | `showFrequentVisitors` is a boolean with no row, though `value_type` allows `bool`. | `mock-db.json` | Add the row. |
| G28 | `getGradeLevels` returns grades in use; the table returns every grade. | `selectors.ts` | Use the table. |

### In the draft, used by nothing

`users.is_head_nurse` (D-04), `users.password_changed_at`, `students.health_reviewed_at` and its user, `student_health_entries.note` and three of its five kinds, `inventory_items.archived_at`, `pe_referrals.visit_id` and `incident_id` (D-18), `audit_logs.client_ip`, `triage_checks`, `emergency_contact_verifications`, `student_import_batches` (the import is not built), `reports`. Keeping a Spec table costs nothing; `reports` and `health_reviewed_at` should go.

## Provisional fields

Recommendations for the list in `Backend-Readiness-Checklist.md` section 2.

| Field | Options | Recommendation |
|---|---|---|
| Excuse-letter draft and approval | (a) One `excuse_letters` row with a status, as drafted; (b) draft on the visit, approval in its own table, as the mock | (a). `snapshot_text` is the stored `body`; `recipient` stays its own column. |
| `Visit.referredTo` | Column on `visits`, or a link to `hospital_referrals` | Column, as drafted. |
| `Incident.generalNotes` | Column, or inside vitals | Column, as drafted. |
| `itemsGiven` lines | Own table, or JSON | Own table, `treatment_item_lines`, as drafted. |
| Inventory adjustment type and note | Columns, or a reason table | Columns with the CHECK; the reason list changes code. |
| Calendar events | Table, as drafted | Accept. |
| Issue reports | Table, as drafted | Accept. |
| PE referrals | Standalone with optional links, or auto-create a visit | Standalone (D-18). |
| Record reviews | One row per open review, as drafted | Accept, with G8. |
| Vitals shape | (a) Readings rows; (b) columns on `incidents` | (a), merged to one object by the API (D-17). The mock overwrites Stage 1 readings at Stage 2, so the API shows the latest value of each. |

## Decided changes, re-checked

All are in the drafts: the birthdate, and the student number dropped (ADR-054); batches (ADR-030, ADR-035); follow-ups with stay-home and status reason; extra complaint tags (ADR-053); staff patients (ADR-043); computed reports with Sunday to Saturday weeks (ADR-050, ADR-055: nothing stored).

Corrected in this review, as small logged fixes to already decided facts: the LRN is locked after creation (ADR-028 note), and D-06 and D-07 are closed. `ERD.md` rule K-2, its scenario rows and the `lrn` row of `Data-Dictionary.md` said otherwise.

## Recommendations

- **Ids.** Keep `BIGINT UNSIGNED`; the API returns them as strings, so the frontend's string ids still fit.
- **Printed reference numbers.** `EL-2026-00001` and `IR-2026-00001`, from `number_sequences` scoped by year, taken in the approving transaction so a failed approval uses no number.
- **Archive and "never deleted".** Keep explicit `archived_at` with no global soft delete. Keep `RESTRICT` except for the profile parts. Fix the purge (G29, G30) before it is ever switched on.
- **Audit table.** Append-only: the application's account gets `SELECT` and `INSERT` only on it, and no route changes a row. Columns as drafted, plus `target_ref` (G25) and a staff twin of `subject_student_id`. Actor role is stored (D-01), which needs ADR-017 amended.
- **Audit retention: 10 years** (ADR-037, ADR-051). The worst case measured is 1.5 million rows, about 390 MB. The school's confirmation is still owed.
- **Quantities and money.** The system holds no money. Quantities stay whole numbers, signed where stock can go negative.
- **Temperature.** Make `DECIMAL(4,1)` into `DECIMAL(5,2)`: the screens show two decimals, and the mock keeps them.
- **Time.** `DATETIME` in Philippine time and `DATE` for calendar facts, as drafted (T-1 to T-3).
- **Character set.** `utf8mb4` with `utf8mb4_unicode_ci`. Its case-insensitive matching is what the duplicate warning wants; G6 is its one side effect.
- **Indexes.** Keep the drafted set. Re-run the stress load on the updated draft before adding any; the first candidate is `students (archived_at, full_name)` for the default list.
- **Migration order.** `ERD.md` section 13, one migration per module, the visit and incident key last.
- **Laravel's own tables.** Use the `file` drivers for now. Do not publish Sanctum's `personal_access_tokens` migration, since no tokens are issued (ADR-056). Add `password_reset_tokens` with ADR-048 item 3.
- **Seed plan.** `mock-db.json` becomes a development-only seeder that reads the file and writes its own rows; the file itself stays where it is. Real seed data (grades, complaint types with the nurse's sign-off, items, accounts) is kept apart, and only `grade_levels` and `system_settings` ship with the product.

## Approval checklist additions

The list under "Questions for the team's approval" stays. These join it. A gap with a plain fix above is approved by accepting its recommendation.

- [ ] **Accept G2, G7, G15, G20, G25, G29 and G30** (must-fix). Recommended: yes.
- [ ] **Accept the shape gaps** as recommended, or name the ones to change. G14 changes behaviour: blood pressure stops being free text.
- [ ] **Drop `reports` and `students.health_reviewed_at`.** Recommended: yes.
- [ ] **Actor role on audit rows (D-01).** Store it and amend ADR-017. Recommended: yes; it cannot be backfilled later.
- [ ] **Reference number format.** `EL-YYYY-NNNNN` and `IR-YYYY-NNNNN`, or the school's own.
- [ ] **Answer contract questions Q3, Q6, Q7, Q9 and Q10**, which change columns or constraints (`API-Contract.md`).
- [ ] **Head Nurse flag (D-04), referral status (D-05), name parts (D-15), role storage (D-16).** Defaults in `ERD.md` section 11.

## Checks still owed

- The 107 constraint tests and the stress load of `ERD.md` section 10 were run on the first draft, and their scripts are not in the repository. The update was loaded on MariaDB 10.11 with spot checks only.
- Not loaded on MySQL 8.
