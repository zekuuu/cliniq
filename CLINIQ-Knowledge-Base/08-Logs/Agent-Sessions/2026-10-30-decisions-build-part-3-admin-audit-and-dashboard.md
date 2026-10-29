# Decisions build, Part 3: Admin, audit and Dashboard

Date/Day/Time: Friday, October 30, 2026 — 00:17 PHT
Agent: Claude Code (Opus 5.5)
Task: Build Part 3 of the decisions-sheet answers (ADR-048, ADR-050): four `FIX` entries.
Status: Completed
Prompt/Request: The same "Build the fixes that came out of the decisions sheet" prompt, "Parts 1 to 6", on the branch `build/decisions-sheet-answers-oct29`. Part 3: Acknowledge on an incident report, Admin sign-out after 30 idle minutes, audit of the clinician opening a record, a possible-cluster alert. Defaults D11 to D14 apply.

Files Modified:
- Data layer: `frontend/src/lib/mock-db/api.ts` (`recordView` replaces `recordAdminView` and logs both roles; `acknowledgeIncidentReport`, `AcknowledgeError`; `getAdminIdleMinutes`; `listClusterAlerts`; `logoutMockSession` takes an optional summary; `IncidentTrail.acknowledged`), `selectors.ts` (`clusterAlerts`), `types.ts`, `store.ts`, `integrity.ts`, `mock-db.json` (`adminIdleMinutes` 30, `clusterMinStudents` 3, `clusterWindowDays` 3), `index.ts`, `frontend/src/types/entities.ts` (`Incident.acknowledged`, PROVISIONAL)
- UI: `features/emergency-response/IncidentReportPage.tsx`, `api/incidentRecordApi.ts`; `features/student-records/api/studentProfileApi.ts`; `features/staff-records/api/staffApi.ts`, `StaffProfilePage.tsx`; `features/dashboard/DashboardPage.tsx`, `api/dashboardApi.ts`, new `components/ClusterAlerts.tsx`; `layouts/AppShell.tsx`, new `hooks/useIdleSignOut.ts`; `App.tsx`, `routes/AppRoutes.tsx`; `features/auth/LoginPage.tsx`; `features/audit-log/AuditLogPage.tsx` ("Viewed (Admin)" now "Viewed a record")
- Tests: new `features/AdminAuditDashboardDecisions.test.tsx` (6 tests) and `test/recordedWrites.ts` (audit entries without views); `admin-read-only.test.tsx` (the clinician's view is now logged); `ui-review-regressions.test.tsx`, `IncidentSafety.test.tsx`, `ParentNotificationPage.test.tsx`, `StaffPages.test.tsx` (they check what a screen wrote, so they leave view entries out); `DashboardLoading.test.tsx` (mock of the new fetch); `lib/mock-db/dashboard.test.ts` (config fixture)
- Docs: `Module-Overview.md`, `Screen-Inventory.md`, `Audit-Coverage.md`, `frontend/src/lib/mock-db/README.md`, ADR-015, ADR-038, ADR-048 and ADR-050 status lines, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:
- **Acknowledge (D11).** On an approved incident report the Admin sees Acknowledge; a confirmation dialog explains it can't be undone. It stores `Incident.acknowledged { byUserId, at }`, writes an `update` audit entry on `incident-report` ("Acknowledged"), and shows "Acknowledged by <name> on <date>" on the report and its printout. The data layer refuses the clinician, an unapproved report and a second acknowledge. Everything else stays read-only for the Admin. The clinician never sees the button.
- **Admin idle sign-out (D12).** `useIdleSignOut` counts pointer, key, scroll and wheel activity; for the Admin only it shows a "Still there?" dialog during the last 60 seconds and then signs out (audited as "Signed out after 30 minutes of inactivity"). Login then shows "You were signed out after 30 minutes of inactivity." The clinician has no timeout.
- **Audit of opening a record (D13).** Opening a student profile, a staff profile or an incident report writes one `view` entry per record per sign-in session for both roles. Lists and searches are not logged.
- **Possible-cluster alert (D14).** `clusterAlerts` counts different students with the same complaint and grade (grade at the time, Part 2) over the last 3 calendar days including today, from counted visits and incidents; students only. A warning row on the clinician's Dashboard Overview: "Possible cluster: 3 Kinder students with Chills (Oct 28 – Oct 30, 2026)." with a "View visits" link for that range. Nothing for the Admin and nothing sent. The Trends chart's cluster marker is unchanged.

Reason: ADR-048 items 1, 2 and 5, ADR-050 item 2, and the four Part 3 `FIX` entries of "Decisions sheet answers".

Testing Performed:
- Typecheck pass, build pass, lint unchanged from the baseline (1 error, 2 warnings, pre-existing).
- Tests: 13 failed and 770 passed of 783. Twelve are the baseline failures. The thirteenth, `countsAndSeed.test.ts` "has no two visits at the same minute", fails only because the date rolled over to Friday, October 30, 2026: pinned to October 28 or 29 it passes, and no change here moves a visit time. It is logged as a new `FIX`.
- Eight existing tests failed after D13 because they expected no audit entry at all, or a specific last entry, while a profile or report was open. They now use `recordedWrites()`, which leaves the view entries out; `admin-read-only.test.tsx` now expects the clinician's view.
- Screens in the running app (Playwright Chromium headless shell, screenshots outside the repository), with a saved mock state holding an approved incident and a three-student cluster: Dashboard (Staff with the cluster row; Admin without), Incident Report (Staff; Admin with Acknowledge, its dialog, and after acknowledging), Audit Log (both roles), at 1440, 768 and 390 px. No horizontal scroll; axe-core: no violations. The 29-minute idle notice was checked with fake timers in the tests, not in a live browser.

Known Issues: the new `FIX` "The seed has visits at the same minute when today is a Friday".

Next Steps: Part 4 (reports and calendar).
