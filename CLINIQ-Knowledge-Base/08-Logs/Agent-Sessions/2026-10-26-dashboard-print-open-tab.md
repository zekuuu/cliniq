Date/Day/Time: Monday, October 26, 2026 — 11:13 PHT
Agent: Claude Code (Opus 5.5)
Task: Dashboard printout follows the actual Dashboard and prints the open tab
Status: Completed
Prompt/Request: "update the dashboard print with the actual dashboard, also in dashboard print which tabs he's on." Clarified answers: "Print current tab only". On how closely the printout should match the screen: "You decide but it shouldn't be like duplicate of the UI, it should be meaningful".
Files Modified:
- frontend/src/features/dashboard/components/DashboardPrint.tsx
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/print-documents.test.tsx
- frontend/src/features/staff-counts.test.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-045-Dashboard-Prints-The-Open-Tab.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-026-Purpose-Built-A4-Printouts.md (amendment note)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- .claude/skills/cliniq-print-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- `DashboardPrint` takes `view`, and `DashboardPage` passes the open tab. The scope line starts "Dashboard tab: Overview" or "Dashboard tab: Trends".
- Overview prints the Clinic Overview Report. The key figures are now the screen's five stat cards, in the screen's order: Active students, Clinic visits, Pending excuse letters (Staff only), Incidents, and Due & overdue follow-ups. Before, the printout had its own set of figures. An "Also needing attention" row carries the chip counts: Incomplete records, Low-stock items, and Expired or expiring. Then come the written summary and the lists the cards link to: follow-ups, frequent visitors, excuse letters, and low-stock items.
- Trends prints the Clinic Trends Report. It has two new tables, by sex and by grade level (visits, incidents, share; students only), then complaints and visit activity. The Trends filter is stated in the scope line.
- Choice of content: the paper carries the rows behind each count (who is due, which items run low), because a count alone can't be acted on from paper. It does not copy buttons or charts, so the screen's charts become tables.
- Tests: there is a new Trends-tab print test. The Overview test asserts the tab line and that no Trends section prints. The stale summary in the Overview test now uses Today, the Dashboard's default range; its `65` failure came from building the summary for This month. `staff-counts.test.tsx` passes `view="overview"`.
Reason: User request in the system review; recorded as ADR-045, which amends ADR-026.
Testing Performed:
- `npx tsc -b --noEmit` passes.
- `vitest run --testTimeout=30000` on print-documents, staff-counts and dashboard: 71 passed.
- No browser or PDF check was run.
Known Issues:
- The A4 layout of the new sex and grade tables was not checked in a real PDF.
Next Steps:
- Check the layout with Print / Save as PDF in Chromium.
- Update the canonical Frontend Design Reference (DOC entry).
