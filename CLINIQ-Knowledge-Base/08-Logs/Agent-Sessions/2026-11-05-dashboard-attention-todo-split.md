Date/Day/Time: Thursday, November 05, 2026 — 20:13 PHT
Agent: Claude Code (Opus 5.5)
Task: Split the Dashboard's "Needs attention now" into today's work and work that can wait
Status: Completed
Prompt/Request: "then reorganize what's on Needs attention now and Summary, they should be intuitive and whatever, because e.g. follow-up it can be just complete later so not really need attention now"
Files Modified:
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/dashboard/components/StatCardRow.tsx
- frontend/src/features/dashboard/components/AttentionChips.tsx
- frontend/src/features/review-round-2.test.tsx
Changes Made:
- Overview now has three sections, in order:
  - Needs attention now: Pending excuse letters card (Staff); chips for expired or expiring medicine and the backup alert. Things that shouldn't wait: a student waiting on a letter, unsafe stock, unprotected data.
  - To do (new): Unfinished incident records and Follow-ups to review cards (Staff); chips for incomplete student records and low stock. Stage 2 is optional (ADR-065) and follow-ups carry their own dates, so these can wait.
  - Activity summary: unchanged (Active students, Clinic visits, Incidents).
- `AttentionCards` holds only the letters card; new `ToDoCards` holds the other two. `AttentionChips` takes `group: 'now' | 'later'`; the later group's region is "More items to do".
- Admin still sees no action cards (ADR-038); both sections show the Admin its chips, not clickable as before (backup chip stays clickable).
- Printout (DashboardPrint) unchanged.
Reason: Follow-ups and Stage 2 completion are not urgent, so listing them as "needs attention now" overstated them.
Testing Performed: `npx tsc -b --noEmit` clean; ESLint clean; `npx vitest run src`: 123 files, 1061 tests passed.
Known Issues: The possible-cluster alert (ClusterAlerts) still sits below the summary, not in "Needs attention now".
Next Steps: Decide whether the cluster alert belongs in "Needs attention now" and whether the printout should follow the new grouping.
