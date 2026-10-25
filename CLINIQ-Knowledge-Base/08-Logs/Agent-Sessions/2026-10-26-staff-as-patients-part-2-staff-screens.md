Date/Day/Time: Monday, October 26, 2026 — 04:07 PHT (system clock when this log was written; Part 2 was built between about 03:30 and 03:45)
Agent: Claude Code (Opus 5.5)
Task: ADR-043 part 2: Staff screens and the Patient Care sidebar group
Status: Completed
Prompt/Request: After Part 1, Zean wrote "Finish until the last part", so Parts 2 to 4 of the build prompt "Build teachers and school staff as clinic patients" were run in order in the same session. Part 2: rename the sidebar group "Student Care" to "Patient Care"; add a Staff item (School Clinician only); the `/staff` routes (Admin redirected); Staff List (D7), Staff Profile (D8), Staff Form for add and edit (D3 to D6), Archive (D9); skeleton, empty and error states; audit per D16; tests.

Files Modified:
- frontend/src/routes/paths.ts (`staff`, `staffNew`, `staffProfile`, `staffEdit`, `visitNewForStaff`, `incidentNewForStaff`)
- frontend/src/routes/AppRoutes.tsx (four Staff-only routes)
- frontend/src/layouts/navigation.ts (group "Patient Care"; Staff item for the School Clinician only)
- frontend/src/features/staff-records/ (new): StaffListPage.tsx, StaffProfilePage.tsx, StaffFormPage.tsx, api/staffApi.ts, README.md, StaffPages.test.tsx
- Tests: frontend/src/layouts/AppShell.test.tsx, frontend/src/routes/AppRoutes.test.tsx, frontend/src/routes/BackNavigation.test.tsx

Changes Made:
- Sidebar: "Student Care" is now "Patient Care" for both roles. The School Clinician sees Students, Staff, Visits, Incidents, Follow-Ups. The Admin keeps Students and Incidents and has no Staff item.
- Routes `/staff`, `/staff/new`, `/staff/:personnelId` and `/staff/:personnelId/edit` are Staff-only. An Admin who types one is redirected to the Dashboard, like any other Staff-only screen. Each page also checks the role itself.
- **Staff List:** Full name, Staff No., Type, Department or role and View Profile, with sortable columns. Search by name or Staff No., a Type filter, and "Show archived" (off by default, with an Archived badge). Add Staff button. The Student List has no paging and no shortcut, so neither does this.
- **Staff Profile:**
  - Header with the name, then Staff No. · type · department.
  - Record a visit, Record an incident, Edit and Archive (Archive asks first).
  - The allergy banner, as on the Student Profile.
  - Overview (Staff No., type, department, contact, emergency contacts), Allergies and conditions.
  - Visit, Incident and Follow-up history, eight most recent each.
- **Staff Form:**
  - Required: full name and type (a choice from `config.personnelTypes`).
  - Optional: department or role (free text with suggestions from the values in use, at most 60 characters), contact number, emergency contacts (repeatable, Make primary, Remove), allergies and conditions ("Optional. Comma-separated list, or write None.").
  - A started emergency contact must be complete.
  - The Staff No. shows read only on Edit.
  - Unsaved-change guard and focus on the first error, as on the student form.
  - Saving goes to the profile with a confirmation.
- Audit (D16): add, edit (changed field names) and archive are logged under the target "Staff" by the data layer (Part 1). Opening a profile is not logged, because only the Admin's views are logged and the Admin has no staff screens.
- No staff printout: D8 asks for none (see LATER).

Reason: ADR-043 items 2, 3, 6 and 9.

Testing Performed: `StaffPages.test.tsx`, 6 tests: list columns, search by Staff No., type filter, Show archived, nothing medical inline; profile header, links, history and allergy alert; archive with confirmation and audit; add with validation, focus on the first error, the "None" choice, STF-0013 and the audit entry; edit with the Staff No. read only, a started contact checked, and the audit summary. Updated: the AppShell sidebar tests (Patient Care, Staff item, nav keys), the AppRoutes Admin-redirect list (4 staff routes), and the BackNavigation route coverage. Full-suite results are in the Part 4 log.

Known Issues: none specific to Part 2.

Next Steps: Part 3.
