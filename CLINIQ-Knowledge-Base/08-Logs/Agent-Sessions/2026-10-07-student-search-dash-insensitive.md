Date/Day/Time: Wednesday, October 07, 2026 — 20:56 PHT
Agent: Claude Code (Opus 5.5)
Task: Make the New Visit student search find a Student Number typed without its dash, instead of auto-inserting the dash
Status: Completed
Prompt/Request: "Or not automatically but if they type 202601, it should search the record even if the record has dash" (follow-up to the 20:55 auto-dash change, which this replaces)
Files Modified: frontend/src/components/forms/StudentPicker.tsx, frontend/src/lib/mock-db/selectors.ts, frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx, frontend/src/lib/mock-db/search.test.ts, .claude/skills/cliniq-combobox-patterns/SKILL.md, 04-Development/Skills-Setup.md, 08-Logs/Frontend-Changelog.md
Changes Made: Removed the 20:55 auto-dash formatting, so the query stays exactly as typed. In the `searchStudents` selector, a query of only digits and dashes is compared to Student Numbers with the dashes removed on both sides ("202600001", "2026-00001" and "20260" all match by prefix). Name matching is unchanged. StudentPicker auto-highlights for Enter when the query is a full number with or without the dash (`/^\d{4}-?\d{5}$/`).
Reason: The requester preferred dash-free typing to work over formatting the field.
Testing Performed: `npx tsc -b` clean. Visit feature, regression, and data-layer search tests 70/70 pass. New assertions: "202600001" finds Gian Quizon in the selector and in the picker (the field keeps "202600001", and Enter picks), and "20260" returns only 2026-0… numbers. Not re-checked live in the browser.
Known Issues: The requester's example "202601" matches a number starting 2026-01…; the current seed has no such student (2026 numbers are 2026-0000N), so it shows "no match" there.
Next Steps: None.
