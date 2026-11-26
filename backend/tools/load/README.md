# Load-test tools

A fictional, repeatable school the size of Mendez Christian Academy's clinic, its soundness checks, and the measurement client. Development only. Run notes and results: [`CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/`](../../../CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/NOTES.md).

Run every command from `backend/` with XAMPP's PHP (`C:\xampp\php\php.exe`).

## Seed the demo school (one command)

Added Wednesday, November 18, 2026 — 21:55 PHT. On a database you may wipe, from `backend/`:

```bat
php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force
```

- Since Saturday, November 21, 2026 — 18:36 PHT (Zean): by default **five school years**, 2022–2023 to 2026–2027, from June 15, 2022 **up to Sunday, February 28, 2027** (`DemoSchoolSeeder::DEFAULT_UNTIL`; the last class day is Friday, February 26), so every screen has data whatever the real date. About 5.5 min and 54 MB on Zean's machine. Until then the default was one year up to the real clock.
- **Rows after the real date are demo data.** The Backup page's "last backup" and the Audit Log show dates that have not happened yet; do user-acceptance writes on a copy of the database, not on the seeded one.
- **Prefix-stable and deterministic.** Each school day draws from its own seed (the fixed seed and the date). A later end date only adds days: a build to December 4 and one to January 15 have identical rows, ids included, up to December 4, and two builds with the same options are identical (proved November 21, 2026).
- Skipped days: weekends, the nationwide holidays (2026 and 2027 from `frontend/src/lib/mock-db/holidays-ph.json`, June 2022 to December 2025 from the generator's own `PAST_HOLIDAYS`, approximate, demo only; special *working* days have class), the Christmas break December 18 to January 4, and before November 19, 2026 about one ordinary day in ten (hashed; never a calendar event). **From November 19, 2026 on there are no random no-class days**, so every school day through February 26, 2027 has visits.
- **Realistic by rule** (November 21, 2026): ages fit the grade by the August 31 cut-off; twins share a grade, siblings are at least two grades apart and share a guardian and number; the roster tapers (more in Kinder, fewer in Senior High) and grows about 2.5% a year to 900+ this year; complaints follow the season, the weekday, the hour and the school calendar (Intramurals, exams, deworming day); menstrual cramps only for girls aged 10 and up; temperatures and incident vitals follow the product's `vitals_usual_ranges` and `vitals_warning_ranges`; the clinic gives an item only when it suits the child's age, avoids their allergies and is in stock (ADR-084); monthly deliveries, expiry 12 to 36 months. The rules are the constant tables at the top of `LoadGenerator.php`, each with its reason.
- Options, as environment variables (`db:seed` takes no flags): `DEMO_SCHOOL_STUDENTS` (900), `DEMO_SCHOOL_STAFF` (60), `DEMO_SCHOOL_YEARS` (5), `DEMO_SCHOOL_AUDIT` (0), `DEMO_SCHOOL_SEED` (20261116), `DEMO_SCHOOL_UNTIL` (empty is 2027-02-28; `YYYY-MM-DD` is the end of that day, `YYYY-MM-DD HH:MM` that minute; later dates are accepted). It prints the options and the database first.
- It refuses production, any database other than `cliniq_testing`, `cliniq_load` and the `cliniq_check_*` scratch databases (so never `cliniq`), a database with accounts or students it did not make, and a database that is not freshly migrated and empty. It never runs `migrate:fresh` itself; the command above does.
- It adds what was set by hand in `cliniq_testing` for the screenshots, on the real clock: the display names **Jennesse Baas** (`demo.nurse`) and **Gilan Avelida** (`demo.principal`), the backup location "External drive" at `D:\` (a row only, no file written), and the Sports Report "Grade 10 basketball try-outs" (the active Grade 10 students).
- Grants: `migrate:fresh` keeps `cliniq_app`'s grants (MariaDB keeps table grants across a drop; the 47 on `cliniq_testing` survived the November 17 rebuilds). On a new database, run the grants step below once.
- `created_at` and `updated_at` follow the record's own time since November 21, 2026 (the generator sets the database session's `timestamp`); before, they were the time of the seed. The record ids of `screenshots/_capture/config.json` belong to the November 17 school and no longer match: a retake re-picks them.

## Build the school

`build.php` is the load-test route to the same school (since Wednesday, November 18, 2026 — 21:55 PHT it calls `App\Shared\Database\DemoSchool\LoadGenerator`, shared with the seeder); it runs `migrate:fresh` itself and then the checks.

```bat
php tools/load/build.php --students=900 --staff=60 --years=1
php tools/load/build.php --students=900 --staff=60 --years=5
php tools/load/build.php --students=900 --staff=60 --years=5 --audit=100000
```

- `--years=N`: the school year of the end date and the N−1 before it, each ended. `--until=YYYY-MM-DD` stops at the end of that day; the default is 2027-02-28 (since November 21, 2026; before, the real clock). `--staff=150` for the larger staff case. `--seed` changes the fixed seed (default `20261116`); the same options always make the same school.
- It runs as the testing environment (`.env.testing`, the migration account) on `cliniq_testing`, or on `cliniq_load` or a `cliniq_check_*` scratch database when `DB_DATABASE` names it. It runs `migrate:fresh` first.
- It refuses production, any other database, and a database holding accounts (usernames neither `load.*` nor the three demo accounts) or students (LRNs outside the reserved range) it did not make. It never touches `cliniq`.
- It prints one line per phase with the time and peak memory, the row counts, then the checks below. Times on Zean's machine: five years to February 28, 2027 about 312 to 329 s, 54 MB (November 21, 2026); one year about 46 s.
- Generated files (git-ignored) go to `backend/storage/load/`: `students-<year>.csv` and `staff-<n>.csv` in the Import screen's CSV format, the build log, `results.jsonl`, the bench sessions.

**`composer test` empties `cliniq_testing`** (`RefreshDatabase`). Run Pest elsewhere while the load data is needed: `set DB_DATABASE=cliniq_check_pest` (the migration account may create `cliniq_check_*` databases), or reseed with the one command above afterwards.

## What it makes

Accounts, this test database only. Sign in with the mock's accounts and passwords (since Tuesday, November 17, 2026): `demo.principal` / `demo-admin` (shown as Gilan Avelida since November 18, 2026; Demo Admin before), `demo.nurse` / `demo-nurse` (Jennesse Baas; Demo Clinician before; the clinician), `demo.new` / `demo-change` (Ghenly Tinapay, Staff, must change the password at the first sign-in). Background accounts, password `Load-Test-Only-2026`: `load.cover1` to `load.cover3` (Staff covering some days), `load.former` (deactivated), `load.bench01` to `load.bench20` (Staff, for the measurements). Students: 900+ this school year (each earlier year about 2.5% fewer), 13 grades tapering from Kinder to Grade 12, two sections each, LRNs `999900000001` upward; about 3% with no sex (flagged by the import, added by hand), about 1.5% left incomplete, graduates archived by the next list, transfers in and out. Staff patients through the staff import. Visits (about 12 to 24 a school day, 12% staff, shaped by season, weekday, hour and calendar), incidents in both stages (about 3 to 5 a month), follow-ups, excuse letters, stock moved by the dispensing and restocked by the monthly delivery, the school's yearly calendar, issue reports, the holiday list, and the audit trail.

Records go through the owner services; the yearly lists, the staff list, the school-year steps and the issue reports through the real routes in-process. Two shortcuts, labelled: the daily backup rows are inserted directly, and `--audit=N` pads the audit log with View events through the audit logger.

## Check it

```bat
php tools/load/checks.php
```

Read-only. Foreign keys, the stock ledger (chain, parity, batch allocations, opening rows), EL- and IR- numbers unique and gapless per year, Staff No. gapless, no orphan in the audit log, the reserved LRN range, and no surname shared with the project's real people (read from the knowledge base at run time, never printed). Since November 21, 2026 also the **realism checks** (`loadRealism()`): ages within the grade band, birth-date window, same-birthday students in one grade, menstrual cramps against sex and age, visits on school days 07:00–17:00, time out after time in, excuse letters and follow-ups dated sensibly, `created_at` on the record's own day, temperatures and injury vitals against the settings' ranges, no item given against a recorded allergy, stock never negative, expiry 12 to 36 months, calendar events on school days, contact numbers `09XXXXXXXXX`, no number shared by unrelated families. They fail on data built with the old rule (269 students outside the band). Exit code 0 when every check passes.

## Grants for the app account

```bat
php tools/load/app-grants.php cliniq_testing > storage/load/grants-cliniq_testing.sql
C:\xampp\mysql\bin\mysql.exe -u root -p < storage/load/grants-cliniq_testing.sql
```

Gives `cliniq_app` the rights it has on `cliniq` (SELECT, INSERT on the database; UPDATE, DELETE on every table but `audit_logs`). Needed once per database, and again after a restore into a new one.

## Measure

Serve `backend/public` from Apache on `127.0.0.1:8081` with `SetEnv DB_DATABASE cliniq_testing` (`storage/load/vhost-8081.conf`), never `php artisan serve`. Then:

```bat
php tools/load/bench.php journey --runs=5
php tools/load/bench.php crowd --people=5 --minutes=10 --pause=3
php tools/load/bench.php crowd --people=10 --minutes=5 --pause=0
```

`bench.php` is plain PHP with curl, so it also runs on the clinic PC against its training database (`--base=http://localhost`). It signs in for real and keeps one session per person, paces logins under 10 a minute and each person under 120 requests a minute, and appends every result to `storage/load/results.jsonl`.
