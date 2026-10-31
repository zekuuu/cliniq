# Backup Verification Assistant

## What it is
Shows the state of the latest local backups and walks the user through a guided recovery checklist.

## Screens and who can use them
- Backup Verification: School Clinician and Admin / Principal, with the same abilities (ADR-037). The sidebar's Backup item shows a warning icon when a backup has failed, is missing, or needs verification.

## Rules that matter
- Backups stay on the internal and external drives, with no cloud and no extra copy planned (ADR-039).
- The Backup locations panel (`BackupLocationsPanel.tsx`) adds, edits and disables locations, never deletes them, and each change is audited; a backup runs to every enabled location, keeping the latest 60 per location (ADR-052). The mock only stands in for what the backend will report.
- The Dashboard warns when the last good backup is over 48 hours old (ADR-037, `config.staleBackupHours`).

## Data and API files
`api/backupApi.ts`. It reads sample backup records from `src/lib/mock-db/`; no real backup runs yet.

## Printouts and tests
No printout. Tests: `AccessAndBackup.test.tsx`.

## Not built yet
- Real backups, the `.cliniq` folder structure on each location, and the data retention policy's purge-tooling threshold (Project Plan, Section 5.3). Not started; all need the backend.
