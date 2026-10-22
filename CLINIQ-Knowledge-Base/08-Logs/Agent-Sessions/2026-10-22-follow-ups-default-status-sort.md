Date/Day/Time: Thursday, October 22, 2026 — 14:53 PHT
Agent: Codex (GPT-5)
Task: Change the Follow-ups table default sorting to status
Status: Completed
Prompt/Request: "Change default sorting to status in follow ups"
Files Modified:
- frontend/src/features/emergency-response/FollowUpListPage.tsx
- frontend/src/features/emergency-response/FollowUpListPage.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-22-follow-ups-default-status-sort.md
Changes Made:
- Changed the initial Follow-ups table sort from Due date descending to Status ascending.
- Added a regression test that verifies the active Status sort control and status-ordered initial rows.
Reason:
- The requested default grouping is by follow-up status rather than due date.
Testing Performed:
- Focused Follow-ups test suite passed (4 tests).
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
Known Issues:
- None.
Next Steps:
- None.
