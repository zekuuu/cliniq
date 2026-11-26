# ADR-092: The default seed command runs a small Simulation

**Date:** Thursday, November 26, 2026 — 03:31 PHT
**Status:** Accepted (Zean: “seed 5 items each modules ... then also seed the same users we have ... make another and name it Simulation”; clarified “i want it to run with php artisan migrate:fresh --seed”).

## Decision

`DatabaseSeeder` calls the new `SimulationSeeder`, which uses the existing fictional development account fixture and creates five linked records for students, staff patients, supplies, calendar events, visits, excuse-letter drafts, follow-ups, incidents with one contact attempt each, Sports Reports and issue reports. It calls the owning services for clinical records and stock. The seed is wrapped in a transaction and skips a repeat on an already populated database. It refuses production and any database outside `cliniq_testing`, `cliniq_load` or `cliniq_check_*`. Existing development and demo school seeders are unchanged.

`migrate:fresh` drops tables before Laravel invokes the seeder, so its guard cannot protect the selected database from that command. The command is only for a disposable test or scratch database after checking `DB_DATABASE`; never use it on clinic data.

## Consequences

The default seed command now produces a small connected dataset for local testing. Backups, school-year transitions and immutable approvals are not fabricated. The canonical development setup instructions need updating through the group's document review.

Implementation update (Thursday, November 26, 2026 — 09:24 PHT): the seed's visible records use varied fictional names, grade-appropriate ages, contact relationships, clinic complaints and times, stock items, event titles, sports summaries and issue descriptions. “Simulation” remains the seeder's internal name and console label; it is not a patient, event, report or issue label. The three development usernames and passwords stay the same.
