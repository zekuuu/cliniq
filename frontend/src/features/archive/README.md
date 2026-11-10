# Archive

## What it is

One read-only page, `/archive`, for archived records by school year (ADR-072), and the school-year tools (ADR-075).

## Screens and who can use them

- Archive: both roles. A school-year switcher and tabs for Students, Staff, Reports and Audit log. Reached from the sidebar and from the Student and Staff Lists.
- End school year and Start school year, and the School year dates dialog: Staff act; the Admin reads.

## Rules that matter

- A school year runs June 15 to April 14 by default; the dates are a Staff setting. Staff end a year and start the next by hand; nothing changes by itself (ADR-075). A Dashboard banner reminds Staff 7 days before each due day.
- An archived record keeps the school year it was archived in, so changing the dates never moves it.

## Data and API files

`ArchivePage.tsx`, `newestArchivedYear.ts`; the school-year functions in `src/lib/mock-db/`.

## Printouts and tests

No printouts. Tests: `ArchivePage.test.tsx`.

## Not built yet

The 5-year retention purge needs the backend.
