# Reports Generation

## What it is
Monthly reports, incident reports, health summaries, all print-layout-first, plus the Sports Report for the PE instructor.

## Screens and who can use them
- Reports (tabs: Monthly Clinic Report, Incident register, Complaint summary): School Clinician and Admin / Principal (reads only).
- Sports Reports, New Sports Report, Sports Report, Edit Sports Report: School Clinician only (ADR-034).

## Rules that matter
- The Admin / Principal reads reports on screen and does not print (ADR-038).
- A Sports Report stores the list of students, the clinician's notes and two options; the visits and incidents it prints are read when it is printed (ADR-034).

## Data and API files
`api/reportsApi.ts`, `api/sportsReportApi.ts`; `sportsReportContent.tsx`, `components/HealthSummary.tsx`.

## Printouts and tests
Print prints the tab on screen as its own A4 document (`components/ReportsPrint.tsx`, ADR-026): Monthly Clinic Report (interim contents), Incident register (formerly Incident Report Archive), or Complaint summary (formerly Health Summary). The Sports Report prints from `components/SportsReportPrint.tsx`. Tests: `ReportsPage.test.tsx`, `SportsReport.test.tsx`.

## Not built yet
Decided, not built:
- A weekly breakdown in the Monthly Report and a monthly inventory printout; no Finalize month (ADR-050).
- The clinician picks which entries the Sports Report prints (ADR-051).
- The PE wording is marked "to confirm"; the printable Monthly Report is enough for now (ADR-053).
