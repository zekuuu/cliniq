# Decisions build, Part 2: student and incident records

Date/Day/Time: Friday, October 30, 2026 — 00:02 PHT
Agent: Claude Code (Opus 5.5)
Task: Build Part 2 of the decisions-sheet answers (ADR-047, ADR-049, ADR-051): five `FIX` entries on student and incident records.
Status: Completed
Prompt/Request: The same "Build the fixes that came out of the decisions sheet" prompt, "Parts 1 to 6", on the branch `build/decisions-sheet-answers-oct29`. Part 2: "None recorded" wording for allergies and conditions, "avoid if allergic to" tag, "Student's mobile number", grade and section kept at the time, Additional notes correctable. Defaults D1, D8, D9, D10 and D19 apply.

Files Modified:
- Data layer: `frontend/src/lib/mock-db/api.ts` (`gradeAtTime`, tag cleaning, `IncidentApprovedError`, Stage 2 `generalNotes`), `seed.ts` and `store.ts` (`fillGradeAtTime`), `dashboard.ts` (trends by grade read the grade at the time), `frontend/src/types/entities.ts`, `frontend/src/lib/itemsGiven.ts` (`allergyMatches`, `allergyWarningText`), `frontend/src/lib/patients.ts` (`NONE_RECORDED`, `isNoneRecorded`)
- UI: `features/student-records/StudentFormPage.tsx`, `StudentProfilePage.tsx`, `api/studentFormApi.ts`; `features/staff-records/StaffFormPage.tsx`, `StaffProfilePage.tsx`, `api/staffApi.ts`; `features/inventory/InventoryFormPage.tsx`, `InventoryDispensePage.tsx`, `StockModals.tsx`, `api/inventoryApi.ts`; `components/forms/ItemsGivenField.tsx`, `InventoryItemPicker.tsx`; `features/clinic-visits/api/visitLogApi.ts`; `features/emergency-response/api/incidentLogApi.ts`, `IncidentEntryPage.tsx`, `api/incidentEntryApi.ts`
- Tests: new `features/student-records/RecordsDecisions.test.tsx` (9 tests); `StudentFormPage.test.tsx` and `features/back-navigation.test.tsx` (new label, "None recorded", allergies and conditions optional, 6 instead of 8 invalid fields)
- Docs: `Module-Overview.md`, `Screen-Inventory.md`, `Audit-Coverage.md`, `frontend/src/lib/mock-db/README.md`, ADR-047 and ADR-049 status lines, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:
- **"None recorded" (D1).** The form suggestion reads "None recorded"; an empty field shows "None recorded" (edit forms prefill it, add forms show it as a placeholder; profiles show "None recorded." for both allergies and conditions, replacing "No medical conditions recorded."). Typed "None" or "None recorded" is stored as no entry (`isNoneRecorded`). The alert card, picker and printouts already said "None recorded". The mock data held no typed "None", so nothing changed there. The incomplete-records rule never read these fields and is unchanged. **Default changed:** allergies and conditions are no longer required on Add/Edit Student (they were "Enter allergies, or write None."). An empty field now reads exactly like the "None recorded" choice, so requiring it only adds typing; Part 5's required-mark audit builds on this. Zean can ask for it back.
- **Student's mobile number (D10).** Label "Student's mobile number (optional)"; the profile and its printout say "Student's mobile number". It was already optional and outside the completeness rule since October 26, 2026, so the seed, integrity check and rule needed no change.
- **Avoid if allergic to (D8).** `InventoryItem.avoidIfAllergicTo` (PROVISIONAL): set on Add/Edit Item (comma-separated, distinct, first spelling kept), shown in the Batches dialog, and audited ("Updated avoid if allergic to"); an item that never had tags keeps no field. The visit and incident picker and the Dispense page show "Avoid if allergic to penicillin: this patient lists penicillin." when a patient's allergy entry mentions the word. Never blocks. No seed item carries a tag (none matched a seeded allergy realistically).
- **Grade at the time (D9).** `Visit.gradeLevelAtTime` and `Incident.gradeLevelAtTime` (PROVISIONAL) set on save for students; the Visit and Incident Logs, the Student Profile history and the Dashboard trends by grade read it. Older records get the student's current grade once (`fillGradeAtTime`). Student records have no section, so `sectionAtTime` was not added. Staff records get none.
- **Additional notes (D19).** Editable on Stage 2 until the incident report is approved; a change is part of the Stage 2 `update` audit entry ("…; included corrected additional notes"). After approval the data layer refuses a change (`IncidentApprovedError`) and Stage 2 shows the notes read-only.
- Staff patients: "None recorded" and the allergy warning apply to staff too; grade at the time does not.

Reason: ADR-047 point 5, ADR-049 and ADR-051 item 9, and the five Part 2 `FIX` entries of "Decisions sheet answers".

Testing Performed:
- Typecheck pass, build pass, lint unchanged from the baseline (1 error, 2 warnings, both pre-existing). Tests: 12 failed and 765 passed of 777; the 12 are the baseline failures (the sync test still fails for its baseline reason, "expected 0 to be greater than 0").
- Screens in the running app (Playwright Chromium headless shell, screenshots outside the repository): Add Student, Edit Student, Student Profile (Staff and Admin), Edit Staff, Staff Profile, Edit Inventory Item, Inventory with the Batches dialog (Staff and Admin), Incident Stage 2, Visit Log and Incident Log (Staff and Admin), at 1440, 768 and 390 px. No horizontal scroll; axe-core: no violations.

Known Issues: the pre-existing 12 failing tests and 1 lint error remain.

Next Steps: Part 3 (Admin, audit and Dashboard).
