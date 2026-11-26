Date/Day/Time: Thursday, November 26, 2026 — 09:01 PHT
Agent: Codex
Task: Diagnose and restore the fictional demo clinician sign-in in the local testing database.
Status: Completed
Prompt/Request: Zean asked, “why can't I login with demo.nurse demo-nurse” and said he had run `php artisan migrate:fresh --seed --env=testing --force` earlier.
Files Modified: Local `cliniq_testing` data through `php artisan db:seed --class='App\Shared\Database\SimulationSeeder'`; this new session log; Backend-Changelog and Backend-Issues-and-TODOs. No application code, migration or `.env` file was changed.
Changes Made: Read-only inspection showed that `cliniq_testing` had 53 applied migrations but zero users, students, visits, incidents and audit entries. Ran the non-destructive Simulation seeder against that empty permitted testing database. It created three fictional accounts and five linked records per daily-use module. Verified in both the default and `APP_ENV=testing` contexts that `demo.nurse` exists, the stored hash matches `demo-nurse`, and the account is neither deactivated nor locked.
Reason: Sign-in in API mode cannot succeed when its database has no account. The state at inspection did not establish exactly when the rows were removed; a test run or a seed command before SimulationSeeder existed could explain it.
Testing Performed: Read-only database inspection before and after the seed; `php artisan db:seed --class='App\Shared\Database\SimulationSeeder'` completed; verified three users and five students afterward, and a matching demo password hash with no lock or deactivation. No destructive test suite was rerun against `cliniq_testing`.
Known Issues: The browser's currently running frontend/backend process was not inspected; if it points to another database or is in mock mode, its sign-in result can differ. The exact action that emptied `cliniq_testing` is unproven. `migrate:fresh` drops its target tables before the seeder runs; Pest with `RefreshDatabase` can also clear a testing database.
Next Steps: Try `demo.nurse` / `demo-nurse` again in API mode. If it still fails, capture the exact on-screen message and verify the running API process uses `cliniq_testing`.
