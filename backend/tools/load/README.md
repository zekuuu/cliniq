# Load-test tools

A fictional, repeatable school the size of Mendez Christian Academy's clinic, its soundness checks, and the measurement client. Development only. Run notes and results: [`CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/`](../../../CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/NOTES.md).

Run every command from `backend/` with XAMPP's PHP (`C:\xampp\php\php.exe`).

## Build the school

```bat
php tools/load/build.php --students=900 --staff=60 --years=1
php tools/load/build.php --students=900 --staff=60 --years=5
php tools/load/build.php --students=900 --staff=60 --years=5 --audit=100000
```

- `--years=N`: the current school year up to today and the N−1 before it, each ended. `--staff=150` for the larger staff case. `--seed` changes the fixed seed (default `20261116`); the same options always make the same school.
- It runs as the testing environment (`.env.testing`, the migration account) on `cliniq_testing`, or on `cliniq_load` when `DB_DATABASE=cliniq_load` is set. It runs `migrate:fresh` first.
- It refuses production, any other database, and a database holding accounts (usernames neither `load.*` nor the three demo accounts) or students (LRNs outside the reserved range) it did not make. It never touches `cliniq`.
- It prints one line per phase with the time and peak memory, the row counts, then the checks below. Times: one year about 1 minute on Zean's machine.
- Generated files (git-ignored) go to `backend/storage/load/`: `students-<year>.csv` and `staff-<n>.csv` in the Import screen's CSV format, the build log, `results.jsonl`, the bench sessions.

**`composer test` empties `cliniq_testing`** (`RefreshDatabase`). Run Pest elsewhere while the load data is needed: `set DB_DATABASE=cliniq_check_pest` (the migration account may create `cliniq_check_*` databases), or rebuild with the command above afterwards.

## What it makes

Accounts, this test database only. Sign in with the mock's accounts and passwords (since Tuesday, November 17, 2026): `demo.principal` / `demo-admin` (Demo Admin), `demo.nurse` / `demo-nurse` (Demo Clinician, the clinician), `demo.new` / `demo-change` (Grace Tolentino, Staff, must change the password at the first sign-in). Background accounts, password `Load-Test-Only-2026`: `load.cover1` to `load.cover3` (Staff covering some days), `load.former` (deactivated), `load.bench01` to `load.bench20` (Staff, for the measurements). Students: 900 on each yearly list, 13 grades, two sections each, LRNs `999900000001` upward; about 3% with no sex (flagged by the import, added by hand), about 1.5% left incomplete, graduates archived by the next list, transfers in and out. Staff patients through the staff import. Visits (about 25 students and 3 staff a school day, with a cough week and a fever outbreak), incidents in both stages, follow-ups, excuse letters, stock moved by the dispensing and restocked by the Monday check, calendar events, issue reports, the holiday list, and the audit trail.

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
