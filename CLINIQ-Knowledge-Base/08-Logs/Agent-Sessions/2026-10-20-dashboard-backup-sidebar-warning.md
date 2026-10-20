Date/Day/Time: Tuesday, October 20, 2026 — 16:33 PHT
Agent: Codex (GPT-5)
Task: Simplify the Dashboard and move backup attention to its sidebar destination.
Status: Completed
Prompt/Request: "View full report looks misplaced, dashboard looks scattered now, I want to remove the verify backup button but instead just add a warning icon beside the backup sidebar, like a notif."
Files Modified:
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/DashboardHeader.tsx`
- `frontend/src/features/dashboard/components/StaffShortcuts.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `frontend/src/features/dashboard/README.md`
- `frontend/src/layouts/Sidebar.tsx`
- `frontend/src/layouts/AppShell.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- Removed both Dashboard “View full report” links so reports remain a dedicated sidebar destination and Dashboard retains its operational hierarchy.
- Removed the header backup-status control; Date range and Print now form one compact header action group.
- Added an accessible yellow warning icon to the desktop Backup sidebar item when no backup exists, the latest backup failed, or verification is still pending. The icon stays attached when the sidebar is collapsed and the Backup link names the attention state for screen readers.
- Added regression coverage for the warning and updated the Dashboard feature note.
Reason: The report links and backup control made the Dashboard feel scattered; backup attention belongs on the persistent navigation item that opens its resolution screen.
Testing Performed:
- `npm.cmd run typecheck` — passed.
- `npm.cmd test -- --run src/features/dashboard/DashboardPage.test.tsx src/layouts/AppShell.test.tsx` — passed (18 tests).
Known Issues:
- No new issues found.
Next Steps:
- Review the sidebar warning in the running application with a real backup state when convenient; no workflow or data changes are required.
