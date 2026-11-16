Date/Day/Time: Saturday, November 14, 2026 — 23:00 PHT
Agent: Claude Opus 5.5 (Claude Code)
Task: Close the two open backend decisions and the five DOC items
Status: Completed
Prompt/Request: Zean, after the two DECIDE items were explained: "1. maybe file with password 2. proceed. now finish also those opens".
Files Modified: `04-Development/Environment-Setup.md`, `02-Architecture/Backup-And-Recovery-Flow.md`, `02-Architecture/Database/ERD.md`, `02-Architecture/Database/Diagrams/ERD-3.2-Students`, `ERD-3.5-Inventory` and `ERD-3.6-Access-and-Operations` (`.svg`, `.png`), `04-Development/API-Contract.md`, `08-Logs/Backend-Issues-and-TODOs.md`, `08-Logs/Backend-Changelog.md`, this file.
Changes Made: Decision 1: the `APP_KEY` copy is kept in a password-protected file, not on the backup drives in plain text, with the file's password kept apart from it alongside the handover documents (replaces the sealed-paper default). Decision 2: the Forgot password username check stays (ADR-073 amendment, already built). Regenerated the three ERD exports with the repository's `docs-diagrams.mjs` settings (Mermaid CLI 11.4.2, installed Google Chrome, not Edge), limited to those three so no other export changed. Q10 and Q11 in `API-Contract.md` now say the mock follows them (`BackupFailedError` and the duplicate-name error in `frontend/src/lib/mock-db/api.ts`, read only). The backup-location note was already in `API-Contract.md`; `db-checks.php` already verifies `personnel.sex` and `large_write_off_percent` on MariaDB. Seven items moved to Done; the glance line recounted.
Reason: Zean asked to finish the open backend items.
Testing Performed: `ERD-3.2-Students.svg` has no `full_name` and shows `first_name` and `middle_name`; the PNG was looked at. `php tools/db-checks.php` ALL PASS earlier today (260 of 260). No code changed. `frontend/` untouched.
Known Issues: No ADR was written for the key-file choice: it is an operating procedure in `Environment-Setup.md`, not a requirement change. Who keeps the file and its password at the school is still to be named at handover.
Next Steps: Name the keeper at handover. Zean commits.
