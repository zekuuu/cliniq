# Environment Setup

**The frontend steps are done. The backend is not scaffolded yet: the commands below are pinned and run on the `backend` branch in Part 2 (ADR-056).** Versions checked Saturday, October 31, 2026 on the development machine's XAMPP (`C:\xampp`); dependency versions were resolved with XAMPP's own PHP by a dry run, and nothing was installed.

| Step | Command | Purpose | State |
|---|---|---|---|
| Laravel init | see "Scaffold" below | Scaffolds the backend | Not run |
| React init | `npm create vite@latest frontend -- --template react-ts` | Scaffolds frontend with TypeScript, via Vite | Done |
| Tailwind | `npm install tailwindcss` + config | Styling | Done |
| Sanctum | see "Scaffold" below | SPA authentication | Not run |
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

**The clinic computer is not confirmed yet.** These versions come from the development machine. Before installing there, run `C:\xampp\php\php.exe -v` and `SELECT VERSION();` on the clinic computer. Any PHP older than 8.4 stops Pest on that machine, but Pest is a development tool; PHP older than 8.3 stops Laravel 13 itself.

## Set up a machine

Do these steps in order. They only change XAMPP's own configuration files.

1. Install XAMPP 8.5.12 to `C:\xampp`, and Composer 2.9.8.
2. Edit `C:\xampp\php\php.ini`, which both Apache and the command line read:
   - Set `date.timezone=Asia/Manila`. XAMPP ships `Europe/Berlin` (line 1902 of the file as installed).
   - Remove the `;` from `;extension=zip` and `;extension=intl`. Backups write zip files (ADR-052). `intl` backs Laravel's number and locale helpers.
   - Leave `memory_limit=512M`, `post_max_size=40M`, `upload_max_filesize=40M` and `max_execution_time=120` as they are. No large upload exists yet.
3. Keep MariaDB off the network. In `C:\xampp\mysql\bin\my.ini`, under `[mysqld]`, uncomment `bind-address="127.0.0.1"`. XAMPP leaves it commented, so MariaDB listens on the LAN, and its `root` account has no password. Laravel and MariaDB run on the same computer, so nothing else needs port 3306.
4. Create the database and one application account. Keep the password out of the repository.
   ```sql
   CREATE DATABASE cliniq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'cliniq'@'localhost' IDENTIFIED BY '<a real password>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON cliniq.* TO 'cliniq'@'localhost';
   ```
   Give `root` a password as well. Migrations use a separate account with schema rights (`ERD.md` section 13). Migrations are not built before the ERD is approved (ADR-056).
5. Restart Apache and MySQL from the XAMPP Control Panel. Check with `C:\xampp\php\php.exe -m`: the list must include `intl`, `zip`, `pdo_mysql`, `openssl`, `mbstring`, `fileinfo` and `bcmath`.

## Scaffold

On this machine `composer` on the PATH runs a different PHP (the WinGet 8.5.6), so call Composer through XAMPP's PHP. Create the project in a scratch folder outside the repository and copy it into `backend/` without overwriting `backend/README.md` or `.env.example` (Part 2, item B0.1).

```bat
C:\xampp\php\php.exe C:\ProgramData\ComposerSetup\bin\composer.phar create-project laravel/laravel:13.11.0 cliniq-scaffold
cd cliniq-scaffold
C:\xampp\php\php.exe C:\ProgramData\ComposerSetup\bin\composer.phar require laravel/sanctum:^4.3
C:\xampp\php\php.exe C:\ProgramData\ComposerSetup\bin\composer.phar require --dev pestphp/pest:^5.3 pestphp/pest-plugin-laravel:^5.0 laravel/pint:^1.32 larastan/larastan:^3.13
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

**Not decided:** how the built frontend is served in production, and whether the LAN gets HTTPS (`Backend-Readiness-Checklist.md` section 4). Until HTTPS exists, passwords and health records cross the LAN unencrypted, and the session cookie cannot be `secure`.

## Scheduler on Windows

Laravel's scheduler needs one task that runs every minute. Create it once the backend exists, as an account that can read the backup drives, with its password stored by Task Scheduler:

```bat
schtasks /Create /TN "CLINIQ Scheduler" /SC MINUTE /MO 1 /RU <clinic account> /RP * /TR "\"C:\xampp\php\php.exe\" \"C:\CLINIQ\backend\artisan\" schedule:run"
```

It will carry the holiday sync (ADR-020) and the backup status (ADR-039, ADR-052). The Foundation adds no scheduled job, so the task is not needed until those phases. A computer that is off misses the minute; each job must therefore catch up on its next run rather than assume it ran.
