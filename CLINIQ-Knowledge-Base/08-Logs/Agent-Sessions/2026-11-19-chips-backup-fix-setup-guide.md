Date/Day/Time: Thursday, November 19, 2026 — 21:48 PHT (clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Follow-ups after the speed run: COMMANDS.md trimmed, zero chips hidden, the "Back up now" failure fixed, clearer backup file names, headroom on the Visits trend chart, and the backend half of setup-step.md
Status: Completed

## Prompt/Request

Zean, in chat, in order:
1. "modify the commands.md, only include those commands that I should take note like the migrate:fresh, exclude those basics like git commands etc"
2. Dashboard attention chips: "in chips, if there are non, hide it"
3. "also why did backup failed" (a "Back up now" run to `D:\` failed), then "why is the zip file name 2014" and "make it clear"
4. Visits trend: "add a bit more space on top to it doesnt cut, fixed line just like add margin"
5. "continue the setup-step.md, include the setup and install of xampp, the commands to add database, then the users, etc, then the migration and seed command, what else", and "for composer I didn't install it, isnt it installed by npm"

## Files Modified

- `COMMANDS.md`: rewritten to the commands worth remembering (445 to about 190 lines).
- `frontend/src/features/dashboard/components/AttentionChips.tsx` and new `AttentionChips.test.tsx`.
- `backend/app/Modules/BackupVerification/Services/BackupService.php`, `backend/tests/Feature/UsersBackupTest.php`.
- `frontend/src/features/backup/BackupLocationsPanel.tsx`.
- `CLINIQ-Knowledge-Base/06-Decisions/ADR-052-…md` (dated note), `09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md`.
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`.
- `setup-step.md` (Part 2, steps 8 to 19); `04-Development/Environment-Setup.md` (grant note).
- `00-Project-Core/Facts-Sheet.md` (`npm run docs:facts`).

## Changes Made

- **COMMANDS.md:** kept what deletes data, needs a setup or is easy to get wrong (`migrate:fresh` and the demo seeder, Pest on `cliniq_check_pest`, `optimize` on the clinic PC only, `cache:clear`, the `cliniq:*` commands, the load tools, the dump and import). Dropped Git, installs, lint and format, and the inspection commands.
- **Chips:** a count chip with 0 renders nothing. The backup chip already showed only when there is an alert.
- **Backup failure:** the saved error was "mysqldump failed (exit 2)". The service now keeps mysqldump's own message, which read `Got error: 2004: "Can't create TCP/IP socket (10106)"`. Under `php artisan serve` (the WinGet PHP 8.5 on this machine) mysqldump started without `SystemRoot`, and Windows cannot open a socket without it. The dump now passes `SystemRoot` on Windows. The same backup from the command line had worked. Zean's next "Back up now" wrote `cliniq-2026-11-19_2019.zip`.
- **File names (ADR-052 note):** `cliniq-YYYY-MM-DD_HHmm.zip` read like a year ("2014"). New files are `cliniq-YYYY-MM-DD_at_HH-mm.zip`; old ones keep their names, and the keep-last cleanup sorts both correctly.
- **Visits trend:** the y scale has `grace: '5%'`, so it ends one gridline past the highest point.
- **setup-step.md Part 2:** XAMPP and Composer (from getcomposer.org, not npm), `php.ini`, MariaDB hardening, the two databases and accounts, `composer install`, `.env` and `.env.testing`, migrations, the app grants through `app-grants.php`, sample data, the first Admin, the API, the frontend on the API, the checks, and a "What else" list.

## Reason

Zean's requests above.

## Testing Performed

- Frontend: dashboard tests 58 of 58 and `review-round-2` pass; `npx tsc -b` clean; ESLint clean on the changed folder.
- Backend: `UsersBackupTest` 9 of 9 on `cliniq_check_pest`; Pint and PHPStan clean on `BackupService.php`. One `php artisan cliniq:backup` run (20:14) on `cliniq_testing` wrote a valid zip to `D:\.cliniq\backups\2026\11\`.
- Docs: `npm run docs:check` passes.
- Not run: the full suites; setup-step.md Part 2 on a clean machine.

## Known Issues

- `setup-step.md` Part 2 has not been followed on a fresh machine. `backend/.env.example` could not be read (a deny rule), so step 12 assumes its key names.
- Two orphaned dev servers (Vite on 5173 from November 16, `php -S` on 8000) were stopped on Zean's request; Zean started new ones at 20:03.

## Next Steps

- Zean reviews and commits the uncommitted part (chart headroom, setup guide, logs).
- Follow setup-step.md Part 2 once on a clean machine.
