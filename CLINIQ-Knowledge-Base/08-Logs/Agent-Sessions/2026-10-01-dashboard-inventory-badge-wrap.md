# Dashboard Inventory Badge Wrapping

Date/Day/Time: Thursday, October 01, 2026 — 15:42
Agent: Codex
Task: Refine the Dashboard inventory alert row layout.
Status: Completed
Prompt/Request: “Now for this make the badges stack instead, so it doesnt take space of the names. Or maybe a limit, once the badges reach the names or it wraps the names on the left it starts to go stack, but defaults is horizontally.”
Files Modified:
- `frontend/src/features/dashboard/components/AlertLists.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made: Inventory alert badges remain horizontal by default. The inventory card is now a CSS container, and its badge group switches to a right-aligned vertical stack below 28rem so long item names keep their available width on narrow cards. Added a regression assertion for the responsive classes.
Reason: The previous non-shrinking badge column could force long inventory names to wrap when two badges were shown side by side.
Testing Performed: `npm run build` passed; full Vitest suite passed (49 files, 214 tests); Dashboard tests passed (13 tests); `npm run typecheck` passed; targeted Prettier check passed; `git diff --check` passed. `npm run lint` still reports the pre-existing `react-hooks/set-state-in-effect` error in `frontend/src/features/issue-reports/ReportIssueModal.tsx`, unrelated to this change.
Known Issues: The unrelated lint error remains in `ReportIssueModal.tsx`.
Next Steps: None for this layout change.
