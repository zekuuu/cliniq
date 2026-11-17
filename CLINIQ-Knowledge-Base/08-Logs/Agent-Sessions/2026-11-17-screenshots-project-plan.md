Date/Day/Time: Tuesday, November 17, 2026 — 13:15 (PowerShell Get-Date, Asia/Manila; session started 12:41)
Agent: Claude Code (Claude Opus 5.5)
Task: Sharp, full-length screenshots of the 34 major screens for the Project Plan
Status: Completed

Prompt/Request: Zean's prompt "Take sharp, full-length screenshots of the system's major screens, on a laptop screen size, for the Project Plan": `feat/connect-frontend` in API mode on the loaded fictional school (900+ students, five years of history); viewport 1536 × 960 CSS px at device scale factor 2 (PNG, 3072 px wide); Staff (School Clinician) and Admin (Principal); the 34 screens of its table; output in an untracked `screenshots/` folder with `INDEX.md` and a rerunnable capture script in `screenshots/_capture/`; no application code change, no commit; this session log the only tracked file. During the session Zean also asked: "for login page, redo it but remove or hide it temporary the demo account button, then bring back once done".

Branch and commit: `feat/connect-frontend` at `24d2c8e`, clean at the start.
Database: `cliniq_testing` (never `cliniq`). Viewport: 1536 × 960 CSS px, DPR 2, Chromium via Playwright installed only in `screenshots/_capture/`.

Answers from Zean (pop-ups):
- `cliniq_testing` held a one-year build: "Rebuild 5 years".
- The five-year build failed in the load generator: "Patch generator, 5 years".
- Role variants beyond the table (Staff Archive; Admin Incident log, Audit log, Settings): "Keep the 34".
- Screen 26 showed "No backup location is enabled": "Add a test location, retake".
- Screen 25 showed no saved sports reports: "Create one test report, retake".

Files Modified:
- `backend/tools/load/Generator.php` (uncommitted, left for Zean): new `givable()`; a visit or Stage 2 medicine line is dropped when the item has no unexpired batch that day. The random draws are unchanged, so the seed still gives the same school otherwise.
- New, untracked: `screenshots/` (34 PNGs, `INDEX.md`, `_capture/` with `capture.mjs`, `config.json`, `probe.mjs`, Playwright in its own `package.json`).
- New, tracked: this log.

Changes Made:
- Rebuilt `cliniq_testing`: `php tools/load/build.php --students=900 --staff=60 --years=5` (392.8 s): 903 active and 301 archived students, 65 staff, 23,750 visits, 682 incidents, 5 school years, 60,506 audit entries; every check in `checks.php` passed. The first attempt stopped at "Clove oil has no usable batch and can't be given. Dispose of expired stock before restocking." (the generator dispensed an item whose every batch had expired; the app's refusal was correct).
- Ran the app on the loaded data on separate ports, because Zean's own dev servers held 5173, 5174 and 8000 (not touched): Vite on 5180 (`VITE_API_MODE=api`, `VITE_API_URL=http://localhost:8001/api`), the API on 127.0.0.1:8001 through PHP's built-in server with the WinGet PHP 8.5 (`DB_DATABASE=cliniq_testing`, `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS` set to 5180, all as process environment). XAMPP's PHP crashed on every web request in the built-in server (`intlcal_set_minimal_days_in_first_week` TypeError, then "Class config does not exist"), so it was not used for serving.
- Captured the 34 screens: 10 single (3072 × 1920) and 24 scrolling (the viewport grown to the page height). Records picked from the app's own API lists: student 389, staff 33, visit 22458, Stage-1 incident 673, completed incident 677. Student 448 was considered first and dropped: its history holds a "Menstrual cramps" visit on a male student (a generator quirk).
- Injected by the capture script only: hide the dev data-mode badge; no animations, transitions or caret; on 01, hide the dev-only Demo Accounts button (Zean's request). The app source was not edited, so nothing needs restoring.
- Added through the app's forms, on `cliniq_testing` only: backup location "External drive" (`D:\`, a row only) and the sports report "Grade 10 basketball try-outs" (Grade 10, 69 students).

Reason: The Project Plan needs real, sharp, full-length screenshots of the running system at the size of Zean's laptop.

Testing Performed: Opened and inspected every PNG; checked every width is 3072 px and every height even (list in `INDEX.md`); retook 01 (Demo Accounts), 13 (flaky symptom click), 25, 26 and 27 (see below). No test suite run (Pest would empty `cliniq_testing`).

Known Issues:
- **Audit log at five years:** `GET /api/audit-log?from=1900-01-01&to=…` exhausted PHP's 128 MB (`AuditLogController.php` lines 178 and 192) with about 60,500 entries, and the page showed "Unable to load the audit log" (the fatal error also drops the CORS headers). With `memory_limit=512M` (the value in XAMPP's `php.ini` here) it loads. The endpoint appears to hold the whole range in memory; worth a backend issue before years of real data build up on the clinic PC (NFR-01: 4 GB RAM).
- The generator fix in `Generator.php` is uncommitted.
- Inventory rows with usable stock show a "Below zero" status (Disposable face masks 14, Mefenamic acid 250mg 15). The status may be correct, but its wording reads oddly next to a positive count. Not investigated.

Next Steps: Zean picks the screenshots for the Project Plan and decides what, if anything, goes into Git; commit or discard the generator fix; consider a backend issue for the audit-log memory use.
