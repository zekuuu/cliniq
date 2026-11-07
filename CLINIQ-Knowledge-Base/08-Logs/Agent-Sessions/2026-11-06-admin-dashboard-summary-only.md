Date/Day/Time: Friday, November 06, 2026 — 14:49 PHT
Agent: Claude Code (Opus 5.5)
Task: Remove the action sections and chips from the Admin dashboard
Status: Completed
Prompt/Request: "in admin account, remove the needs attention and todo, then also the chips, only keep the summary and rest"
Files Modified:
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/review-round-2.test.tsx
Changes Made:
- The "Needs attention now" and "To do" sections and the attention chip row now render only for Staff (`canNavigate`). Before, Admin saw the two headings with no cards under them, plus non-link chips.
- Admin/Principal's Overview now shows the Activity summary (with its Monthly Report link), then the sections below it. Staff is unchanged.
- Added a test: Admin sees only the "Activity summary" heading and no attention chips.
Reason: The action sections and chips are the nurse's work queue; Admin cannot act on them.
Testing Performed: `npx vitest run` on the dashboard, review-round-2, ui-review-regressions and AdminAuditDashboardDecisions tests: 105 passed, 2 failed. Both failures are R9 yearly-calendar tests in review-round-2.test.tsx and come from the uncommitted yearly calendar redesign already in the working tree, not from this change.
Known Issues: The two R9 yearly-calendar tests need updating for the calendar redesign.
Next Steps: Update the R9 tests with the calendar redesign work.
