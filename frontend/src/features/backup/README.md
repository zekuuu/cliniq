# Backup Verification Assistant

## What it is
Shows the state of the latest local backups and walks the user through a guided recovery checklist.

## Screens and who can use them
- Backup Verification: School Clinician and Admin / Principal, with the same abilities (ADR-037). The sidebar's Backup item shows a warning icon when a backup has failed, is missing, or needs verification.

## Rules that matter
- Backups stay on the internal and external drives, with no cloud and no extra copy planned (ADR-039).

## Data and API files
`api/backupApi.ts`. It reads sample backup records from `src/lib/mock-db/`; no real backup runs yet.

## Printouts and tests
No printout. Tests: `AccessAndBackup.test.tsx`.

## Not built yet
- A Backup locations screen where the School Clinician chooses the internal and external folders, with a `.cliniq` folder structure created on each (ADR-052). Decided, not built.
- Real backups, and the data retention policy's purge-tooling threshold (Project Plan, Section 5.3). Not started; both need the backend.
