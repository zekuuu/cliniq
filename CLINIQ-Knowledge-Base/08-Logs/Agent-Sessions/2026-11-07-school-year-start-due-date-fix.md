Date/Day/Time: Saturday, November 07, 2026 — 12:24 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Fix the school-year start reminder after the start date is moved later in the same year
Status: Completed
Prompt/Request: Zean, in chat: "where can I see the reminder. i edited the start date nov 10 first then ended the school year to test it".

Files Modified: `frontend/src/lib/schoolYear.ts`, `frontend/src/lib/schoolYear.test.ts`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`.

Changes Made: `nextSchoolYear` put the next start on the start date in the year after the current year began. With the start date set to November 10 and the year ended on November 7, 2026, that gave November 10, 2027, so no reminder showed. The due date is now the first start date after the current year ended (or began, while it is in session): November 10, 2026. The label is unchanged: the next in sequence, 2027–2028.

Reason: Bug found through Zean's test.

Testing Performed: Added a case to `schoolYear.test.ts`: ended November 7, 2026, start date November 10, so the start is due November 10, 2026 and the reminder is showing. `schoolYear`, Archive and Dashboard tests: 82 passed. Typecheck: 0 errors.

Known Issues: none.

Next Steps: none.
