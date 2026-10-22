Date/Day/Time: Thursday, October 22, 2026 — 17:52 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 2 — late entry, entered in error, Resting in clinic, medicine-in-notes hint, Escalate to incident, rename Smart Triage, one search instruction
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 2. Zean then said: "Continue next part and to the last part no stopping". The source is panel review VS-1, VS-4, VS-6, VS-7, VS-8, VS-9, VS-12, EX-3 and ADR-036, with defaults D1, D2, D3 and D13 used unchanged:
- late entry with an optional reason after 30 minutes;
- "Entered in error" with a required reason, stock returned and the letter voided;
- a "Resting in clinic" disposition and an "In clinic now" chip;
- a non-blocking medicine-in-notes hint;
- "Smart Triage" renamed "First-aid checklist";
- the student-search instruction said once;
- "Escalate to incident" on Visit Details and New Visit, with the event counted once.

Files Modified:
- frontend/src/types/entities.ts
- frontend/src/lib/dispositions.ts (new)
- frontend/src/lib/itemsGiven.ts
- frontend/src/lib/mock-db/api.ts
- frontend/src/lib/mock-db/selectors.ts
- frontend/src/lib/mock-db/dashboard.ts
- frontend/src/lib/mock-db/types.ts
- frontend/src/lib/mock-db/integrity.ts
- frontend/src/types/dashboard.ts
- frontend/src/features/clinic-visits/NewVisitEntryPage.tsx
- frontend/src/features/clinic-visits/VisitDetailPage.tsx
- frontend/src/features/clinic-visits/VisitLogListPage.tsx
- frontend/src/features/clinic-visits/ExcuseLetterPage.tsx
- frontend/src/features/clinic-visits/MedicineInNotesHint.tsx (new)
- frontend/src/features/clinic-visits/dispositionValues.ts
- frontend/src/features/clinic-visits/api/newVisitApi.ts
- frontend/src/features/clinic-visits/api/visitDetailApi.ts
- frontend/src/features/clinic-visits/api/visitLogApi.ts
- frontend/src/features/emergency-response/IncidentEntryPage.tsx
- frontend/src/features/emergency-response/IncidentReportPage.tsx
- frontend/src/features/emergency-response/FromVisit.tsx (new)
- frontend/src/features/emergency-response/api/incidentEntryApi.ts
- frontend/src/features/emergency-response/api/incidentRecordApi.ts
- frontend/src/features/dashboard/components/AttentionChips.tsx
- frontend/src/features/reports/components/ReportsPrint.tsx
- frontend/src/features/student-records/StudentProfilePage.tsx
- frontend/src/features/clinic-visits/VisitLogic.test.tsx (new)
- frontend/src/features/clinic-visits/VisitDetailPage.test.tsx
- frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx
- frontend/src/features/dashboard/lib/printSummary.test.ts
- .claude/skills/cliniq-combobox-patterns/SKILL.md (wording only: the checklist's name)
- CLINIQ-Knowledge-Base: 01-Requirements/Features/Module-Overview.md, 03-Design/Screen-Inventory.md, 03-Design/Design-System.md, 03-Design/Reference-Screens.md, 02-Architecture/Database/Data-Dictionary.md, ERD.md, Use-Case-Diagram.md, Data-Flow-Diagram.md, 00-Project-Core/Scope.md, 04-Development/Backend-Readiness-Checklist.md, 04-Development/Development-Phases.md, 06-Decisions/ADR-036 (status: built), 09-References/Canonical-Documents.md, and the canonical CLINIQ_Modules_and_Features.md, CLINIQ_Frontend_Context_Brief.md and CLINIQ_Frontend_Design_Reference.md
- CLINIQ-Knowledge-Base/08-Logs: Changelog.md, Issues-and-TODOs.md, Issues-Done-Archive.md

Changes Made:
- **Late entry (VS-8, D1).**
  - New Visit has a Visit date and a Time field. They show now by default, and the date can't be set after today.
  - The values are sent only when Staff change them, so a form left open is still dated when it is saved.
  - When the time is more than 30 minutes before the change (`LATE_ENTRY_MINUTES`), an optional "Reason for late entry" appears.
  - The data layer refuses a future time and saves `lateEntry` and `lateEntryReason` (PROVISIONAL).
  - The audit summary says "Late entry", never the reason. Visit Details shows "Entered late".
- **Entered in error (VS-9, EX-3, D2).** Visit Details has an "Entered in error" button with a confirmation and a required reason. `markVisitEnteredInError`:
  - keeps the record (`Visit.enteredInError`, PROVISIONAL);
  - returns its medicines through the existing `applyItemLines(..., 'adjust')` path, so they are `visit_edited` adjustments;
  - voids an approved letter (`ExcuseLetterApproval.voided`). A draft is void because its visit is;
  - audits "Marked entered in error" and "Voided: visit entered in error".

  How it shows:
  - One filter in `view()` takes such visits out of every list, count and report. `getVisit` and the Visit Log's "Include entered in error" read them.
  - Edits and letter approval are refused.
  - The Excuse Letter page shows Voided, can't be approved, its fields are locked, and it prints "VOID".
- **Resting in clinic (VS-1, D13).**
  - New disposition `resting_in_clinic`, with no excuse letter: `hasExcuseLetter` is now Sent home or Referred only.
  - Today's resting visits with no Time out count as "in clinic now":
    - `inClinicNow` selector, and `DashboardCounts.inClinicNow`;
    - a Dashboard chip that opens `Visit Log ?inClinic=1`, which shows masked LRNs;
    - an "In clinic now only" filter and chip in the Visit Log.
  - Default disposition and the place of temperature unchanged.
  - The five copies of the disposition labels and tones became one `lib/dispositions.ts`.
  - At 390 px the four-option control is 2×2.
- **Medicine in notes (VS-4).** `itemsNamedInNotes` matches a stocked item's name without its strength: case-insensitive, whole word, names under 4 letters ignored, skipping items that are expired, out of stock or already on a line. `MedicineInNotesHint` shows "This looks like … Add it under Medicines & supplies given so stock stays correct" with an Add button, on New Visit and the Visit Detail edit form. It never blocks.
- **Rename (VS-6).** "Smart Triage" became "First-aid checklist" in the UI, code comments, tests, the combobox skill and the living KB documents. Kept as written:
  - ADR-014, a decision record;
  - Frontend-Loop-Engineering's build notes, a progress record;
  - the ERD's note on ADR-009's module name;
  - the course-submitted Project Plan and Related Systems review;
  - the backend module identifier `SmartTriage` in the Data Dictionary and ERD.
- **One search instruction (VS-12).** Kept the StudentPicker hint. The page subtitle and card description no longer repeat it.
- **Escalate to incident (VS-7, ADR-036, D3).**
  - Visit Details has an "Escalate to incident" button, which opens `/incidents/new?fromVisit=`.
  - New Visit has a secondary "Escalate to incident" button and an emergency hint. They pass what was typed in router state and save no visit.
  - Stage 1 carries over:
    - the student;
    - the complaint, when it is on the incident list; otherwise it goes into Additional notes as "Visit complaint: …";
    - the visit's time, as `saveIncidentStageOne.time`;
    - the temperature.
  - Saving links both ways (`Incident.sourceVisitId`, `Visit.escalatedIncidentId`, PROVISIONAL). The data layer refuses a second escalation, an entered-in-error visit, or another student.
  - The incident (Stage 2, report screen, printout) shows "From visit" with "Given at the visit". Medicines are not copied.
  - `countedVisits` leaves escalated visits out of Dashboard totals and trends, the previous-period comparison, the calendar, frequent visitors, the Monthly Report and saved reports. The Visit Log keeps them with an "Escalated" chip.
  - Emergency-type complaints are the incident complaint list. The one-line Visit-versus-Incident rule is not shown: the clinician's wording does not exist yet (open `DECIDE`; a code comment marks the spot in `NewVisitEntryPage.tsx`).

Reason:
- The panel review findings listed above, and ADR-036 (Zean, Thursday, October 22, 2026 — 15:44).

Testing Performed:
- Typecheck pass.
- Lint: only the pre-existing `Cannot access refs during render` (New Visit, line 262). I removed a new `Date.now()`-during-render error by measuring lateness from the time of the edit.
- `VisitLogic.test.tsx` (10 new tests) covers:
  - late entry flagged and audited, not late within 30 minutes, future refused;
  - entered in error: reason required, stock returned, hidden from lists, kept for the filter, counts drop, edit and approval refused, audit summaries;
  - the Visit Details dialog flow;
  - in clinic now rises and falls with Time out, and resting has no letter;
  - `itemsNamedInNotes` rules;
  - escalation linking, time, counting once and the second-escalation refusal;
  - Visit Details to Stage 1 prefill and the "From visit" block;
  - New Visit to Stage 1 without saving, with the emergency hint;
  - checklist wording and the single instruction.
- Updated without weakening:
  - the Visit Detail test's radio label ("Hospital referral" became the shared "Referred to hospital");
  - the New Visit test title;
  - the print-summary fixtures (`inClinicNow: 0`).
- Related suites: 346 of 348 passed. The two failures (`IncompleteRecordsQueuePage` and the date-sensitive stock test) are baseline.
- Browser:
  - Playwright 1.58 with the installed Chromium 1228 (not Edge), Staff role (visits and incidents are Staff only), at 1440, 768 and 390 px.
  - Screens: New Visit with the late reason, emergency hint, medicine hint and Resting; the Dashboard with "1 in clinic now"; the Visit Log filtered; Visit Details; the Entered-in-error dialog; escalated Stage 1 and Stage 2; Visit Details after Entered in error; the voided Excuse Letter.
  - All looked at. One defect was found and fixed: at 390 px the four-option disposition control squeezed "Resting in clinic". It is now 2×2 below `sm`.
  - No horizontal scroll at any width. axe 0 violations on all nine screens.
  - Screenshots are in the session scratchpad `pw/shots/p2-*`.

Known Issues:
- Follow-ups created from a visit later marked "Entered in error" stay pending. Logged as a `DECIDE`.
- A saved visit's date and time can't be corrected on Visit Details. Late entry is only on New Visit. Logged as a `DECIDE`.
- "In clinic now" counts only today's visits, so a resting visit left without a Time out yesterday does not stay "in the clinic". Logged as a `NOTE`.
- The Excuse Letter page's own changes (dates in the wording, signature, presets, replacement) are Part 3.

Next Steps:
- Part 3 (excuse letters and follow-ups).
