# CLINIQ Commands

The commands worth remembering in this repository: the ones that delete or overwrite data, need a special setup, or are easy to get wrong. Everyday commands (`npm install`, `npm run dev`, lint, format, Git) are left out.

Where to run them:
- **Frontend** commands: from `frontend/`.
- **Backend** commands (`php`, `composer`, `vendor/bin/...`): from `backend/`, with XAMPP's PHP (`C:\xampp\php\php.exe`) on PATH.
- **Root** commands: from the repository root.

Databases:
- `cliniq` is the development database. Treat it as real data.
- `cliniq_testing` is for tests and the demo (load-test) school. It may be emptied at any time; reseed it with the demo seeder.
- `cliniq_check_*` are scratch databases (Pest with `DB_DATABASE=cliniq_check_pest`, `db-checks.php`, trials of the demo seeder).

⚠ = deletes or overwrites data.

## Quick reference

| Command | Folder | What it does |
|---|---|---|
| `$env:VITE_API_MODE="api"; $env:VITE_API_URL="http://localhost:8000/api"; npm run dev` | frontend | Dev server against the real API (PowerShell) |
| `npm run test` | frontend | All Vitest tests; run from `D:\` with a capital D |
| `npm run docs:facts` | root | Regenerate the Facts sheet |
| `npm run docs:check` | root | Check docs: numbers, links, dates, stale features |
| `npm run docs:adrs` | root | Regenerate the ADR index after an ADR change |
| `npm run docs:documents` | root | Rebuild the combined Project Plan and SRS copies (markers stripped) |
| `npm run docs:clear-markers` | root | Clear the reviewed change markers from the Project Plan and SRS section files |
| `set DB_DATABASE=cliniq_check_pest` then `composer check` | backend | Pint + PHPStan + Pest on a scratch database |
| `composer test` / `composer check` | backend | ⚠ Without the line above, empties `cliniq_testing` |
| `php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force` | backend | ⚠ Wipe `cliniq_testing` and seed the demo school (five years, to February 28, 2027) |
| `php artisan migrate:fresh` | backend | ⚠ Drop every table and migrate again |
| `php artisan migrate:rollback` | backend | ⚠ Undo the last migration batch |
| `php artisan cliniq:create-admin <username> --name="Full Name"` | backend | Create the first Admin with a one-time password |
| `php artisan cliniq:reset-admin-password` | backend | Break-glass Admin password reset |
| `php artisan cliniq:backup` | backend | Back up to every enabled location now |
| `php artisan cliniq:sync-holidays --force` | backend | Sync PH holidays now |
| `php artisan cache:clear` | backend | Clear app cache and rate limits ("Too many requests") |
| `php artisan config:clear` | backend | Clear cached config after `.env` edits |
| `php artisan optimize` | backend | Clinic PC only: cache config, routes, events, views (ADR-082) |
| `php tools/db-checks.php` | backend | Compare migrations with the reference schema |
| `php tools/load/build.php --students=900 --staff=60 --years=1` | backend | ⚠ Build the test school in `cliniq_testing` (runs `migrate:fresh`) |
| `php tools/load/bench.php journey --runs=5` | backend | Time one nurse's journey (Apache on 8081) |
| `php tools/load/bench.php crowd --people=5 --minutes=10 --pause=3` | backend | Simulate several users at once |
| `node capture.mjs` | `screenshots/_capture/` | Retake all 34 screenshots |
| `C:\xampp\mysql\bin\mysqldump.exe -u root -p cliniq > cliniq-backup.sql` | any | Export `cliniq` to SQL |
| `C:\xampp\mysql\bin\mysql.exe -u root -p cliniq < cliniq-backup.sql` | any | ⚠ Import SQL into `cliniq` |

---

## Frontend

### Run against the real API
```powershell
$env:VITE_API_MODE = "api"; $env:VITE_API_URL = "http://localhost:8000/api"; npm run dev
```
The API must be running (`php artisan serve`), and its CORS and Sanctum settings must allow the frontend's address. Without these variables the app runs on mock data.

### `npm run test`
On Windows, run it from `D:\` with a capital D (PowerShell `Set-Location "D:\zeank\Desktop\Projects\cliniq\frontend"`). From a lowercase `d:\` working directory every file fails at `src/test/setup.ts` with "Vitest failed to find the current suite" (found Thursday, November 19, 2026).
- One file: `npm run test -- src/path/to/File.test.tsx`
- By name: `npm run test -- -t "student list"`

---

## Docs (root)

### `npm run docs:facts`
Regenerates `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` from the repository.
- `node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs --tests` also runs both test suites and `backend/tools/db-checks.php`. **It runs `composer test`, which empties `cliniq_testing`.**

### `npm run docs:check`
Checks the README numbers against a fresh Facts sheet, every Markdown link and anchor, stale "Last checked" dates, removed features still described as current, and that `AGENTS.md` and `CLAUDE.md` match. Exits 1 on any failure.
- `-- --mermaid` also renders every Mermaid diagram. It needs Chrome or Chromium (`PUPPETEER_EXECUTABLE_PATH`), never Microsoft Edge.

### `npm run docs:adrs`
Regenerates `06-Decisions/ADR-Index.md`. Run it after adding or changing an ADR.

### `npm run docs:documents`
Rebuilds `00-Combined-Project-Plan.md` and `00-Combined-SRS.md` from the section files in `CLINIQ-Knowledge-Base/10-Project-Documents/`, without the red/green change markers. `-- --check` fails if a combined copy is out of date; `-- --diagrams` redraws the Mermaid figures.

### `npm run docs:clear-markers`
Removes the red/green change markers from the Project Plan and SRS section files (red words deleted, green words kept). Run it only after the groupmate has reviewed them; the `/clear-doc-markers` command runs it with its checks and logs. `-- --check` fails if any marker is left.

---

## Backend tests

### `composer test` and `composer check`
The Pest tests use `RefreshDatabase` on `cliniq_testing`, so they **empty that database**, including a loaded test school. Run them on the scratch database instead:
```bat
set DB_DATABASE=cliniq_check_pest
composer check
```
`composer check` runs Pint, then PHPStan, then Pest, and stops at the first failure. One file: `vendor/bin/pest tests/Feature/SomeTest.php`; by name: `vendor/bin/pest --filter="creates a visit"` (same warning).

### `php tools/db-checks.php`
Loads `Reference-Schema.sql` into `cliniq_check_ref`, migrates into `cliniq_check_mig`, compares tables, columns, indexes and CHECK constraints (expects 48 tables, 462 columns), and runs the constraint tests. Uses `.env.testing` and drops both scratch databases at the end.

---

## Database

### `php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force`
Wipes the database and seeds the fictional demo school: 900+ students this year, 60 staff, five school years from June 15, 2022 up to Sunday, February 28, 2027 (since Saturday, November 21, 2026). Rows after the real date are demo data.
- **It replaces everything in `cliniq_testing`.** Use it after `composer test`.
- Same options, same rows; a later `DEMO_SCHOOL_UNTIL` only adds days (same ids before it).
- About 5.5 min. It refuses production, `cliniq`, other databases, and a database that is not empty.
- `set DB_DATABASE=cliniq_check_demo` first to try it on a scratch database.
- Options (`DEMO_SCHOOL_YEARS`, `DEMO_SCHOOL_UNTIL` and the rest) and the accounts are in `backend/tools/load/README.md`.

### `php artisan migrate:fresh` / `migrate:rollback`
`migrate:fresh` **drops every table** in the database `.env` points to, then migrates from the start. `migrate:rollback` undoes the last batch (`--step=1` for one migration). Never run either on real clinic data. Check with `php artisan db:show` which database is connected first.

### `php artisan tinker`
Anything you write in it changes the real database.

### MariaDB export and import
```bat
C:\xampp\mysql\bin\mysqldump.exe -u root -p cliniq > cliniq-backup.sql
C:\xampp\mysql\bin\mysql.exe -u root -p cliniq < cliniq-backup.sql
```
The import **overwrites the tables in that file.** Check the database name twice before running it.

---

## CLINIQ commands

### `php artisan cliniq:create-admin <username> --name="Full Name"`
Creates the first Admin/Principal account (ADR-079). Prints a generated **one-time password once**; it is never stored in a log. The Admin must change it at the first sign-in.

### `php artisan cliniq:reset-admin-password`
Break-glass reset for a locked-out Administrator. Asks for the username and a temporary password at the console (never on the command line). Record each use on paper with the Principal.

### `php artisan cliniq:backup`
Backs up to every enabled location now (ADR-037). The scheduler also runs it daily at 18:00.

### `php artisan cliniq:sync-holidays`
Syncs the Philippine holidays only when the last good sync is 30+ days old (ADR-020). `--force` syncs now; `--file=holidays-ph.json` imports a local file when there is no internet.

### `php artisan cliniq:close-missed-follow-ups`
Marks overdue pending follow-ups **Missed** (ADR-051). The scheduler runs it daily at 00:15.

### Scheduler
On the clinic PC, Windows Task Scheduler calls `php artisan schedule:run` every minute. In development use `php artisan schedule:work` instead.

---

## Caches

### `php artisan cache:clear`
Clears the application cache, including the rate-limit counters (120 requests a minute per user, 10 sign-ins a minute per address). Use it when testing hits "Too many requests".

### `php artisan config:clear`
Run it after editing `.env` if the change does not take effect.

### `php artisan optimize`
Clinic PC only (ADR-082): caches the configuration, routes, events and views. Run it after every update and after any `.env` change (`optimize:clear` first, edit, then `optimize` again). Never on a development machine: the cached configuration ignores the load-test vhost's `SetEnv DB_DATABASE`. Details: Environment-Setup.md, "Speed and reliability settings for the clinic PC".

---

## Load testing (`backend/`)

### `php tools/load/build.php --students=900 --staff=60 --years=1`
Builds a fictional, repeatable school in `cliniq_testing`.
- **It runs `migrate:fresh` first**, so everything in `cliniq_testing` is replaced. It never touches `cliniq`.
- `--years=5` five school years; `--staff=150` larger staff; `--audit=100000` a big audit log; `--seed=<n>` another fixed seed; `--until=YYYY-MM-DD` stop at that day.
- `DB_DATABASE=cliniq_load` (or a `cliniq_check_*` name) builds there instead.
- Afterwards, `php tools/load/checks.php` runs read-only soundness checks.
- Accounts and passwords: `backend/tools/load/README.md`.

### `php tools/load/app-grants.php cliniq_testing > storage/load/grants-cliniq_testing.sql`
Writes the SQL that gives `cliniq_app` the same rights on that database as on `cliniq`. Apply it with `C:\xampp\mysql\bin\mysql.exe -u root -p < storage/load/grants-cliniq_testing.sql`. Needed once per database.

### `php tools/load/bench.php journey --runs=5`
Times one nurse's journey 5 times, including the paged lists of ADR-082. Needs the API served from Apache on `127.0.0.1:8081`, not `php artisan serve`. Results go to `storage/load/results.jsonl`.

### `php tools/load/bench.php crowd --people=5 --minutes=10 --pause=3`
Simulates several people at once, under the sign-in and request limits. `--base=http://localhost` targets another server. It stops at its first failure, so `first_failure` shows when the server gave way.

To measure on the five-year school and then restore the demo:
```bat
php tools/load/build.php --students=900 --staff=60 --years=5 --audit=100000
php tools/load/bench.php journey --runs=5
php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force
```

---

## Screenshots (`screenshots/_capture/`)

### `node capture.mjs`
Retakes all 34 Project Plan screenshots (`node capture.mjs 07 13` retakes only those). Set the two passwords first; they are never stored in a file:
```bat
set CLINIQ_CAPTURE_PASSWORD_STAFF=...
set CLINIQ_CAPTURE_PASSWORD_ADMIN=...
```
Needs the frontend on `localhost:5180` in API mode and the API on `127.0.0.1:8001` on `cliniq_testing`. `screenshots/INDEX.md` has the exact server settings.
