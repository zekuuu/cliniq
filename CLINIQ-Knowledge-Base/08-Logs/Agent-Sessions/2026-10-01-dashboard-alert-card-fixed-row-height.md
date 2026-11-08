# Dashboard Alert Card Fixed Row Height

Date/Day/Time: Thursday, October 01, 2026 — 16:13
Agent: Codex
Task: Remove the remaining uneven/cutout appearance in the three Dashboard alert cards.
Status: Completed
Prompt/Request: “Still not, the middle still cutout before the end of the card, unlike other two they're filled until the end”
Files Modified:
- `frontend/src/features/dashboard/components/AlertLists.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
Changes Made: Added an explicit 26rem desktop grid row for the three alert cards. Their list bodies now remove the desktop `max-h-80` cap and fill the card body, while retaining the 320px cap below the desktop breakpoint. Loading skeletons use the same height rules, and the Dashboard test asserts the shared row-height and list-body classes.
Reason: Different row heights made the old capped list viewport end at different internal points, leaving the middle card visibly short before its outer card edge.
Testing Performed: Dashboard tests passed (14 tests); full Vitest suite passed (49 files, 216 tests); `npm run build` passed; targeted Prettier check passed; `git diff --check` passed.
Known Issues: The unrelated existing `npm run lint` error in `frontend/src/features/issue-reports/ReportIssueModal.tsx` remains documented in `Frontend-Issues-and-TODOs.md`.
Next Steps: None for this layout change.
