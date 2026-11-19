# Set Up and Run CLINIQ

This guide is for a first-time setup on Windows.

- **Part 1 (steps 1 to 7)** starts only the frontend, on its built-in sample data. Laravel, PHP and the database are not needed.
- **Part 2 (steps 8 to 19)** adds the backend: XAMPP, the database, the accounts, the migrations, sample data, and the frontend running on the real API.

## 1. Install Git and Node.js

Install Git for Windows and Node.js **22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later**. These are the oldest versions the frontend's test tools (jsdom and Vitest) accept; older versions are not supported.

Open PowerShell and check that the installations are available:

```powershell
git --version
node --version
npm --version
```

If PowerShell says a command is not recognized, finish installing that program, close and reopen PowerShell, then try again.

## 2. Set your Git name and email

Git adds this name and email to commits you create. Replace the examples with your own:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

To have GitHub associate your commits with your account, use an email address verified on GitHub. These settings identify your commits; they do not sign you in to GitHub.

Check the saved values:

```powershell
git config --global user.name
git config --global user.email
```

## 3. Clone the project

In PowerShell, go to the folder where you want the project stored, then clone it:

```powershell
cd $HOME\Documents
git clone https://github.com/zekuuu/cliniq.git
cd cliniq
```

Git creates a `cliniq` folder containing the project.

If you already cloned the project, do not clone it again. Update it from the repository root:

```powershell
cd $HOME\Documents\cliniq
git pull origin main
```

## 4. Open the frontend folder

```powershell
cd frontend
```

## 5. Install frontend dependencies

```powershell
npm ci
```

This installs the exact dependency versions recorded for the frontend.

## 6. Start the development server

From the frontend folder, start the app:

```powershell
npm run dev
```

Do not edit `frontend\package.json` to change this command. A local edit to a tracked file can make a later `git pull` fail.

Keep this PowerShell window open while using the app. Open the URL printed in the terminal, usually [http://localhost:5173](http://localhost:5173).

Press **Ctrl+C** in PowerShell to stop the server.

The frontend runs using its mock data. You do not need to start the backend, PHP, or a database.

## 7. Run it again on a later day

After the first-time setup, open the `cliniq` folder in VS Code, open a terminal at the repository root, and run:

```powershell
npm run dev
```

At the repository root, this command first runs `git pull origin main` to fetch the latest changes, then starts the frontend. From the `frontend` folder, `npm run dev` starts the app without pulling.

Open [http://localhost:5173](http://localhost:5173). Keep PowerShell open while using the app, then press **Ctrl+C** there to stop it.

---

# Part 2: the backend

Do these steps once per machine, in order. Use **Command Prompt** (`cmd`), not PowerShell, for Part 2: some commands below use `<` and `>` redirection, which PowerShell handles differently.

Placeholders: replace every `<root password>`, `<app password>` and `<migrate password>` with real passwords of your own. Keep them out of the repository, and never paste them into a chat or an issue.

## 8. Install XAMPP and Composer

1. Install **XAMPP 8.5.12** (PHP 8.5, MariaDB 10.11) to `C:\xampp`. Keep the default folder.
2. Install **Composer 2.9.8**, the package manager for PHP. npm does not install it: download `Composer-Setup.exe` from [getcomposer.org](https://getcomposer.org/download/). When the installer asks for PHP, choose `C:\xampp\php\php.exe`. If `composer` later runs another PHP and complains about a missing `zip` or `intl` extension, run it through XAMPP's PHP instead: `C:\xampp\php\php.exe C:\ProgramData\ComposerSetup\bin\composer.phar install`.
3. Add `C:\xampp\php` and `C:\xampp\mysql\bin` to your user `PATH` (Windows Settings, "Edit environment variables for your account"). Put `C:\xampp\php` above any other PHP.
4. Edit `C:\xampp\php\php.ini`:
   - set `date.timezone=Asia/Manila` (XAMPP ships `Europe/Berlin`);
   - remove the `;` in front of `extension=zip` and `extension=intl`. Backups need `zip`.
5. Open the XAMPP Control Panel (`C:\xampp\xampp-control.exe`) and start **MySQL**. Start **Apache** only if you serve the app the clinic-PC way.
6. Close and reopen Command Prompt, then check:

```bat
php -v
php -m
composer --version
mysql --version
```

`php -v` must show 8.5 from XAMPP. `php -m` must list `intl`, `zip`, `pdo_mysql`, `openssl`, `mbstring`, `fileinfo` and `bcmath`.

## 9. Secure MariaDB

XAMPP's MariaDB starts with a blank `root` password and listens on the network. Fix both once.

1. Open the console (no password yet):

```bat
mysql -u root
```

2. Set the root password, then leave:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '<root password>';
ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '<root password>';
ALTER USER 'root'@'::1' IDENTIFIED BY '<root password>';
exit
```

3. In `C:\xampp\mysql\bin\my.ini`, under `[mysqld]`, remove the `#` in front of `bind-address="127.0.0.1"`. Restart MySQL from the Control Panel.
4. Check that it listens only on this PC:

```bat
netstat -an | findstr 3306
```

It must show `127.0.0.1:3306`, not `0.0.0.0:3306`.

If you use phpMyAdmin, put the same root password in `C:\xampp\phpMyAdmin\config.inc.php`.

## 10. Create the databases and the two accounts

CLINIQ uses two database accounts:

- `cliniq_app`: the app itself. It can read and write data, but it cannot change tables or edit the audit log.
- `cliniq_migrate`: used only to run migrations and the tests. It is never left in `.env`.

Open the console as root:

```bat
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE IF NOT EXISTS cliniq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cliniq_testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'cliniq_app'@'localhost' IDENTIFIED BY '<app password>';
CREATE USER 'cliniq_migrate'@'localhost' IDENTIFIED BY '<migrate password>';

GRANT ALL PRIVILEGES ON cliniq.* TO 'cliniq_migrate'@'localhost';
GRANT ALL PRIVILEGES ON cliniq_testing.* TO 'cliniq_migrate'@'localhost';
GRANT ALL PRIVILEGES ON `cliniq\_check\_%`.* TO 'cliniq_migrate'@'localhost';
FLUSH PRIVILEGES;
exit
```

- `cliniq` is the development database. Treat what is in it as real.
- `cliniq_testing` holds the tests and the demo school. It may be wiped at any time.
- `cliniq_check_*` are scratch databases the checks create and drop by themselves.

`cliniq_app` gets its rights in step 14, after the tables exist.

## 11. Install the backend packages

From the repository root:

```bat
cd backend
composer install
```

## 12. Create the two environment files

These files hold passwords. They are ignored by Git; never commit them.

1. Copy the example:

```bat
copy .env.example .env
```

2. Open `backend\.env` in VS Code and set:

```ini
DB_CONNECTION=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cliniq
DB_USERNAME=cliniq_migrate
DB_PASSWORD=<migrate password>
```

The migrate account is there only for step 13. Step 14 switches it to `cliniq_app`.

3. Create the app key, once:

```bat
php artisan key:generate
```

Never run it again on a machine that already has accounts: a new key breaks every authenticator app set up with the old one.

4. Make the testing file, then open `.env.testing` and set `APP_ENV=testing` and `DB_DATABASE=cliniq_testing`. Keep `cliniq_migrate` in this file: the tests and the demo seeder need schema rights.

```bat
copy .env .env.testing
```

## 13. Run the migrations

Still with `cliniq_migrate` in `.env`:

```bat
php artisan migrate
php artisan migrate --env=testing
php artisan migrate:status
```

The first creates the 48 tables in `cliniq`, the second in `cliniq_testing`. `migrate:status` should list every migration as `Ran`.

## 14. Give the app account its rights, then switch `.env` to it

`app-grants.php` writes the exact rights `cliniq_app` needs, table by table, so it never gets `UPDATE` or `DELETE` on the audit log.

```bat
mkdir storage\load
php tools/load/app-grants.php cliniq > storage/load/grants-cliniq.sql
php tools/load/app-grants.php cliniq_testing > storage/load/grants-cliniq_testing.sql
mysql -u root -p < storage/load/grants-cliniq.sql
mysql -u root -p < storage/load/grants-cliniq_testing.sql
```

Each `mysql` line asks for the root password.

Then, in `backend\.env` only (not `.env.testing`), switch to the app account:

```ini
DB_USERNAME=cliniq_app
DB_PASSWORD=<app password>
```

## 15. Load sample data

Choose one. Both use only fictional people.

**A. The demo school, in `cliniq_testing`** (900 students, 60 staff, this school year up to now; about 40 seconds):

```bat
php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force
```

This wipes `cliniq_testing` first. Run it again whenever you want the demo school to reach today. To use it in the app, set `DB_DATABASE=cliniq_testing` in `.env`.

Demo sign-ins:

| Username | Password | Role |
|---|---|---|
| `demo.nurse` | `demo-nurse` | Staff (School Clinician) |
| `demo.principal` | `demo-admin` | Admin (Principal) |
| `demo.new` | `demo-change` | Staff, must change the password at the first sign-in |

**B. The small sample set, in `cliniq`** (the same records as the frontend's sample data). `cliniq` must be freshly migrated (step 13) and still empty:

```bat
php artisan db:seed --class="App\Shared\Database\DevelopmentSeeder"
```

## 16. Create the first Admin (a real install)

Skip this when you use the demo accounts. On a new, empty database:

```bat
php artisan cliniq:create-admin principal --name="Full Name"
```

It prints a one-time password once. Write it down; the Admin must change it at the first sign-in.

## 17. Start the API

```bat
php artisan serve
```

Keep this window open. Check it in a browser at [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health): it answers `{"data":{"status":"ok"}}`. Press **Ctrl+C** to stop it.

If you change `.env`, stop it and start it again.

## 18. Run the frontend on the real API

`backend\.env` must allow the development frontend. The values from `.env.example` already do:

```ini
CORS_ALLOWED_ORIGINS=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

Open a second window (PowerShell is fine here), go to `frontend`, and start it in API mode:

```powershell
$env:VITE_API_MODE="api"; $env:VITE_API_URL="http://localhost:8000/api"; npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and sign in with an account from step 15 or 16. Without these two variables, the frontend goes back to its sample data.

## 19. Check that everything works

From `backend`. The tests empty the database they run on, so point them at a scratch database first:

```bat
set DB_DATABASE=cliniq_check_pest
composer check
php tools/db-checks.php
```

`composer check` runs the code style check, the static analysis and every backend test. `db-checks.php` compares the tables with the approved schema.

The frontend tests run from `frontend`, from a path that starts with a capital `D:\` (a lowercase `d:\` makes every test fail):

```powershell
npm run test
```

## What else

- **Scheduled jobs.** The nightly backup (18:00), missed follow-ups (00:15) and the holiday sync need the scheduler. While developing, run `php artisan schedule:work` in its own window. On the clinic PC, Windows Task Scheduler runs `php artisan schedule:run` every minute.
- **A backup location.** On the Backup page, add at least one location on a drive that leaves the room (for example a USB drive). Click **Back up now** once and check that a `.zip` file appears in `<drive>\.cliniq\backups\`.
- **"Too many requests" while testing.** Run `php artisan cache:clear`.
- **The clinic PC.** It is served by Apache at `http://localhost`, not by `php artisan serve`, and needs a few extra settings (`php artisan optimize`, OPcache, the MariaDB buffer size). See [Environment Setup](CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md): "Serve `backend/public` from Apache", "Clinic PC only" and "Speed and reliability settings for the clinic PC".
- **All the commands worth remembering**, with their warnings: [COMMANDS.md](COMMANDS.md).
