Date/Day/Time: Sunday, November 1, 2026 — 11:58 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Remove the old Missed row after a reschedule
Status: Completed. Nothing committed.
Prompt/Request: "remove the old missed"
Files Modified: `lib/mock-db/api.ts`, `lib/mock-db/selectors.ts`, `FollowUpListPage.tsx`, `contractFixes.test.ts`, `FollowUpListPage.test.tsx`, `API-Contract.md`, `Module-Overview.md`, `Frontend-Changelog.md`
Changes Made: `listFollowUps` leaves out a Missed follow-up that has a later one with the same patient, record and reason. `hasNewDate` is gone. The record itself is not deleted, because archive-not-delete is the retention rule and no decision overrides it.
Reason: Zean does not want the old row on the page.
Testing Performed: Final numbers are in the Changelog row.
Known Issues: The same match limit as before: two separate follow-ups with the same reason on one record. If the first is Missed, it leaves the list.
Next Steps: Part 2.
