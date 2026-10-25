Date/Day/Time: Monday, October 26, 2026 — 04:07 PHT (system clock when this log was written; Part 3 was built between about 03:45 and 03:55)
Agent: Claude Code (Opus 5.5)
Task: ADR-043 part 3: use staff in the clinical flows
Status: Completed
Prompt/Request: "Finish until the last part" (Zean), Part 3 of the build prompt: one patient picker (D10) on New Visit, New Incident (with Stage 2 reopening), follow-up creation and Dispense; Staff No., chip and Everyone / Students / Staff filter on the lists (D11); single-person screens with the name and emergency-contact wording (D12), no excuse letter (D13); the Admin never sees a staff incident (D15); stock for staff.

Files Modified:
- New: frontend/src/lib/patients.ts, frontend/src/components/forms/PatientPicker.tsx, frontend/src/components/forms/PatientFilterSelect.tsx, frontend/src/hooks/usePatientFilter.ts, frontend/src/components/ui/PatientNumber.tsx, frontend/src/features/staff-patients.test.tsx
- frontend/src/components/index.ts, frontend/src/hooks/useIdentifiedStudent.ts (generic over student or patient)
- frontend/src/lib/mock-db/api.ts (`getPatient`; the Part 1 `view()` guard removed; `listIncidents` / `getIncident` take the viewer; `FollowUpView.patient` and the monthly report's `patient` replace `lrn`; `getLatestVisit` picks a student's visit)
- Clinic visits: NewVisitEntryPage.tsx, VisitDetailPage.tsx, VisitLogListPage.tsx, DispositionFields.tsx, api/newVisitApi.ts, api/visitDetailApi.ts, api/visitLogApi.ts
- Emergency response: IncidentEntryPage.tsx, IncidentLogListPage.tsx, IncidentReportPage.tsx, ParentNotificationPage.tsx, FollowUpListPage.tsx, StudentAlertCard.tsx, api/incidentEntryApi.ts, api/incidentLogApi.ts, api/incidentRecordApi.ts
- Inventory: InventoryDispensePage.tsx, api/inventoryApi.ts
- Reports and dashboard lists: ReportsPage.tsx, components/ReportsPrint.tsx, dashboard/components/AlertLists.tsx, DashboardPrint.tsx (due follow-ups), types/dashboard.ts (`DueFollowUpRow.patient`), lib/mock-db/dashboard.ts
- Skills: .claude/skills/cliniq-combobox-patterns/SKILL.md, .claude/skills/cliniq-display-privacy/SKILL.md (and their rows in Skills-Setup.md)
- Tests updated to the new wording and shapes: NewVisitEntryPage, NewVisitEntryLoading, VisitLogic, VisitLogListPage, VisitDetailPage, IncidentEntryPage, IncidentLogListPage, ParentNotificationPage, FollowUpListPage, StockActions, inventoryApi, ReportsPage, print-documents, ui-review-regressions, dashboard.test, sync.test, personnel.test

Changes Made:
- **Patient picker (`PatientPicker`):**
  - It searches students (LRN or name) and staff (Staff No. or name) in one box. Up to 8 results, each with a Student or Staff chip and nothing medical.
  - The field is labelled "Student or staff member", with the placeholder "LRN, Staff No. or name".
  - The picked line shows the masked number, like StudentPicker; the form header shows the full one.
  - It replaces StudentPicker on New Visit, Incident Stage 1 and Dispense. StudentPicker stays on PE Referral and the Sports Report form.
  - A form still never falls back to a default patient.
- **New Visit:**
  - `?staff=` (from the Staff Profile) opens it with the staff member chosen.
  - The header reads "Name · STF-0002 · Teacher · department".
  - The allergy note beside the medicine picker works for staff.
  - For a staff patient, the excuse-letter section is hidden and no draft is sent; the follow-up checkbox says "This staff member needs a follow-up".
  - Parent or guardian is prefilled for students only.
  - "Escalate to incident" carries the staff member.
- **Incident entry:**
  - `?staff=` opens it with the staff member chosen. The picker is PatientPicker.
  - The safety card (allergies, conditions, contacts) works for staff.
  - The notification log is titled "Emergency contact notification log" for staff.
  - Stage 2 reopening loads the incident's patient.
- **Single-person screens:**
  - Visit Details shows Staff and Staff No. for a staff visit. It has no excuse-letter section or card, and an edit never sends a draft.
  - The Incident Report, on screen and printed, shows Staff · name · Staff No. and Type. It says "Emergency contact notification attempts", and the signature line reads "Emergency contact informed".
  - The Notification page is titled "Emergency Contact Notification Log".
  - The excuse-letter page of a staff visit shows its load error (a staff member has no letter).
- **Lists:**
  - Visit Log, Incident Log, Follow-Ups, the Monthly Report's incident register (screen and print), and the Dashboard's due follow-ups (screen and print) show `<PatientNumber>`: the masked LRN or the Staff No., with a Student or Staff chip, never a name.
  - The column is "LRN or Staff No.". Search matches the Staff No.
  - Visit Log, Incident Log and Follow-Ups have a Patient filter (Everyone / Students / Staff, default Everyone), kept in the address as `?patient=`.
  - The Dashboard's due follow-ups link a staff row to the Staff Profile.
- **Admin (D15):** the data layer leaves staff incidents out of `listIncidents` and `getIncident` for the Admin. The Admin's Incident Log keeps the "LRN" column without chips or the filter. A staff incident opened by address shows "Unable to load the incident report."
- **Stock:** medicine given to staff writes `personnelId` on the transaction (Part 1). The Dispense page records for "A student or staff member" or "Not for a person (general use)". Its "already has a visit today" notice works for staff.
- **Root-cause fixes found by the tests:**
  - `getLatestVisit` (used by the excuse letter opened without an id) now picks a student's visit; it could have picked a staff visit.
  - The Parent Notification test pinned a student incident, because the screen's default (no id) is now the newest pending incident, which can be a staff member's.

Reason: ADR-043 items 4 to 7 and 9.

Testing Performed: `staff-patients.test.tsx`, 8 tests:
- the picker returns both kinds, labelled, with nothing medical;
- New Visit from `?staff=` with the allergy shown, no excuse letter and staff follow-up wording, saved with `personnelId`;
- the Visit Log shows Staff and Student chips and no staff name; the filter, with Staff plus Students equal to Everyone;
- Visit Details for staff has no excuse-letter card;
- the Incident Report says emergency contact;
- escalating a staff visit keeps the staff member, and a different patient is refused;
- stock goes down for a staff visit line;
- the Admin's log has no staff incident, and the Admin can't open one.

Full-suite results are in the Part 4 log.

Known Issues: see the Part 4 log (one disposition wording, Dashboard list filter, Admin count mismatch).

Next Steps: Part 4.
