# CLINIQ Commands

Every command you can run in this repository, with what it does, when to use it and what to watch for.

Where to run them:
- **Frontend** commands: from `frontend/`.
- **Backend** commands (`php`, `composer`, `vendor/bin/...`): from `backend/`, with XAMPP's PHP (`C:\xampp\php\php.exe`) on PATH.
- **Root** commands: from the repository root.

Databases:
- `cliniq` is the development database. Treat it as real data.
- `cliniq_testing` is for tests and the demo (load-test) school. It may be emptied at any time; reseed it with the demo seeder.
- `cliniq_check_*` are scratch databases (Pest with `DB_DATABASE=cliniq_check_pest`, `db-checks.php`, trials of the demo seeder).

## Quick reference

Folder: **F** = `frontend/`, **R** = repository root, **B** = `backend/`, **S** = `screenshots/_capture/`, **any** = anywhere. ⚠ = deletes or overwrites data. Full descriptions follow the table.

| Command | Folder | What it does |
|---|---|---|
| `npm install` | F | Install frontend packages |
| `npm ci` | F | Clean install exactly from `package-lock.json` |
| `npm run dev` | F | Dev server at `http://localhost:5173` (mock data) |
| `$env:VITE_API_MODE="api"; $env:VITE_API_URL="http://localhost:8000/api"; npm run dev` | F | Dev server against the real API (PowerShell) |
| `npm run build` | F | Type check and production build into `dist/` |
| `npm run preview` | F | Serve the built `dist/` |
| `npm run test` | F | Run all Vitest tests once |
| `npm run test -- src/path/File.test.tsx` | F | Run one test file |
| `npm run test -- -t "name"` | F | Run tests whose name matches |
| `npm run test:watch` | F | Rerun tests on save |
| `npm run typecheck` | F | TypeScript check only |
| `npm run lint` | F | ESLint, report only |
| `npm run lint -- --fix` | F | ESLint, fix what it can |
| `npm run format` | F | Prettier, rewrite files |
| `npm run format:check` | F | Prettier, report only |
| `npm run dev` | R | Same as the frontend dev server |
| `npm run docs:facts` | R | Regenerate the Facts sheet |
| `npm run docs:check` | R | Check docs: numbers, links, dates, stale features |
| `npm run docs:check -- --mermaid` | R | Also render every Mermaid diagram |
| `npm run docs:trace` | R | Regenerate the requirement traceability table |
| `npm run docs:trace -- --check` | R | Print missing traceability links only |
| `npm run docs:diagrams` | R | Export diagrams to SVG and PNG |
| `npm run docs:adrs` | R | Regenerate the ADR index |
| `composer install` | B | Install PHP packages |
| `composer test` | B | ⚠ Pest tests; empties `cliniq_testing` |
| `vendor/bin/pest --filter="name"` | B | ⚠ Run matching Pest tests; empties `cliniq_testing` |
| `composer lint` | B | Pint, report only |
| `vendor/bin/pint` | B | Pint, fix code style |
| `composer analyse` | B | PHPStan static analysis |
| `composer check` | B | ⚠ lint + analyse + test; empties `cliniq_testing` |
| `composer dump-autoload` | B | Rebuild the class map |
| `php artisan list` | B | List every Artisan command |
| `php artisan help <command>` | B | One command's options |
| `php artisan serve` | B | API at `http://127.0.0.1:8000` (development) |
| `php artisan migrate` | B | Run pending migrations |
| `php artisan migrate:status` | B | Show which migrations ran |
| `php artisan migrate:rollback` | B | ⚠ Undo the last migration batch |
| `php artisan migrate:fresh` | B | ⚠ Drop every table and migrate again |
| `php artisan db:show` | B | Connected database and its tables |
| `php artisan db:table <table>` | B | One table's columns and indexes |
| `php artisan tinker` | B | PHP shell inside the app |
| `php artisan cliniq:create-admin <username> --name="Full Name"` | B | Create the first Admin with a one-time password |
| `php artisan cliniq:reset-admin-password` | B | Break-glass Admin password reset |
| `php artisan cliniq:backup` | B | Back up to every enabled location now |
| `php artisan cliniq:sync-holidays` | B | Sync PH holidays if 30+ days old |
| `php artisan cliniq:sync-holidays --force` | B | Sync PH holidays now |
| `php artisan cliniq:sync-holidays --file=holidays-ph.json` | B | Import holidays from a local file |
| `php artisan cliniq:close-missed-follow-ups` | B | Mark overdue follow-ups Missed |
| `php artisan schedule:list` | B | List scheduled tasks |
| `php artisan schedule:run` | B | Run tasks due now |
| `php artisan schedule:work` | B | Run the scheduler in the foreground |
| `php artisan cache:clear` | B | Clear app cache and rate limits |
| `php artisan config:clear` | B | Clear cached config after `.env` edits |
| `php artisan optimize:clear` | B | Clear every cache |
| `php artisan route:list --path=api` | B | List API routes |
| `php artisan about` | B | Environment and versions |
| `php tools/db-checks.php` | B | Compare migrations with the reference schema |
| `php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force` | B | ⚠ Wipe `cliniq_testing` and seed the demo school up to now |
| `php tools/load/build.php --students=900 --staff=60 --years=1` | B | ⚠ Build the test school in `cliniq_testing` (runs `migrate:fresh`) |
| `php tools/load/checks.php` | B | Read-only checks on the test school |
| `php tools/load/app-grants.php cliniq_testing > storage/load/grants-cliniq_testing.sql` | B | Write app-account grants SQL |
| `php tools/load/bench.php journey --runs=5` | B | Time one nurse's journey |
| `php tools/load/bench.php crowd --people=5 --minutes=10 --pause=3` | B | Simulate several users at once |
| `npm install` | S | Install Playwright for captures |
| `node capture.mjs` | S | Retake all 34 screenshots |
| `node capture.mjs 07 13` | S | Retake only those numbers |
| `C:\xampp\xampp-control.exe` | any | XAMPP Control Panel |
| `C:\xampp\mysql\bin\mysql.exe -u root -p` | any | MariaDB console |
| `C:\xampp\mysql\bin\mysqldump.exe -u root -p cliniq > cliniq-backup.sql` | any | Export `cliniq` to SQL |
| `C:\xampp\mysql\bin\mysql.exe -u root -p cliniq < cliniq-backup.sql` | any | ⚠ Import SQL into `cliniq` |
| `git status -sb` | any | Branch, ahead/behind, changes |
| `git log --oneline -10` | any | Last 10 commits |
| `git log --oneline --all --graph -20` | any | Commit graph, all branches |
| `git diff` / `git diff --staged` | any | Unstaged / staged changes |
| `git branch -a` | any | All branches |
| `git fetch origin` | any | Download commits, change nothing |
| `git pull origin main` | any | Download and merge `main` |
| `git switch <branch>` | any | Switch branch |
| `git switch -c <new-branch>` | any | Create and switch to a branch |
| `git add <path>` | any | Stage a file |
| `git commit -m "type(scope): message"` | any | Commit staged changes |
| `git push origin <branch>` | any | Upload a branch |
| `git merge main` | any | Merge `main` into this branch |
| `git stash` / `git stash pop` | any | Set changes aside / bring back |
| `git restore <path>` | any | ⚠ Discard uncommitted changes to a file |
| `git restore --staged <path>` | any | Unstage, keep changes |

---

## 1. Frontend (`frontend/`)

### `npm install`
Installs every package listed in `package.json` into `node_modules/`.
- Run it once after cloning, and again whenever `package.json` or `package-lock.json` changes (for example after `git pull`).
- `npm ci` does the same but installs exactly what `package-lock.json` says and deletes `node_modules/` first. Use it when installs act strangely.

### `npm run dev`
Starts the Vite development server at `http://localhost:5173`.
- The page reloads by itself when you save a file.
- Stop it with `Ctrl+C`.
- By default the app runs on **mock data** in the browser; no backend is needed.
- To run against the real Laravel API instead (PowerShell):
  ```powershell
  $env:VITE_API_MODE = "api"; $env:VITE_API_URL = "http://localhost:8000/api"; npm run dev
  ```
  The API must be running (see `php artisan serve` below), and its CORS and Sanctum settings must allow the frontend's address.

### `npm run build`
Runs the TypeScript compiler (`tsc -b`), then builds the production bundle into `frontend/dist/`.
- Fails if there is any type error, so it is also a full type check.
- `dist/` is what gets served on the clinic PC.

### `npm run preview`
Serves the built `dist/` folder locally, so you can test the production build. Run `npm run build` first.

### `npm run test`
Runs the whole Vitest test suite once and exits. Exit code 0 means every test passed.
- Run one file: `npm run test -- src/path/to/File.test.tsx`
- Run tests whose name matches: `npm run test -- -t "student list"`

### `npm run test:watch`
Runs Vitest in watch mode: it reruns the affected tests every time you save. Stop with `Ctrl+C` or `q`.

### `npm run typecheck`
TypeScript check only (`tsc -b`), no build output. Faster than `npm run build` when you only want to know whether the types are right.

### `npm run lint`
Runs ESLint over the frontend. Reports code problems (unused variables, hook rules, and the like). Changes nothing.
- `npm run lint -- --fix` fixes what it can by itself.

### `npm run format`
Runs Prettier and **rewrites** files to the project's formatting. Run it before committing.

### `npm run format:check`
Runs Prettier in check mode: lists badly formatted files and changes nothing.

---

## 2. Root (repository root)

### `npm run dev`
Shortcut for `cd frontend && npm run dev`.

### `npm run docs:facts`
Regenerates `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` (counts of screens, routes, tables, tests and so on) from the repository.
- `node CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs --tests` also runs both test suites and `backend/tools/db-checks.php` and records the results. Note: this runs `composer test`, which empties `cliniq_testing`.
- `--json` prints the numbers as JSON instead of writing the sheet.

### `npm run docs:check`
Documentation check. Changes nothing; prints pass/fail and exits 1 on any failure. It checks:
1. numbers in the READMEs and Start Here against a fresh Facts sheet;
2. every relative link and heading anchor in the Markdown;
3. "Last checked" dates older than the newest ADR or changelog row;
4. removed features still described as current;
5. that `AGENTS.md` and `CLAUDE.md` are identical apart from the title.

`npm run docs:check -- --mermaid` also renders every Mermaid diagram. It needs Chrome or Chromium (`PUPPETEER_EXECUTABLE_PATH`), never Microsoft Edge.

### `npm run docs:trace`
Rewrites the traceability table at the end of `01-Requirements/Functional-Requirements.md`: requirement, module, screen, API endpoints, tables, ADRs, tests. Anything it cannot find is marked "(missing)".
- `npm run docs:trace -- --check` prints only the missing links and changes nothing.

### `npm run docs:diagrams`
Exports every diagram to SVG and 2× PNG in `02-Architecture/Database/Diagrams/`, for pasting into Word or Google Docs. Needs the Mermaid CLI (downloaded by npx on first use), Chrome or Chromium, and Graphviz for the ERD overview.

### `npm run docs:adrs`
Regenerates `06-Decisions/ADR-Index.md` from the ADR files and `Decisions-Summary.md`. Run it after adding or changing an ADR.

---

## 3. Backend: Composer (`backend/`)

### `composer install`
Installs the PHP packages listed in `composer.json` into `vendor/`. Run once after cloning, and again when `composer.json` or `composer.lock` changes.

### `composer test`
Runs the Pest test suite (`vendor/bin/pest`).
- **Warning:** the tests use `RefreshDatabase` on `cliniq_testing`, so this **empties that database**, including a loaded test school. To keep the loaded school, run the tests on a scratch database instead:
  ```bat
  set DB_DATABASE=cliniq_check_pest
  composer test
  ```
- Run one file: `vendor/bin/pest tests/Feature/SomeTest.php`
- Run tests whose name matches: `vendor/bin/pest --filter="creates a visit"`

### `composer lint`
Runs Pint in test mode. Lists files that break the code style and changes nothing.

### `vendor/bin/pint`
Runs Pint and **fixes** the code style in place. Run it before committing backend code.

### `composer analyse`
Runs PHPStan (static analysis, 1 GB memory limit). Finds type errors and wrong calls without running the code.

### `composer check`
Runs `lint`, then `analyse`, then `test`, and stops at the first failure. The full check before a commit. It also empties `cliniq_testing` (see `composer test`).

### `composer dump-autoload`
Rebuilds Composer's class map. Use it when a newly added class "is not found".

---

## 4. Backend: Artisan (`backend/`)

`php artisan list` prints every command; `php artisan help <command>` prints one command's options.

### 4.1 Serve the API

#### `php artisan serve`
Starts the API at `http://127.0.0.1:8000` for development. Stop with `Ctrl+C`.
- `php artisan serve --port=8001` uses another port.
- Development only. The clinic PC serves `backend/public` through Apache (ADR-079).

### 4.2 Database

#### `php artisan migrate`
Runs every migration that has not run yet on the database set in `.env`. Safe to repeat: migrations that already ran are skipped.

#### `php artisan migrate:status`
Lists every migration and whether it has run (`Ran`) or is pending.

#### `php artisan migrate:rollback`
Undoes the last batch of migrations. `--step=1` undoes only the last single migration.

#### `php artisan migrate:fresh`
**Drops every table** in the database, then runs all migrations from the start. All data is lost. Never run it on real clinic data.

#### `php artisan db:show`
Shows the connected database: name, server version, size, and each table with its row count. A quick way to confirm which database `.env` points to.

#### `php artisan db:table <table>`
Shows one table's columns, types, indexes and foreign keys. Example: `php artisan db:table students`.

#### `php artisan tinker`
Opens an interactive PHP shell inside the app, with models and services available. Example: `App\Models\User::count()`. Anything you write in it changes the real database.

### 4.3 CLINIQ commands

#### `php artisan cliniq:create-admin <username> --name="Full Name"`
Creates the first Admin/Principal account (ADR-079).
- Prints a generated **one-time password once**; it is never stored in a log.
- The Admin must change it at the first sign-in.
- `--name` defaults to `Administrator`.

#### `php artisan cliniq:reset-admin-password`
Break-glass reset for a locked-out Administrator.
- It asks for the username and a temporary password at the console (never on the command line).
- The Administrator must choose a new password at the next sign-in.
- Record each use on paper with the Principal.

#### `php artisan cliniq:backup`
Backs up the database to every enabled backup location now (ADR-037).
- Prints whether the backup finished or failed; details are on the app's Backup page.
- The scheduler also runs it daily at 18:00.

#### `php artisan cliniq:sync-holidays`
Downloads the nationwide Philippine holidays, but only when the last good sync is 30 or more days old (ADR-020).
- `--force` syncs now regardless.
- `--file=holidays-ph.json` imports a local file instead of downloading, for when there is no internet.
- The scheduler also runs it hourly from 07:00 to 18:00.

#### `php artisan cliniq:close-missed-follow-ups`
Marks every pending follow-up past its auto-close limit as **Missed** (ADR-051). Prints how many it closed. The scheduler also runs it daily at 00:15.

### 4.4 Scheduler

#### `php artisan schedule:list`
Lists every scheduled task with its timing and next run.

#### `php artisan schedule:run`
Runs the tasks that are due right now, then exits. On the clinic PC, Windows Task Scheduler calls it every minute.

#### `php artisan schedule:work`
Keeps running in the foreground and runs due tasks each minute. For development, instead of Task Scheduler. Stop with `Ctrl+C`.

### 4.5 Caches and inspection

#### `php artisan cache:clear`
Clears the application cache, including the rate-limit counters (120 requests a minute per user, 10 sign-ins a minute per address). Use it when you are blocked with "Too many requests" during testing.

#### `php artisan config:clear`
Clears cached configuration. Run it after editing `.env` if the change does not take effect.

#### `php artisan optimize:clear`
Clears every cache at once: config, routes, views, events and the application cache.

#### `php artisan route:list --path=api`
Lists every API route with its method, URL, controller and middleware. `--method=POST` filters by method.

#### `php artisan about`
Prints the environment, PHP and Laravel versions, and the cache, database and session drivers in use.

---

## 5. Backend tools (`backend/`)

### `php tools/db-checks.php`
Checks that the migrations match the approved reference schema.
1. Loads `Reference-Schema.sql` into the scratch database `cliniq_check_ref`.
2. Runs the app's migrations into `cliniq_check_mig`.
3. Compares tables, columns, indexes and CHECK constraints (expects 48 tables, 462 columns).
4. Runs the constraint tests and expects 0 failures.

It uses `.env.testing` and drops both scratch databases at the end. Exit code 0 means everything passed.

### `php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force`
Wipes the database and seeds the fictional demo school: 900 students, 60 staff, the current school year from June 15 up to the real clock (added Wednesday, November 18, 2026 — 21:55 PHT).
- **It replaces everything in `cliniq_testing`.** Use it after `composer test` (which empties `cliniq_testing`) or whenever the demo school should reach today.
- Run it again on a later day and the earlier days come out the same (same ids); only the new days are added.
- About 40 s. It refuses production, `cliniq`, other databases, and a database that is not empty.
- `set DB_DATABASE=cliniq_check_demo` first to try it on a scratch database instead.
- Options (`DEMO_SCHOOL_YEARS`, `DEMO_SCHOOL_UNTIL` and the rest) and the accounts are in `backend/tools/load/README.md`.

### `php tools/load/build.php --students=900 --staff=60 --years=1`
Builds a fictional, repeatable school the size of the real clinic's in `cliniq_testing`: students, staff, visits, incidents, follow-ups, excuse letters, stock, calendar and audit trail.
- **It runs `migrate:fresh` first**, so everything in `cliniq_testing` is replaced.
- It never touches `cliniq`. It refuses production, and any database holding accounts or students it did not make.
- `--years=5` builds five school years (about five times longer; one year takes about 1 minute).
- `--staff=150` builds the larger staff case.
- `--audit=100000` pads the audit log to test a big one.
- `--seed=<n>` changes the fixed seed. The same options always make the same school.
- `--until=YYYY-MM-DD` stops at the end of that day (never later than now; the default is now).
- `DB_DATABASE=cliniq_load` (or a `cliniq_check_*` name) builds there instead.
- Sign-in accounts and passwords are in `backend/tools/load/README.md`.
- Generated CSVs and logs go to `backend/storage/load/` (git-ignored).

### `php tools/load/checks.php`
Read-only soundness checks on the loaded school:
- foreign keys and the stock ledger;
- excuse-letter and incident-report numbers unique and without gaps;
- the reserved test LRN range;
- no surname shared with the project's real people.

Exit code 0 means every check passed.

### `php tools/load/app-grants.php cliniq_testing > storage/load/grants-cliniq_testing.sql`
Writes the SQL that gives the app account `cliniq_app` the same rights on that database as on `cliniq`. Apply it with:
```bat
C:\xampp\mysql\bin\mysql.exe -u root -p < storage/load/grants-cliniq_testing.sql
```
Needed once per database, and again after restoring into a new one.

### `php tools/load/bench.php journey --runs=5`
Times one nurse's normal journey through the app, 5 times, against the loaded school. It needs the API served from Apache on `127.0.0.1:8081`, not `php artisan serve`. Results are appended to `storage/load/results.jsonl`.

### `php tools/load/bench.php crowd --people=5 --minutes=10 --pause=3`
Simulates several people using the app at once for the given minutes, pausing the given seconds between actions. It stays under the sign-in and request limits.
- `--base=http://localhost` points it at another server, such as the clinic PC's training database.

---

## 6. Screenshots (`screenshots/_capture/`)

### `npm install`
Installs Playwright and Chromium for the capture script only. Run once.

### `node capture.mjs`
Retakes all 34 Project Plan screenshots into `screenshots/`. First set the two passwords, which are never stored in a file:
```bat
set CLINIQ_CAPTURE_PASSWORD_STAFF=...
set CLINIQ_CAPTURE_PASSWORD_ADMIN=...
```
It needs the frontend on `localhost:5180` in API mode and the API on `127.0.0.1:8001` on `cliniq_testing`. `screenshots/INDEX.md` has the exact server settings.

### `node capture.mjs 07 13`
Retakes only the screenshots with those numbers.

---

## 7. XAMPP and MariaDB

### `C:\xampp\xampp-control.exe`
Opens the XAMPP Control Panel. Start **MySQL** (MariaDB) there before running the backend; start **Apache** to serve the app the way the clinic PC does.

### `C:\xampp\mysql\bin\mysql.exe -u root -p`
Opens the MariaDB console as root. It asks for the password. Useful statements:
- `SHOW DATABASES;` lists the databases.
- `USE cliniq_testing;` switches to a database.
- `SHOW TABLES;` lists its tables.
- `exit` leaves the console.

### `C:\xampp\mysql\bin\mysqldump.exe -u root -p cliniq > cliniq-backup.sql`
Exports the whole `cliniq` database to a SQL file, as a manual backup.

### `C:\xampp\mysql\bin\mysql.exe -u root -p cliniq < cliniq-backup.sql`
Imports a SQL file into `cliniq`. **It overwrites the tables in that file.** Check the database name twice before running it.

---

## 8. Git

### Look

- `git status -sb`: current branch, how far ahead or behind GitHub it is, and the changed files.
- `git log --oneline -10`: the last 10 commits, one line each.
- `git log --oneline --all --graph -20`: the last 20 commits on every branch, as a graph.
- `git diff`: unstaged changes.
- `git diff --staged`: changes staged for the next commit.
- `git branch -a`: local and remote branches.

### Update and switch

- `git fetch origin`: downloads new commits from GitHub without changing your files.
- `git pull origin main`: downloads and merges `main` into the current branch.
- `git switch <branch>`: switches branch. Commit or stash your changes first.
- `git switch -c <new-branch>`: creates a branch from the current one and switches to it.

### Save

- `git add <path>`: stages one file or folder for the next commit.
- `git commit -m "type(scope): message"`: commits what is staged, in the project's one-line style.
- `git push origin <branch>`: uploads the branch's commits to GitHub.
- `git merge main`: brings `main` into the current branch.

### Set aside and undo

- `git stash` / `git stash pop`: sets uncommitted changes aside, then brings them back.
- `git restore <path>`: **discards** your uncommitted changes to that file. They cannot be recovered.
- `git restore --staged <path>`: unstages a file and keeps the changes.
