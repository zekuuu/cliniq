Date/Day/Time: Monday, October 26, 2026 — 04:15 PHT
Agent: Claude Code (Opus 5.5)
Task: "Other (type your own)" on the incident Complaint and the Staff Form's Department or role
Status: Completed
Prompt/Request: "Then in incidents complaint, apply also the Other option, also in new staff role/department choosing" (Zean, after the ADR-043 build).

Files Modified:
- frontend/src/components/forms/SelectWithOther.tsx (new), frontend/src/components/index.ts
- frontend/src/features/clinic-visits/ComplaintField.tsx (now a thin wrapper of `SelectWithOther`; same behavior)
- frontend/src/features/emergency-response/IncidentEntryPage.tsx (Stage 1 Complaint)
- frontend/src/features/staff-records/StaffFormPage.tsx (Department or role)
- Tests: frontend/src/features/emergency-response/IncidentEntryPage.test.tsx, frontend/src/features/staff-records/StaffPages.test.tsx
- .claude/skills/cliniq-combobox-patterns/SKILL.md, CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md, 01-Requirements/Features/Module-Overview.md, 08-Logs/Changelog.md, 08-Logs/Issues-and-TODOs.md

Changes Made:
- The visit Complaint's select-plus-Other logic moved, unchanged, into a shared `SelectWithOther`: Other first, visibly selected, revealing a focused text field whose text is the value; the option label is never stored.
- **Incident Complaint (Stage 1):** "Other (type your own)", then the incident complaint types; "Specify other complaint" (at most 60 characters). The saved text is trimmed and spaces collapsed (`cleanComplaint`), on Stage 1 and Stage 2. Blank Other shows the same "Select the emergency complaint." message. The data layer already accepted any complaint text.
- **Staff Form, Department or role:** was a free-text combobox with suggestions; now a dropdown: "Not recorded" (clearable, the field stays optional), "Other (type your own)", then the values already in use. Other reveals "Specify other department or role" (at most 60 characters).
- Skill change, stated for veto: `cliniq-combobox-patterns`, old: the Other path lived only in the visit Complaint field and the department was a free-text Combobox; new: one shared `SelectWithOther` for the visit Complaint, the incident Complaint and the department, and for any future "short list or type your own" field.

Reason: User request.

Testing Performed: new test "offers Other first and saves a typed complaint, trimmed" (Other is the first option, the field takes focus, blank is refused, "  Nosebleed  " saves as "Nosebleed"); the Staff Form add test now picks Other and saves "Guidance office". Affected suites 69/69. Full run: `tsc -b` clean; `eslint .` 1 error and 2 warnings (unchanged, already there); `vitest run` 734 passed, 16 failed, all from the baseline set; `vite build` OK. No new screenshots: the controls are the existing Select and Input, already captured on the visit form.

Known Issues: An escalated visit's complaint that is not an incident type still goes into the notes (ADR-036 behavior), not into Other; left as decided.

Next Steps: none.
