# Environment Setup

**The frontend steps are done, and the backend foundation is scaffolded in `backend/`** (Sunday, November 1, 2026 — 02:44 PHT). Versions checked Saturday, October 31, 2026 on the development machine's XAMPP (`C:\xampp`).

| Step | Command | Purpose | State |
|---|---|---|---|
| Laravel init | see "Scaffold" below | Scaffolds the backend | Done |
| React init | `npm create vite@latest frontend -- --template react-ts` | Scaffolds frontend with TypeScript, via Vite | Done |
| Tailwind | `npm install tailwindcss` + config | Styling | Done |
| Sanctum | see "Scaffold" below | SPA authentication | Done |
| Charts | `npm install chart.js react-chartjs-2` | Dashboard charts | Done |
| MariaDB | Configure Laravel `.env` against XAMPP's MariaDB (`DB_CONNECTION=mariadb`) | Database connection | Not run |
| Git | `git init` at the repo root | Version control from day one | Done |

Standardize all dev machines on **XAMPP**, not Laravel Herd: it matches the client's production environment. Node.js must be 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later (`setup-step.md`).

## Pinned versions

| Component | Version | Note |
|---|---|---|
| XAMPP | 8.5.12-0 (`properties.ini`) | Windows x64 |
| PHP | 8.5.12, thread safe, x64 | Runs inside Apache as `php8apache2_4.dll` |
| Apache | 2.4.65 | `mod_rewrite` loaded, `httpd-vhosts.conf` included, listens on port 80 |
| MariaDB | 10.11.16 | Port 3306 |
| Composer | 2.9.8 | Run it with XAMPP's PHP, see below |
| Laravel | framework 13.39.0, skeleton 13.11.0 | Needs PHP 8.3 or newer. Has the `mariadb` driver |
| Laravel Sanctum | 4.3.3 | |
| Pest | 5.3.4, with `pest-plugin-laravel` 5.0.1 | Needs PHP 8.4 or newer |
| Laravel Pint | 1.32.1 | |
| Larastan | 3.13.2, with PHPStan 2.3.4 | |

**These versions are the development machine's.** Development and testing stay there for now (ADR-057). The clinic computer's check waits for deployment: run `C:\xampp\php\php.exe -v` and `SELECT VERSION();` there then (`LATER`). PHP older than 8.4 stops Pest on that machine, but Pest is a development tool; PHP older than 8.3 stops Laravel 13 itself.

## Set up a machine

Do these steps in order. They only change XAMPP's own configuration files.

1. Install XAMPP 8.5.12 to `C:\xampp`, and Composer 2.9.8.
2. Edit `C:\xampp\php\php.ini`, which both Apache and the command line read:
   - Set `date.timezone=Asia/Manila`. XAMPP ships `Europe/Berlin` (line 1902 of the file as installed).
   - Remove the `;` from `;extension=zip` and `;extension=intl`. Backups write zip files (ADR-052). `intl` backs Laravel's number and locale helpers.
   - Leave `memory_limit=512M`, `post_max_size=40M`, `upload_max_filesize=40M` and `max_execution_time=120` as they are. No large upload exists yet.
3. Harden MariaDB, once: see "MariaDB hardening" below.
4. Restart Apache and MySQL from the XAMPP Control Panel. Check with `C:\xampp\php\php.exe -m`: the list must include `intl`, `zip`, `pdo_mysql`, `openssl`, `mbstring`, `fileinfo` and `bcmath`.

## MariaDB hardening

Do this once on Zean's own machine. XAMPP's MariaDB ships listening on the network, with a blank `root` password. Run the SQL with `C:\xampp\mysql\bin\mysql.exe -u root`.

1. Set a root password. Keep it out of the repository.
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY '<a real password>';
   ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '<a real password>';
   ALTER USER 'root'@'::1' IDENTIFIED BY '<a real password>';
   ```
   phpMyAdmin then needs the same password in `C:\xampp\phpMyAdmin\config.inc.php`.
2. Stop it listening on the network. In `C:\xampp\mysql\bin\my.ini`, under `[mysqld]`, uncomment `bind-address="127.0.0.1"`, then restart MySQL. Check with `netstat -an | findstr 3306`: it must show `127.0.0.1:3306`, not `0.0.0.0:3306`.
3. Create the database and a dedicated application user with only what the application needs.
   ```sql
   CREATE DATABASE IF NOT EXISTS cliniq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'cliniq_app'@'localhost' IDENTIFIED BY '<a real password>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON cliniq.* TO 'cliniq_app'@'localhost';
   ```
   Migrations use a separate account with schema rights, and `cliniq_app` keeps only `SELECT` and `INSERT` on `audit_logs` (`ERD.md` section 13).
4. Stop using `root` in `.env`: set `DB_USERNAME=cliniq_app` and its password.

The clinic computer repeats these steps, and it needs HTTPS before real data crosses the LAN (ADR-057).

## Scaffold

On this machine `composer` on the PATH runs a different PHP (the WinGet 8.5.6), so call Composer through XAMPP's PHP. The project was created in a scratch folder outside the repository and copied into `backend/` without the skeleton's migrations, factory, seeder, `User` model and web assets. It is recorded here for a rebuild; on any other machine run `composer install` in `backend/`. The `-d` flags stand in for `php.ini` steps not yet done.

```bat
set PHP=C:\xampp\php\php.exe -d extension=zip -d extension=intl -d memory_limit=-1
set COMPOSER=C:\ProgramData\ComposerSetup\bin\composer.phar
%PHP% %COMPOSER% create-project laravel/laravel:13.11.0 cliniq-scaffold --no-scripts
cd cliniq-scaffold
%PHP% %COMPOSER% require laravel/sanctum:^4.3 --no-scripts
%PHP% %COMPOSER% remove --dev phpunit/phpunit laravel/pao laravel/pail --no-scripts
%PHP% %COMPOSER% require --dev pestphp/pest:^5.3 pestphp/pest-plugin-laravel:^5.0 laravel/pint:^1.32 larastan/larastan:^3.13 --no-scripts -W
```

`composer.lock` is committed, so `composer install` gives every machine the same versions.

## Serve `backend/public` from Apache

Point Apache at Laravel's `public` folder only, never at `backend/` itself: `.env` sits there. Add this to `C:\xampp\apache\conf\extra\httpd-vhosts.conf`, with the real folder and the clinic's LAN range:

```apache
<VirtualHost *:80>
    ServerName cliniq.local
    DocumentRoot "C:/CLINIQ/backend/public"
    <Directory "C:/CLINIQ/backend/public">
        AllowOverride All
        Options -Indexes +FollowSymLinks
        Require local
        Require ip <clinic LAN range, for example 192.168.1>
    </Directory>
</VirtualHost>
```

Add `127.0.0.1 cliniq.local` to `C:\Windows\System32\drivers\etc\hosts` on the clinic computer. Another device on the LAN (ADR-029 note) uses the computer's LAN address or an entry in its own hosts file. That address also goes into the allowed origins, the Sanctum stateful domains and the session cookie domain (Part 2, item B0.4).

**Deferred (`LATER`, ADR-057):** how the built frontend is served in production, and HTTPS on the LAN. Development uses plain HTTP on localhost. Real data must not cross the LAN until HTTPS exists: passwords and health records would travel unencrypted, and the session cookie could not be `secure`. The origins, the `secure` flag and the stateful domains stay in `.env`, so deployment needs no code change.

## Scheduler on Windows

Laravel's scheduler needs one task that runs every minute. Create it once the backend exists, as an account that can read the backup drives, with its password stored by Task Scheduler:

```bat
schtasks /Create /TN "CLINIQ Scheduler" /SC MINUTE /MO 1 /RU <clinic account> /RP * /TR "\"C:\xampp\php\php.exe\" \"C:\CLINIQ\backend\artisan\" schedule:run"
```

It will carry the holiday sync (ADR-020) and the backup status (ADR-039, ADR-052). The Foundation adds no scheduled job, so the task is not needed until those phases. A computer that is off misses the minute; each job must therefore catch up on its next run rather than assume it ran.

## Authenticator recovery: the encryption key and the Administrator's break-glass

Added Saturday, November 07, 2026 — 13:24 PHT for [ADR-073](../06-Decisions/ADR-073-Password-Recovery-With-An-Authenticator-App.md). Nothing here is built before phase B2.

**The key.** `users.totp_secret` is encrypted with Laravel `Crypt`, which uses `APP_KEY` in `backend/.env`. The key lives in the environment, never in the database or the repository. If it is lost, every authenticator stops working and has to be set up again. If it leaks with a database copy, the secrets can be read. So:

- Keep `APP_KEY` out of the database backups. A copy goes with the clinic's sealed handover papers, and nowhere on the backup drives in plain text. Who holds it is a `DECIDE` in `Backend-Issues-and-TODOs.md`.
- Never run `php artisan key:generate` on the clinic computer once accounts exist: it would break every authenticator and every session. To rotate the key, use Laravel's `APP_PREVIOUS_KEYS`.

**Break-glass for the Administrator.** Nobody in the app can reset the Administrator's password (ADR-033, ADR-073). The Administrator sets up the authenticator at handover and keeps the 8 recovery codes. If the password, the phone and the codes are all lost, someone at the clinic computer with Windows access to `C:\CLINIQ\backend` runs this offline:

```bat
"C:\xampp\php\php.exe" "C:\CLINIQ\backend\artisan" cliniq:reset-admin-password
```

The command (to be built in B2):

- asks for the Administrator's username and a temporary password at the console, never as an argument;
- sets `must_change_password = 1`, so the Admin chooses a new one at the next sign-in;
- clears the lock and writes an audit entry, "Reset password with the break-glass command", by action only.

It works only on the clinic computer, since it needs the files and the database account. Record each use on paper with the Principal.
