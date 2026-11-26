Date/Day/Time: Thursday, November 26, 2026 — 09:34 PHT
Agent: Codex
Task: Resolve the testing fresh-seed permission error
Status: Completed
Prompt/Request: The user reported that `php artisan migrate:fresh --seed` failed with MariaDB error 1142, `DROP command denied` to `cliniq_app` on `cliniq_testing.audit_logs`, then confirmed that adding `--env=testing` worked.
Files Modified: `COMMANDS.md`, `CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md`, `backend/README.md`, `CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md`, `CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md`, and this session log.
Changes Made: Corrected the default small-seed command to `php artisan migrate:fresh --seed --env=testing --force` and documented a read-only check of the selected database and migration account before running it. Kept the application account's restricted grants. The user confirmed the corrected command worked.
Reason: The local environment points at `cliniq_testing` as `cliniq_app`, which has no `DROP` privilege on `audit_logs`; the testing environment selects `cliniq_migrate` for schema changes.
Testing Performed: Read-only Artisan checks confirmed local = `cliniq_testing` / `cliniq_app` and testing = `cliniq_testing` / `cliniq_migrate`. The corrected command completed migrations and seeding. A subsequent read-only check as `cliniq_app` found three fictional accounts, five students, five visits and five issue reports, with `demo.nurse`'s existing password still matching. The user independently confirmed success.
Known Issues: None for this command. `migrate:fresh` always drops the selected database's tables before the seeder runs; verify the target first.
Next Steps: Use `--env=testing` for future disposable testing-database rebuilds.
