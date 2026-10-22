Date/Day/Time: Thursday, October 22, 2026 — 18:09 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 4 — small-number percentages, alert badge, total labels, Incident register and Complaint summary
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 4 (DB-2, DB-4, DB-8, RP-4, RP-7, default D4), at Zean's "Continue next part and to the last part no stopping". The asks:
- no percentages on tiny numbers (a config threshold of 5);
- the Overview badge counts urgent items only;
- every total says what it counts;
- rename "Incident Report Archive" to "Incident register", with rows that open the incident;
- rename "Health Summaries" to "Complaint summary".

Files Modified:
- frontend/src/lib/mock-db/mock-db.json, types.ts, integrity.ts (config `percentMinPriorCount: 5`)
- frontend/src/lib/mock-db/dashboard.ts, frontend/src/types/dashboard.ts (`percentMinPriorCount`, `counts.incidentsAwaitingStage2`)
- frontend/src/lib/mock-db/selectors.ts (audit label "Incident register")
- frontend/src/components/ui/StatCard.tsx (`StatTrend.detail`, read by screen readers)
- frontend/src/features/dashboard/lib/statTrend.ts (new), lib/urgentCount.ts (new)
- frontend/src/features/dashboard/components/StatCardRow.tsx, DashboardPage.tsx, components/ComplaintTrends.tsx
- frontend/src/features/reports/ReportsPage.tsx, components/ReportsPrint.tsx, components/HealthSummary.tsx, README.md
- Tests:
  - frontend/src/features/dashboard/DashboardAndReports.test.tsx (new)
  - updated names and fixtures only: print-documents.test.tsx, reports/ReportsPage.test.tsx, reports/SportsReport.test.tsx, dashboard/components/ComplaintTrends.test.tsx, dashboard/lib/printSummary.test.ts, lib/mock-db/dashboard.test.ts
- .claude/skills/cliniq-print-patterns/SKILL.md (names of the report printouts)
- CLINIQ-Knowledge-Base:
  - 01-Requirements/Features/Module-Overview.md, 03-Design/Screen-Inventory.md, 03-Design/Reference-Screens.md, 04-Development/Development-Phases.md, 00-Project-Core/Team-and-Roles.md
  - canonical CLINIQ_Modules_and_Features.md, CLINIQ_Frontend_Context_Brief.md, CLINIQ_Frontend_Design_Reference.md
  - 08-Logs (Changelog, Issues-and-TODOs, Issues-Done-Archive)

Changes Made:
- **Trends (DB-2, D4).** `trendFor(current, previous, range, minPrior)`:
  - when the prior count is under `config.percentMinPriorCount` (5), it shows both counts: "4 vs 1 in the prior 22 days";
  - from 5 up it keeps the percentage and adds the counts as `detail`, which `StatCard` reads out for screen readers;
  - it applies to both trend cards, Visits and Incidents. The other three cards have no trend.
  - The threshold is a config value, sent with the Dashboard summary, not a constant in the component.
- **Badge (DB-4).**
  - The Overview tab's number is `urgentCount`: expired stock, overdue follow-ups and incidents awaiting Stage 2. The last is a new current-state count, `incidentsAwaitingStage2`.
  - Its accessible text is now "N urgent items".
  - Low stock, expiring, incomplete records and frequent visitors keep their chips and lists.
  - A stale backup joins it in Part 6.
- **What totals count (DB-8).**
  - The Clinic visits card says "Visits only; incidents are counted separately".
  - The sex and grade-level charts are titled "Visits and incidents by sex" and "… by grade level"; their descriptions already said so.
  - The Monthly Report says that visits and incidents are counted separately and that an escalated visit counts once, as the incident (ADR-036, already applied in the selectors in Part 2).
  - The calendar legend already reads "Cases per day (visits + incidents)". The remaining "cases" wording waits for the Part 7 terminology pass.
- **Renames (RP-4, RP-7).**
  - The "Incident register" tab, title, table caption, printout title and audit label.
  - Each row has "Open report", or "Complete Stage 2" for a Stage 1 record. These are for Staff only; the Admin cannot open incident routes.
  - The table now has a minimum width and scrolls inside its card on a phone.
  - "Complaint summary" for the tab, title, printout, chart and table labels.

Reason:
- The panel review findings listed above.

Testing Performed:
- Typecheck pass. Lint shows only the pre-existing errors and warnings: I moved `trendFor` to `lib/` so the component file adds no fast-refresh warning.
- `DashboardAndReports.test.tsx` (5 new tests) covers:
  - counts under the threshold, including from 0 and with no change;
  - the percentage with an accessible detail from the threshold up;
  - the urgent count's three parts, ignoring low stock and incomplete records;
  - register links for Staff and none for the Admin, plus the new tab and heading names.
- The other test changes are name and fixture updates.
- Dashboard, reports and lib suites pass, except the baseline date-sensitive stock test.
- Browser: Playwright + Chromium (not Edge), **Staff and Admin**, at 1440, 768 and 390 px. Screens: Dashboard Overview, Trends, Incident register, Complaint summary. All looked at.
- I found and fixed one defect: at 390 px the register's new Actions column squeezed the fixed-layout table into overlapping text. It now has a minimum width and scrolls inside the card.
- No page-level horizontal scroll. axe found 0 violations on all eight screens.

Known Issues:
- None new.

Next Steps:
- Part 5 (Inventory).
