# Clinic Overview Dashboard and Activity calendar

## What it is
Key operational totals, attention links, trends, and display-private frequent-visitor warnings. The Activity calendar lives in `CalendarPage.tsx` as its own sidebar screen (ADR-032).

## Screens and who can use them
- Dashboard: School Clinician and Admin / Principal. Only the School Clinician gets the New Visit action on the tab row and opens pending letters from the stat card.
- Activity calendar: both roles; both can manage school events (ADR-019, ADR-042). National holidays come from `lib/mock-db/holidays-ph.json` (ADR-020).

## Rules that matter
- Two views (ADR-025): **Overview** (visits, incidents, active students, pending excuse letters, due/overdue follow-ups, compact inventory/incomplete-record attention chips, then frequent visitors, the five with the most visits first and "Show all" for the rest; `config.showFrequentVisitors`, on, hides the panel, its printout section and its sentence in the print scope when false; Sunday, October 25, 2026) and **Trends** (one "Visits and incidents by" card with a Sex / Grade level switch, then complaint trends; at most four chart hues, see `Design-System.md`; ADR-031).
- A "Possible cluster" alert shows the School Clinician 3 students with the same complaint and grade within 3 days (ADR-050, `config.clusterMinStudents`, `config.clusterWindowDays`). A frequent visitor is 3 visits in 14 days (ADR-051). The Admin / Principal's totals leave staff incidents out (ADR-053).
- The pending-letters stat card goes to the Visit Log at `?letter=pending`. The shared `Tabs` keeps Trends in `?view=trends` with replace navigation. Legacy `?view=calendar` links replace to `/calendar`.
- The Overview tab badge counts follow-up, inventory, and incomplete-record attention. When a backup has failed, is missing, or needs verification, the desktop Backup navigation item shows a warning icon.
- Trends: a one-day range (Today, or a one-day Custom range) plots hourly. A calendar-month range groups visits and incidents Sunday to Saturday beside the equivalent previous month; grouped bars use solid versus outlined datasets, and the Chart/Table control provides the full text alternative with busiest date and known event/holiday context. Other ranges keep their date-derived buckets. The complaint-trend table sorts by Complaint and Total only, not by period.

## Data and API files
`api/dashboardApi.ts`; derived values in `lib/mock-db/dashboard.ts` and this folder's `lib/`.

## Printouts and tests
Print produces the "Clinic Overview Report" (`components/DashboardPrint.tsx`, ADR-026) for the open tab only (ADR-045): Overview prints the screen's figures and the lists its cards and chips link to; Trends prints the breakdowns behind its charts as tables. The paper shows the full LRN (ADR-044). It does not print calendar events or holidays, and the Activity calendar has no print action. The Admin / Principal does not print (ADR-038). Tests: the `*.test.tsx` files in this folder and in `components/`.

## Not built yet
Nothing decided is waiting here.
