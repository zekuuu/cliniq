Date/Day/Time: Tuesday, November 17, 2026 — 21:29 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: The load-test data on `cliniq_testing` signs in with the mock's accounts and passwords
Status: Completed
Prompt/Request: "now for cliniq_testing users, same as mock db users, not load.nurse etc also passwords". Asked which of the other 24 `load.*` accounts to keep; Zean chose to keep the covering, former and bench accounts as background fixtures.

Files Modified:
- `backend/tools/load/Generator.php`: the accounts now include the mock's three, with the mock's names and passwords. New `DEMO_USERNAMES` constant.
- `backend/tools/load/build.php`: the "data it did not make" guard also allows the three demo usernames.
- `backend/tools/load/checks.php`: the surname check skips the demo accounts. The file loads `Generator.php` with `require_once` so it still runs on its own.
- `backend/tools/load/bench.php`: the journey defaults to `demo.nurse` and signs in with `demo-nurse`; the bench accounts keep `Load-Test-Only-2026`.
- `backend/tools/load/README.md`: the accounts paragraph and the guard line.
- `CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md`: one row.

Changes Made:

| Username | Name | Role | Password | Before |
|---|---|---|---|---|
| `demo.principal` | Demo Admin | Admin | `demo-admin` | `load.principal`, "Principal Load Test", `Load-Test-Only-2026` |
| `demo.nurse` | Demo Clinician | Staff | `demo-nurse` | `load.nurse`, "Nurse Load Test", `Load-Test-Only-2026` |
| `demo.new` | Ghenly Tinapay | Staff | `demo-change`, must change at first sign-in | did not exist |
| `load.cover1`-`3`, `load.former`, `load.bench01`-`20` | unchanged | Staff | `Load-Test-Only-2026` | unchanged |

The names and passwords are those in `frontend/src/lib/mock-db/mock-db.json` (`users` and `frontendOnly.devAccounts`). `demo.new` is created through `UserService::save` with a temporary password, so `must_change_password` is 1, as in the mock. The other two accounts get their password through `AuthService::setPassword`, as before.

Why `checks.php` changed: its "no real surnames" check treats the mock's non-"Demo" user names as possibly real people. The copied "Ghenly Tinapay" account would fail it, so the check now skips the three demo usernames. Generated students and staff are still checked against every surname, including Tolentino.

Left alone: `screenshots/_capture/config.json` and `screenshots/INDEX.md` still name `load.nurse` and `load.principal`. They record how the existing images were taken. The capture script reads one password for both roles, and the demo accounts now have different passwords. A recapture needs `config.json` set to `demo.nurse`/`demo.principal` and a password per role. `08-Logs/Load-Test-Nov16/NOTES.md` and the earlier session log describe the original run and are history, not edited.

Reason: The mock and the API test data should share one set of sign-ins, so the same demo accounts work in either `VITE_API_MODE`.

Testing Performed:
- `php -l` on the four PHP files: no syntax errors.
- `php tools/load/build.php --students=900 --staff=60 --years=5` on `cliniq_testing`, built in 587.1 s. 27 users (26 before, plus `demo.new`). 903 active students and 301 archived; 23,750 visits; 682 incidents. Every check printed `ok`, including the surname check (4 surnames, 0 matches) and "the audit log names no one who does not exist".
- `Hash::check` against the database: `demo.principal`/`demo-admin`, `demo.nurse`/`demo-nurse`, `demo.new`/`demo-change` (must change = 1) and `load.bench01`/`Load-Test-Only-2026` all match. `load.nurse` and `load.principal` no longer exist.
- `bench.php` was not run; Apache on 8081 was not started.
- Pest was not run: `composer test` would empty `cliniq_testing`, and no app code changed.

Known Issues: The screenshot capture config still names the old accounts (see above).

Next Steps: Zean decides whether to commit. Update `screenshots/_capture` before the next recapture.
