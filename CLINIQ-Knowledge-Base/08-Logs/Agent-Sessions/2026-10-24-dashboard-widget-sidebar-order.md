Date/Day/Time: Saturday, October 24, 2026 — 08:37 PHT
Agent: Claude Code (Opus 5.5)
Task: Order the Dashboard Overview widgets to match the sidebar sequence
Status: Completed
Prompt/Request: "fix the order of the widgets in dashboard by the sequence in the sidebar"
Files Modified:
- frontend/src/features/dashboard/components/StatCardRow.tsx
- frontend/src/features/dashboard/components/AttentionChips.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
Changes Made:
- Stat cards (and their loading skeleton) now follow the Staff sidebar's Student Care order: Active students, Clinic visits, Pending excuse letters (they open in the Visit Log, so they sit beside Visits), Incidents, Due & overdue follow-ups. Old order: Clinic visits, Incidents, Active students, Pending excuse letters, Due & overdue follow-ups.
- Attention chips follow the same sequence: incomplete records (Students), in clinic now (Visits), low stock and expired or expiring (Inventory), backup alert (Backup). Old order: low stock, expired or expiring, incomplete records, backup, in clinic now.
- The Dashboard test now asserts the stat-card order.
Reason: Widgets read in the same order as the sidebar the nurse already navigates.
Testing Performed: `npx vitest run src/features/dashboard` (8 files, 51 tests pass); `npx tsc -b --noEmit` clean.
Known Issues: The printed Clinic Overview Report (`DashboardPrint.tsx`) keeps its own order; not changed.
Next Steps: None.
