Date/Day/Time: Monday, October 26, 2026 — 04:07 PHT (system clock when this log was written)
Agent: Claude Code (Opus 5.5)
Task: ADR-043 part 4: counts, Audit Log, Privacy Policy and documents
Status: Completed
Prompt/Request: "Finish until the last part" (Zean), Part 4 of the build prompt:
- Dashboard and report totals include staff, with a Students / Staff split (D14).
- The sex and grade-level trends, the Frequent-visitor panel and the Sports Report say "students".
- Audit Log: the Staff target type.
- Privacy Policy: a provisional paragraph (D18).
- The knowledge-base sweep; mark ADR-043 Built.

Files Modified:
- frontend/src/types/dashboard.ts (`DashboardCounts.split`, `PatientSplit`), frontend/src/lib/mock-db/dashboard.ts (the split, via `patientSplit`)
- frontend/src/features/dashboard/components/StatCardRow.tsx, AttentionChips.tsx, DashboardPrint.tsx, ComplaintTrends.tsx, AlertLists.tsx
- frontend/src/features/reports/SportsReportListPage.tsx, frontend/src/features/audit-log/AuditLogPage.tsx, frontend/src/features/legal/PrivacyPolicyPage.tsx, frontend/src/lib/patients.ts (`splitText`)
- New test: frontend/src/features/staff-counts.test.tsx; fixture update: frontend/src/features/dashboard/lib/printSummary.test.ts
- frontend/src/lib/mock-db/README.md
- CLINIQ-Knowledge-Base: 01-Requirements/Features/Module-Overview.md (new section 2a, Access Summary row), 01-Requirements/User-Roles-and-Permissions.md, 03-Design/Screen-Inventory.md (9a to 9c), 04-Development/Audit-Coverage.md, 04-Development/Skills-Setup.md, 06-Decisions/ADR-043 (status Built), 08-Logs/Changelog.md, Issues-and-TODOs.md, Issues-Done-Archive.md

Changes Made:
- **Dashboard:**
  - The totals now count staff: visits in range, incidents in range, in the clinic now, and the calendar's day counts.
  - `counts.split` holds Students and Staff for each total, and each pair sums to its total.
  - The Clinic visits card reads "Students 3 · Staff 2. Incidents are counted separately."; the Incidents card reads "Students 1 · Staff 1 · 2 still at Stage 1".
  - The in-clinic chip reads "1 in clinic now (1 staff)" when a staff member is resting.
  - The Clinic Overview printout notes the split for visits and incidents.
- **Students only:**
  - The Trends card by sex or grade level is captioned "Students' visits and incidents … Staff are not included." Its title is unchanged, so the existing tests still hold.
  - The Frequent-visitor panel says "Students with 3+ visits …; staff are not counted".
  - The Sports Reports page says "Students only; staff are not included".
  - The data was already student-only (Part 1).
- **Audit Log:**
  - The Target filter has "Staff" (Part 1).
  - A staff target's label is its Staff No. (Part 1); it now links to the Staff Profile for the School Clinician.
  - A staff member's visit, incident or follow-up also shows the Staff No.
- **Privacy Policy, section 7:** a paragraph "Teachers and school staff (PROVISIONAL)". It says staff health information is kept only with the staff member's knowledge and consent, is seen only by the School Clinician, and is provisional until the school's privacy officer approves it.
- **Documents:**
  - Module Overview gains section 2a, Staff Patients, and an Access Summary row. Screen Inventory gains 9a to 9c, plus the Patient Care rename.
  - The role matrix now covers staff patients and the Staff No. on lists. Audit Coverage gains the staff rows.
  - The mock-db README is updated, and `features/staff-records/README.md` is new.
  - The two skills and their Skills-Setup rows are updated. ADR-043's status line reads Built.
  - ERD.md and Data-Dictionary.md are not edited: the database design is an open DECIDE.

Reason: ADR-043 item 8, item 10 and the privacy consequence.

Testing Performed:
- **Baseline on `main` at `79bfd39`:**
  - `tsc -b`: clean.
  - `eslint .`: 1 error and 2 warnings (`NewVisitEntryPage.tsx` "Cannot access refs during render"; now at line 281 because lines were added above it).
  - `vitest run`: 17 failed of 705.
  - `vite build`: OK.
- **After Parts 1 to 4:**
  - `tsc -b`: clean.
  - `eslint .`: the same 1 error and 2 warnings.
  - `vitest run`: 733 passed and 16 failed of 749. All 16 failures were already failing in the baseline; none is new.
  - `vite build`: OK.
- **New tests: 36.**
  - Part 1, `personnel.test.ts`: 16.
  - Part 2, `StaffPages.test.tsx`: 6.
  - Part 3, `staff-patients.test.tsx`: 8.
  - Part 4, `staff-counts.test.tsx`: 6, covering:
    - the split sums to its totals and matches the lists for the same range;
    - a staff visit adds to the calendar day and to in-clinic-now;
    - staff visits leave the demographics and frequent visitors unchanged;
    - the Overview printout shows the split;
    - the Audit Log filters to Staff, shown by Staff No. with a link and no name;
    - the Privacy Policy has the provisional paragraph.
- **Screenshots:** taken with the existing playwright-core (1.63) and Chromium 1228, not Edge, from the dev server on port 5187, signed in as `demo.nurse` and `demo.principal`. Widths 1440, 768 and 390. 69 files, kept outside the repository in the session scratchpad (`scratchpad/shots/out/`).
  - **Opened and looked at:** Staff List 1440, Staff Profile 390, Add Staff 390, New Visit for a staff member 1440, Visit Log 1440, Incident Report for staff 768, Follow-Ups 768, Dashboard 1440, Admin Incident Log 1440, Admin `/staff` redirect 390 (lands on the Dashboard).
  - **Scroll:** no page scrolls sideways at any width (scrollWidth minus innerWidth = -15 everywhere).
  - **Fixed after looking:** two search placeholders cut off at 1440 were shortened; the redundant "Student" chip was removed from the Admin's Incident Log.
- **axe-core**, at 1440 and 390 on every route: no violation on a new or changed control. Remaining:
  - `label-content-name-mismatch` on the shared Date range control (Visit Log, Incident Log, Dashboard, Audit Log), already there;
  - `page-has-heading-one` on load-error states (Staff List `?mock=error`, the Admin's staff-incident error), which is the open FIX "Load-error states have no h1".

Known Issues (logged in Issues-and-TODOs):
- The Admin's Dashboard incident count includes staff incidents, but the Admin's Incident Log leaves them out (new DECIDE).
- A staff visit's disposition still reads "Returned to class" (new DECIDE: "Returned to work"?).
- The Dashboard's due follow-ups show the chip but have no Patient filter, and the Staff Profile has no printout (new LATER).
- At 768px the top bar's "CLINIQ" brand overlaps the date and time. This is in the shared header and was not changed here (new FIX).
- The 16 older failing tests and the old lint error are unchanged.

Next Steps:
- Review and commit; nothing is committed or pushed.
- Ask the clinician and the registrar the open DECIDEs: staff types, employee number, privacy-officer consent wording, the database design for two kinds of patient.
- Update the canonical documents (Modules & Features, Project Plan, Frontend Context Brief); the DOC stays open.
