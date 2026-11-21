Date/Day/Time: Sunday, November 22, 2026 — 01:59 PHT
Agent: Claude Code (Opus 5.5)
Task: A search box in the top bar for students and staff
Status: Completed
Prompt/Request: "Then I'm thinking about adding another search field on topbar". The agent proposed: students and staff by name, LRN or Staff No.; results scoped by role with the masked LRN; picking opens the profile; reuse the existing patient search. Zean: "do it".
Files Modified:
- frontend/src/layouts/TopBarSearch.tsx (new), frontend/src/layouts/TopBarSearch.test.tsx (new)
- frontend/src/layouts/AppShell.tsx (box for Staff, from xl up; header note)
- frontend/src/components/forms/PatientPicker.tsx (search, option label and option row pulled out as `usePatientSearch`, `patientOptionLabel`, `PatientOption`; behaviour unchanged)
- frontend/src/components/ui/Combobox.tsx (`hideLabel`)
- frontend/src/components/icons/Icon.tsx (`search`)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-086-Top-Bar-Search-For-Students-And-Staff.md (new), Decisions-Summary.md
- .claude/skills/cliniq-combobox-patterns/SKILL.md
Changes Made: see ADR-086. Staff only, because `POST /api/patients/search` is in the backend's `role:staff` group. Shown from 1280 px wide; below that the clock and account menu leave no room.
Reason: Zean's request: reach a person's profile from any screen.
Testing Performed: `tsc -b` clean; ESLint 0 errors (2 new react-refresh warnings in PatientPicker.tsx for the exported hook and label, the same kind as the existing ErrorSummary.tsx one); full Vitest run 1285 of 1285 pass, including 3 new tests (Staff No. match opens the staff profile, a name match opens a student profile, no box for the Admin). No live browser check: the running dev server asked for a real sign-in.
Known Issues: ADR index, Facts sheet and traceability not regenerated (their script). Frontend Context Brief and Frontend Design Reference need a line for the top-bar search (ADR-086).
Next Steps: Zean to look at the box in the running app at the clinic PC's width. Not committed.
