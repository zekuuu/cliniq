# Reports Generation

## What it is

Monthly reports, incident reports, health summaries, all print-layout-first, plus the Sports Report for the PE instructor.

## Screens and who can use them

- Reports (tabs: Monthly Report, Incident register, Symptom summary, Inventory sheet): School Clinician. Staff see "To send this to the Principal, print it or choose Save as PDF in the print window." (ADR-079).
- Reports for the Admin / Principal: a Report month drop-down and the same four reports as a list; Open shows the report as an on-screen A4 sheet with masked LRNs and no Print, Save or export (ADR-077). Staff-only report routes send the Admin to `/reports`.
- Sports Reports, New Sports Report, Sports Report, Edit Sports Report: School Clinician only (ADR-034).

## Rules that matter

- The Admin / Principal reads reports on screen and does not print (ADR-038, ADR-077). There is no Clinic Overview report (ADR-074).
- The Monthly Report has a weekly breakdown, Sunday to Saturday, clipped to the month (ADR-050, ADR-055). Complaint variants group under the matching complaint type.
- A Sports Report stores the list of students, the clinician's notes and two options; the visits and incidents it prints are read when it is printed (ADR-034), and the clinician ticks which entries print (ADR-051).

## Data and API files

`api/reportsApi.ts`, `api/sportsReportApi.ts`; `sportsReportContent.tsx`, `components/HealthSummary.tsx`.

## Printouts and tests

Print prints the tab on screen as its own A4 document (`components/ReportsPrint.tsx`, ADR-026): Monthly Clinic Report, Incident register (formerly Incident Report Archive), Complaint summary (formerly Health Summary), or Monthly Inventory. The Sports Report prints from `components/SportsReportPrint.tsx`. Tests: `ReportsPage.test.tsx`, `ReportsDecisions.test.tsx`, `SportsReport.test.tsx`.

## Not built yet

Nothing decided is waiting here. There is no Finalize month, and the printable Monthly Report is enough for now (ADR-050, ADR-053).
