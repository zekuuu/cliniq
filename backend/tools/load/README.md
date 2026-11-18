# Load-test tools

A fictional, repeatable school the size of Mendez Christian Academy's clinic, its soundness checks, and the measurement client. Development only. Run notes and results: [`CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/`](../../../CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/NOTES.md).

Run every command from `backend/` with XAMPP's PHP (`C:\xampp\php\php.exe`).

## Seed the demo school (one command)

Added Wednesday, November 18, 2026 — 21:55 PHT. On a database you may wipe, from `backend/`:

```bat
php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force
```

- It builds the school on a freshly migrated database: by default **one school year**, the current one, from June 15 **up to the real clock, to the minute** (Zean's choice: nothing dated in the future). About 40 s and 48 MB on Zean's machine. Run it again on another day and it continues: every earlier row comes out the same (same ids), and the new days are added. Each school year runs June 15 to April 14 and is ended through the real route; the next one starts June 15.
- **Prefix-stable.** Each school day draws from its own seed (the fixed seed and the date), and the no-class days (about one in ten) are chosen by a hash of the seed and the date. A build cut at Nov 6, 12:00 and one cut at Nov 18, 12:00 have the same rows up to Nov 6 noon, except where a later step changes them (a letter approved the next morning, a follow-up closed, a batch's quantity).
- Skipped days: weekends, the holidays of `frontend/src/lib/mock-db/holidays-ph.json` (2026 and 2027), the Christmas break December 18 to January 4, and the hashed no-class days. **Today itself may be one**: Wednesday, November 18, 2026 is, so its Dashboard shows no visit.
- Options, as environment variables (`db:seed` takes no flags): `DEMO_SCHOOL_STUDENTS` (900), `DEMO_SCHOOL_STAFF` (60), `DEMO_SCHOOL_YEARS` (1), `DEMO_SCHOOL_AUDIT` (0), `DEMO_SCHOOL_SEED` (20261116), `DEMO_SCHOOL_UNTIL` (empty is now; `YYYY-MM-DD` is the end of that day, `YYYY-MM-DD HH:MM` that minute; never later than now). It prints the options and the database first.
- It refuses production, any database other than `cliniq_testing`, `cliniq_load` and the `cliniq_check_*` scratch databases (so never `cliniq`), a database with accounts or students it did not make, and a database that is not freshly migrated and empty. It never runs `migrate:fresh` itself; the command above does.
- It adds what was set by hand in `cliniq_testing` for the screenshots, on the real clock: the display names **Jennesse Baas** (`demo.nurse`) and **Gilan Avelida** (`demo.principal`), the backup location "External drive" at `D:\` (a row only, no file written), and the Sports Report "Grade 10 basketball try-outs" (the active Grade 10 students).
- Grants: `migrate:fresh` keeps `cliniq_app`'s grants (MariaDB keeps table grants across a drop; the 47 on `cliniq_testing` survived the November 17 rebuilds). On a new database, run the grants step below once.
- Known gaps: the stock flags show nothing in mid-year (the "ordered, not arrived" group falls in the last 15 school days before April 14); `created_at` and `updated_at` are the database's own clock (the time of the seed), as before; the record ids of `screenshots/_capture/config.json` belong to the five-year school and do not match a one-year seed.

## Build the school

`build.php` is the load-test route to the same school (since Wednesday, November 18, 2026 — 21:55 PHT it calls `App\Shared\Database\DemoSchool\LoadGenerator`, shared with the seeder); it runs `migrate:fresh` itself and then the checks.

```bat
php tools/load/build.php --students=900 --staff=60 --years=1
php tools/load/build.php --students=900 --staff=60 --years=5
php tools/load/build.php --students=900 --staff=60 --years=5 --audit=100000
```

- `--years=N`: the current school year up to now and the N−1 before it, each ended. `--until=YYYY-MM-DD` stops at the end of that day (never later than now); the default is now, to the minute (until November 18, 2026 it filled today to the end of the school day). `--staff=150` for the larger staff case. `--seed` changes the fixed seed (default `20261116`); the same options always make the same school.
- It runs as the testing environment (`.env.testing`, the migration account) on `cliniq_testing`, or on `cliniq_load` or a `cliniq_check_*` scratch database when `DB_DATABASE` names it. It runs `migrate:fresh` first.
- It refuses production, any other database, and a database holding accounts (usernames neither `load.*` nor the three demo accounts) or students (LRNs outside the reserved range) it did not make. It never touches `cliniq`.
- It prints one line per phase with the time and peak memory, the row counts, then the checks below. Times on Zean's machine: one year about 40 s (November 18, 2026); five years 393 to 587 s (November 17).
- Generated files (git-ignored) go to `backend/storage/load/`: `students-<year>.csv` and `staff-<n>.csv` in the Import screen's CSV format, the build log, `results.jsonl`, the bench sessions.

**`composer test` empties `cliniq_testing`** (`RefreshDatabase`). Run Pest elsewhere while the load data is needed: `set DB_DATABASE=cliniq_check_pest` (the migration account may create `cliniq_check_*` databases), or reseed with the one command above afterwards.

## What it makes

Accounts, this test database only. Sign in with the mock's accounts and passwords (since Tuesday, November 17, 2026): `demo.principal` / `demo-admin` (shown as Gilan Avelida since November 18, 2026; Demo Admin before), `demo.nurse` / `demo-nurse` (Jennesse Baas; Demo Clinician before; the clinician), `demo.new` / `demo-change` (Grace Tolentino, Staff, must change the password at the first sign-in). Background accounts, password `Load-Test-Only-2026`: `load.cover1` to `load.cover3` (Staff covering some days), `load.former` (deactivated), `load.bench01` to `load.bench20` (Staff, for the measurements). Students: 900 on each yearly list, 13 grades, two sections each, LRNs `999900000001` upward; about 3% with no sex (flagged by the import, added by hand), about 1.5% left incomplete, graduates archived by the next list, transfers in and out. Staff patients through the staff import. Visits (about 25 students and 3 staff a school day, with a cough week and a fever outbreak), incidents in both stages, follow-ups, excuse letters, stock moved by the dispensing and restocked by the Monday check, calendar events, issue reports, the holiday list, and the audit trail.

Records go through the owner services; the yearly lists, the staff list, the school-year steps and the issue reports through the real routes in-process. Two shortcuts, labelled: the daily backup rows are inserted directly, and `--audit=N` pads the audit log with View events through the audit logger.

## Check it

```bat
php tools/load/checks.php
```

Read-only. Foreign keys, the stock ledger (chain, parity, batch allocations, opening rows), EL- and IR- numbers unique and gapless per year, Staff No. gapless, no orphan in the audit log, the reserved LRN range, and no surname shared with the project's real people (read from the knowledge base at run time, never printed). Exit code 0 when every check passes.

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
