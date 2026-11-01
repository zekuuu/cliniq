# ERD Review

**Status: Approved by Zean, Sunday, November 1, 2026 — 01:39 PHT (ADR-057); changes after this go through a new decision.** Rewritten Saturday, October 31, 2026 — 20:31 PHT and extended 22:08 PHT. Answered and applied Sunday, November 1, 2026 — 01:55 PHT (ADR-057): the checklist below is answered, all 30 gaps are closed in the drafts, `Reference-Schema.sql` loads, and `Checks/constraint-tests.sql` passes 191 of 191.

## Now in the drafts

Staff patients and the exactly-one-patient rule (ADR-043, ADR-053); batches and allocations (ADR-030, ADR-035); `birth_date`, no student `contact_number` (ADR-054); `section`, `grade_level_at_time`, `section_at_time` (ADR-047); `resting_in_clinic`; extra complaint tags (ADR-053); collected-by, stay-home, stored wording, voided and superseded letters (ADR-049); avoid-if-allergic words and brand; Acknowledge (ADR-048); backup locations and a result per location (ADR-052); `print` and `view` audit actions; the 10-year audit retention setting; the starting values in `system_settings` (ADR-051); the visit logbook fields and the panel-review columns that were in the dictionary but missing from the SQL; `users.email` (ADR-048); archiving without a reason (ADR-047).

## Questions for the team's approval

Each carries its answer. The drafts changed only where an answer required it.

- [x] **Ids. Keep `BIGINT UNSIGNED` surrogate keys (rule K-1). Printed documents carry a readable reference number, `EL-2026-00001` and `IR-2026-00001`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Column lengths Approved as drafted. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`section`: Free text for now, and `grade_level_at_time` too. A lookup table is a `LATER` once the registrar's file is known. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`personnel.type`: Free text, checked by the service against the configured list. A lookup table is a `LATER`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`staff_number`: CLINIQ's own `STF-0001`. An optional school employee-number column is a `LATER`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Staff health entries and contacts: Separate tables, as drafted. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Who was called for a staff patient: `parent_notification_attempts` holds a snapshot (name, relationship, phone, source), as the mock does. `contact_id` is gone. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`audit_logs.subject_student_id` Its twin `subject_personnel_id` is added. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`users.email`: Unique. Reset tokens live in Laravel's default table. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **`students.health_reviewed_at`: Dropped, with its user column. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Batches on a medicine line: One place: the stock movement. **Checked:** nothing outside `api.ts` reads `ItemGivenLine.batchAllocations`. No screen, report or printout shows it. `StockModals.tsx` shows the movement's own allocations. Inside `api.ts`, lines 2184 and 2216 read it only to return stock to the right batch, and `takeAllocationsFromLastTransaction` already fills it from the movement. So the API derives the line's batches from the movements of that visit or incident and item, in id order, which also keeps the order the last-in-first-returned rule needs. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Letter draft values: On a `draft` row. `snapshot_text` is the stored `body`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Vitals ranges, `personnelTypes`, `showFrequentVisitors`: A small `reference_settings` table (key, text or JSON value), beside the numeric `system_settings`. It is seeded with all four values. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Retention of staff patients: 5 years from the archive date, in `Data-Retention-Policy.md` and the purge of `ERD.md` section 7. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Audit retention: 10 years, settled by Zean. `D-09` and its `DECIDE` are resolved; the figure no longer waits for the school. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Indexes Keep the drafted set, provisional until measured with realistic data (a `LATER`). (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)

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

**Would break a port or the purge.** All 7 fixed in the drafts.

| # | Gap | Evidence | Recommendation | Done |
|---|---|---|---|---|
| G15 | The vitals CHECKs refuse what the mock saves. Temperature 25 to 45, pulse 20 to 300, SpO2 30 to 100, blood pressure pairs. The rule is "warn, never block": a slip such as 370 saves in the mock and fails here. | `chk_vitals_*`; `vitalsWarningRanges` note in `mock-db.json`; `lib/vitals.ts` | Drop the range CHECKs, keep the warnings in the service. | ☑ Done. `chk_vitals_temp` is `>= 0`, `chk_vitals_spo2` is `<= 100`, pulse stays unsigned, `chk_visits_temperature` added. Pulse and oxygen may be 0. A 370 saves and warns. |
| G20 | `inventory_transaction_batches.quantity` is `INT UNSIGNED`, but a return or a write-off stores a negative allocation. Every visit edit that returns stock, and every negative adjustment, would fail. | `api.ts:2071`, `:2190`; schema line 739 | Make it signed `INT`, with a CHECK that it is not 0. | ☑ Done. Signed, with `chk_txn_batch_quantity`. Chosen over a separate return type because the mock already stores a return as a negative allocation, so one row type nets a batch by plain addition. |
| G25 | `audit_logs.target_id` is `BIGINT`, but several targets are not record ids: `draft-<visit>`, `<incident>-<n>` for a notification, a backup's timestamp, a report name, a print's document title. | `api.ts:268`, `:1339`, `:1693`, `:2432` | Keep `target_id` for real records and add a nullable `target_ref VARCHAR(120)`. | ☑ Done, as `target_label VARCHAR(120)`, the name Zean set, with `chk_audit_target`: at least one of the two. |
| G29 | Purge step 2 sets `visit_id` to NULL, but `chk_txn_visit_edit` needs it on a `visit_edited` row, so the purge fails on any student with an edited visit. | `ERD.md` section 7; schema line 724 | Drop that CHECK, or relax it to allow a purged row. | ☑ Done. `chk_txn_visit_edit` dropped: it also refused an incident line edit, which carries no visit. The service sets the link. |
| G30 | The purge never clears `sports_report_students`, whose RESTRICT key then blocks deleting the student. `emergency_contact_verifications.incident_id`, and the two-way key between `visits` and `incidents`, also block its steps. | `ERD.md` section 7; schema lines 499, 505, 579, 796 | Add these to the ordered steps. The mock already reads a missing student as `missing`. | ☑ Done. Steps 1, 2 and 7 of `ERD.md` section 7; owned rows are CASCADE. Tested on a student and a staff patient. |
| G2 | `users` has no `profile_picture`. The mock stores one as a data URL. | `User.profilePicture`, `api.ts:580` | `MEDIUMTEXT`, or a file path once uploads exist. | ☑ Done. `users.profile_picture MEDIUMTEXT`. |
| G7 | `students.grade_level_id` is a key, but the mock treats grade as free text and derives the list from students. An unknown grade fails on the key. | `selectors.ts` `gradeLevels`; `api.ts:794` | Validate against `grade_levels` (422) and read the list from that table. | ☑ Done. No schema change. The contract answers 422 for an unknown grade and reads the list from the table. |

**Shape differences the service must bridge.** All 23 closed.

| # | Gap | Evidence | Recommendation | Done |
|---|---|---|---|---|
| G1 | `chk_users_username_len` wants 3 or more characters. The mock has no limit. | Schema line 47 | Add the same rule to the request. | ☑ Done. Request rule in the contract. |
| G3 | Failed attempts for unknown usernames have no home. | Contract Q6 | Use the cache, not a table. | ☑ Done. Contract Q6. |
| G4 | `students.sex` is nullable, and the mock's `toStudent` reads a missing sex as `female`. | `selectors.ts:242` | Return null and let the record read incomplete. That removes a silent wrong answer. | ☑ Done. The API returns null; the contract says so. |
| G5 | Contacts have one `is_primary` but no order. The mock keeps an ordered list, and an edit that only reorders is audited. | `Student.emergencyContacts`; `changedSummary` | Add `sort_order` to both contact tables. | ☑ Done. `sort_order` on both contact tables. |
| G6 | Health entries have no order, and `uq_health_entry` under a case-insensitive collation refuses "Peanuts" beside "peanuts". The mock allows both. | `Student.allergies`; schema line 189 | Add `sort_order`; de-duplicate in the service. | ☑ Done. `sort_order` on both health tables; the service de-duplicates. |
| G8 | `RecordReview.importedBy` is free text; the draft has `source` and a batch. | `api.ts:819` | Derive the label from `source`. | ☑ Done. Derived in the API. |
| G9 | Disposition changed with a draft in place: `ERD.md` section 9 says the draft is deleted, but the mock refuses the save. | `api.ts:1139`, `:1278` | Follow the mock. The wording in `ERD.md` changes with the approval. | ☑ Done. `ERD.md` now follows the mock. |
| G10 | The name-correction reason has no column (contract Q3). | `api.ts:804` | Add `students.name_correction_reason`, or a small history table. | ☑ Done. `students.name_correction_reason VARCHAR(300)`. It holds the latest reason; the audit row marks each correction. |
| G11 | Letter ids: the mock's `draft-<visit>` is a derived id; the draft has one row. | `api.ts:1425` | Return the row id and a `status`. | ☑ Done. In the contract. |
| G12 | `chk_pe_disposition` allows 3 values and `PeReferral.disposition` has 4. | `PeSportsReferralPage.tsx:31` offers 3 | Keep 3 and narrow the API type. | ☑ Done. Three values; the API type narrows. |
| G13 | `treatmentNotes` sits inside `Incident.vitals`, and the column is `incidents.treatment_notes`. Legacy `oxygenSaturation` is free text. | `lib/vitals.ts` | The API merges one `vitals` object. Convert the legacy key in the dev seeder. | ☑ Done. The API merges one object. |
| G14 | Blood pressure is free text in the mock ("120/80"), and two numbers in the draft. The mock accepts any text; only the usual-range note parses it. | `lib/vitals.ts` `usualRangeNotes` | Store numbers; 422 on anything not `NN/NN`. This is a change in behaviour, so it needs a yes. | ☑ **Changed from the recommendation.** Stays text: `blood_pressure VARCHAR(20)`. ADR-051 says a reading warns and never blocks, and "90/P" by palpation is real, so a 422 would block an emergency record. |
| G16 | No name, relationship or `source` on `parent_notification_attempts`, and `contact_id` reaches student contacts only. | `CalledContact` | Add the snapshot columns; drop `contact_id`, since a snapshot needs no key. | ☑ Done. Snapshot columns added, `contact_id` dropped. |
| G17 | `follow_ups.status_reason` is 300 characters; the mock prefixes `Visit entered in error: ` to a reason of up to 300. | `api.ts:1344` | Make it `VARCHAR(340)`. | ☑ Done. `VARCHAR(340)`. |
| G18 | Active item names are unique in the draft and not in the mock (contract Q11). | Schema line 308 | Keep the rule; add `duplicate_item_name`. | ☑ Done. Rule kept, `duplicate_item_name` added (contract Q11). |
| G19 | The draft writes an `opening` ledger row; the mock writes none. The monthly sheet winds back from today's stock, so a counted opening row would make a new item's Total Available 0. | `api.ts:1927`, `:2334` | Keep `opening`, and have the sheet count it with New Purchase. | ☑ Done. In the contract rules. |
| G21 | Allocations on a line (see the list above). The service also needs `stock_after`, which the mock never holds. | `ItemGivenLine.batchAllocations` | Keep on the transaction; join by line. | ☑ Done. See "Batches on a medicine line". |
| G22 | `reports.generated_by_user_id` is required, but the mock's reports have no author, and no function creates a report. | `SeedReport`; `listReports` has no caller | Drop the `reports` table and `listReports` (ADR-050: computed live). | ☑ Done. Table dropped; `listReports` moved to Not endpoints. |
| G23 | `sports_reports.look_back` strings differ from `30`, `60`, `90`, `'school_year'`. | `SportsReportWindow` | Map in the API. | ☑ Done. Mapped in the API. |
| G24 | `chk_backup_verify_ok` refuses verifying a failed run; the mock allows it (contract Q10). `backup_locations.status` defaults to `not_found`; the mock says `found`. | `api.ts:2426`, `:2534` | Keep the draft: the backend really checks the path. | ☑ Done. Draft kept (contract Q10). |
| G26 | `audit_logs.summary` is 255 characters, and a long changed list can exceed it. | `changedSummary` | Truncate at a field boundary in the service. | ☑ Done. In the dictionary. |
| G27 | `showFrequentVisitors` is a boolean with no row, though `value_type` allows `bool`. | `mock-db.json` | Add the row. | ☑ Done. In `reference_settings`, not `system_settings`, per the answer above. |
| G28 | `getGradeLevels` returns grades in use; the table returns every grade. | `selectors.ts` | Use the table. | ☑ Done. In the contract. |

### In the draft, used by nothing

`users.is_head_nurse` (D-04), `users.password_changed_at`, `students.health_reviewed_at` and its user, `student_health_entries.note` and three of its five kinds, `inventory_items.archived_at`, `pe_referrals.visit_id` and `incident_id` (D-18), `audit_logs.client_ip`, `triage_checks`, `emergency_contact_verifications`, `student_import_batches` (the import is not built), `reports`. Keeping a Spec table costs nothing. `reports` and `health_reviewed_at` are gone.

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
- **Archive and "never deleted".** Keep explicit `archived_at` with no global soft delete. The purge is fixed (G29, G30) and tested. Owned rows go with their parent; shared references stay RESTRICT.
- **Audit table.** Append-only: the application's account gets `SELECT` and `INSERT` only on it, and no route changes a row. Columns as drafted, plus `target_label` (G25) and the staff twin `subject_personnel_id`. Actor role is stored (D-01, ADR-057 item 12).
- **Audit retention: 10 years** (ADR-037, ADR-051). The worst case measured is 1.5 million rows, about 390 MB. Settled by Zean (ADR-057).
- **Quantities and money.** The system holds no money. Quantities stay whole numbers, signed where stock can go negative.
- **Temperature.** Done: `DECIMAL(5,2)`. The screens show two decimals, and the mock keeps them.
- **Time.** `DATETIME` in Philippine time and `DATE` for calendar facts, as drafted (T-1 to T-3).
- **Character set.** `utf8mb4` with `utf8mb4_unicode_ci`. Its case-insensitive matching is what the duplicate warning wants; G6 is its one side effect.
- **Indexes.** Keep the drafted set, provisional until measured. Re-run the stress load on realistic data before adding any; the first candidate is `students (archived_at, full_name)` for the default list.
- **Migration order.** `ERD.md` section 13, one migration per module, the visit and incident key last.
- **Laravel's own tables.** Use the `file` drivers for now. Do not publish Sanctum's `personal_access_tokens` migration, since no tokens are issued (ADR-056). Add `password_reset_tokens` with ADR-048 item 3.
- **Seed plan.** `mock-db.json` becomes a development-only seeder that reads the file and writes its own rows; the file itself stays where it is. Real seed data (grades, complaint types with the nurse's sign-off, items, accounts) is kept apart, and only `grade_levels` and `system_settings` ship with the product.

## Approval checklist additions

The list under "Questions for the team's approval" stays. These join it.

- [x] **Accept G2, G7, G15, G20, G25, G29 and G30 (must-fix). Accepted and fixed. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Accept the shape gaps Accepted as recommended, except G14: blood pressure stays text (see the row). (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Drop `reports` and `students.health_reviewed_at`. Both dropped. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Actor role on audit rows (D-01).** Stored; ADR-057 item 12 amends ADR-017 (answered Sunday, November 1, 2026 — 02:16 PHT, Zean: as recommended)
- [x] **Reference number format. `EL-YYYY-NNNNN` and `IR-YYYY-NNNNN`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Answer contract questions Q3, Q6, Q7, Q9 and Q10 Answered in `API-Contract.md`. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)
- [x] **Head Nurse flag (D-04), referral status (D-05), name parts (D-15), role storage (D-16). Defaults of `ERD.md` section 11 kept; D-04 and D-05 can still change with the client's answer, at the cost shown there. (answered Sunday, November 1, 2026 — 01:23 PHT, Zean: best approach)

## Checks

- Sunday, November 1, 2026 — 01:55 PHT: `Reference-Schema.sql` loaded on MariaDB 10.11.16: 44 tables, 431 columns, 73 CHECKs. `Checks/constraint-tests.sql` passed 191 of 191: every CHECK and UNIQUE, the composite keys, delete behaviour, and the purge run end to end. These replace the first draft's 107 tests, whose scripts were never in the repository.
- Not repeated: the stress load of `ERD.md` section 10. Its figures are the first draft's (`LATER`).
- Not loaded on MySQL 8. MariaDB is the target; see `ERD.md` rule F-2.
