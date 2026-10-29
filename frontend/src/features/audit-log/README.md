# Audit Log Viewer

## What it is
Module 11: a read-only, filterable record of who did what in CLINIQ, for RA 10173 accountability.

## Screens and who can use them
- Audit Log (screen #35): School Clinician and Admin / Principal (ADR-016, ADR-037).

## Rules that matter
- Read-only; opening this screen deliberately creates no audit event.
- Each entry shows a summary and the actor's role (ADR-017); internal record ids are never shown.
- Audit entries are kept 10 years (ADR-037, ADR-051).

## Data and API files
`api/auditLogApi.ts`, which reads through `src/lib/mock-db/` during the frontend-first phase.

## Printouts and tests
Print produces an A4 compliance document: the filters in words, the entry count, and every matching entry (ADR-026). The School Clinician prints; the Admin / Principal does not (ADR-038). Tests: `AuditLogPage.test.tsx`.

## Not built yet
- Logging when the School Clinician opens a profile or an incident report (ADR-048). Decided, not built.
