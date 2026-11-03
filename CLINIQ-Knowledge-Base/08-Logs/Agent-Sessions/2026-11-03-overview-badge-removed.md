Date/Day/Time: Tuesday, November 03, 2026 — 18:38 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Remove the Overview tab badge; enlarge the Backup sidebar warning
Status: Completed. Not committed. Not checked in a browser by me.
Prompt/Request: "remove the badge in Overview tab switcher because it's not clear how it counts", then "then make the warning icon in backup a bit bigger".
Files Modified: `frontend/src/features/dashboard/DashboardPage.tsx`, `frontend/src/features/dashboard/lib/urgentCount.ts` (deleted), `frontend/src/components/ui/Tabs.tsx`, `Tabs.test.tsx`, `DashboardAndReports.test.tsx`, `review-round-2.test.tsx`, `frontend/src/layouts/Sidebar.tsx`, `AppShell.test.tsx`, ADR-025 (dated note), `Changelog.md`.
Changes Made: (1) The Overview tab shows only its icon and label. The badge counted expired stock, overdue follow-ups and incidents awaiting Stage 2, which the screen never explained. Its only user gone, the `badge` prop of the shared `Tabs` and the `urgentCount` helper and its test were deleted. (2) The Backup sidebar warning is a 24px square with a 16px icon, up from 20px with 12px.
Reason: Zean's requests.
Testing Performed: Tests changed first and seen failing (the Overview tab's name and text are just "Overview"; the marker is size-6 with a 16px icon). Typecheck 0, lint 0, 964 of 964 tests, build 0.
Known Issues: On Trends or Calendar, there is now no hint of urgent items until Overview is opened (ADR-025 note).
Next Steps: None.
