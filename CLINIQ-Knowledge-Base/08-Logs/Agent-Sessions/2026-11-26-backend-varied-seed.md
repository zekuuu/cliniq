Date/Day/Time: Thursday, November 26, 2026 — 22:17 PHT
Agent: Codex
Task: Vary the default local seed and include Activity Calendar holidays on staging.
Status: Completed (code); database execution pending a disposable database run.
Prompt/Request: “make all the --seed have different situations, like in inventory one is low stock, expiring, expired, etc. then also to others … also in activity calendar, include the holidays to the --seed”
Files Modified: `backend/app/Shared/Database/SimulationSeeder.php`, `backend/tests/Feature/SimulationSeederTest.php`, `backend/README.md`, `COMMANDS.md`.
Changes Made: Kept five linked records per daily-use list. Stock now demonstrates healthy, low, near-expiry, expired and no-expiry states; one student has an allergy, staff types vary, two visits dispense a suitable medicine, event dates span past and future, follow-ups cover four statuses, letters include drafts and approvals, and one completed incident is approved. The default seed imports the bundled Philippine holiday list through CalendarService. Updated seed assertions and instructions.
Reason: A small seed whose records all appear in the same state cannot demonstrate the clinic screens and filters.
Testing Performed: Source-level review only. No database command was run during the documentation sync; the existing demo-school seeder already imports holidays independently.
Known Issues: The new seed assertions require a later run against an explicitly selected disposable MariaDB database.
Next Steps: On a disposable scratch database, run the focused SimulationSeeder test or `migrate:fresh --seed --env=testing --force` after verifying the database name and migration account.
