# Monthly Report weeks and layout, CLINIQ wordmark on login

Date/Day/Time: Saturday, October 31, 2026 — 12:18 PHT
Agent: Claude Code (Opus 5.5)
Task: Tidy the Monthly Report on screen, make its weeks Sunday to Saturday, and use the brand font on the login wordmark.
Status: Completed
Prompt/Request: Zean: "Datas formatted like this looks awful. Monthly report in report page"; "in activity calendar, it is shown as Sunday to Saturday, so it should be SUn to Sat, if started in Thu, then it should be THu to Sat"; "font should apply everywhere there's CLINIQ name"; "I mean like in login".
Files Modified: `frontend/src/lib/dates.ts`, `features/reports/ReportsPage.tsx`, `ReportsPage.test.tsx`, `ReportsDecisions.test.tsx`, `components/MonthlyTables.tsx`, `features/auth/LoginPage.tsx`, `features/legal/PrivacyPolicyPage.tsx`, ADR-054 (age wording), ADR-055 (new), `Decisions-Summary.md`, `Design-System.md`, `cliniq-sidebar-patterns` skill, Changelog
Changes Made: `monthWeeks` now cuts weeks at each Sunday, with no merging. The screen headers read "Oct 11–17"; the printout keeps "11-17". Zeros recede, the All complaints row is bold, and visits by sex are four tiles on screen.
Reason: The weeks disagreed with the Activity calendar, and the table had gaps and empty space.
Testing Performed: `src/features/reports` tests, typecheck and build. The expected week labels in `ReportsDecisions.test.tsx` changed because the requirement changed. The full suite was not rerun.
Known Issues: The columns no longer match the clinic's paper report week for week; the nurse should confirm.
Next Steps: Add the Sunday-to-Saturday detail to the canonical documents if the team wants it recorded there.
