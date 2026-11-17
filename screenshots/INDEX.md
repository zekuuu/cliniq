# CLINIQ screenshots for the Project Plan

- **Branch and commit:** `feat/connect-frontend` at `24d2c8e` (plus one uncommitted fix to the load generator, see "Notes").
- **Data:** API mode (`VITE_API_MODE=api`), the real Laravel API on MariaDB, database **`cliniq_testing`**, the fictional load-test school built with `php tools/load/build.php --students=900 --staff=60 --years=5` (903 active students, 301 archived, 65 staff, 23,750 visits, 682 incidents, five school years 2022–2023 to 2026–2027, 40 holidays). All checks in `tools/load/checks.php` pass. Every person on screen is generated; LRNs are in the reserved test range `9999…`.
- **Accounts:** `load.nurse` (Staff, School Clinician) and `load.principal` (Admin, Principal).
- **Captured:** Tuesday, November 17, 2026, 12:58 to 13:15 (Asia/Manila).
- **Viewport:** 1536 × 960 CSS px, device scale factor 2, Chromium (Playwright), light colour scheme, reduced motion, locale `en-PH`, time zone `Asia/Manila`. Page only, no browser chrome. Every image is PNG, 3072 px wide.
- **Single** = one screen, 3072 × 1920 px. **Scrolling** = the whole page in one image: the viewport is grown to the page's height (width unchanged), so the image is that height × 2.

## Styles injected by the capture script (the app itself is unchanged)

1. `details[class*="z-[100]"] { display: none }`: hides the development-only data-mode badge (`DevDataMode.tsx`, bottom right).
2. `* { animation: none; transition: none; caret-color: transparent }`: stops animations and hides the text caret.
3. Screen 01 only: the development-only **Demo Accounts** button (`DemoAccounts.tsx`) is hidden with an inline `display: none` (Zean's request).

## Records used (internal ids, picked from the app's own lists)

| Use | Id | Why |
|---|---|---|
| Student (07, 13, 14, 15) | student `389` | Allergy (Dust), one emergency contact, 8 recent visits, 24 excuse letters, 5 incidents |
| Staff member (11) | personnel `33` | 8 recent visits, an incident, 5 follow-ups |
| Visit (14, 15) | visit `22458` | The same student; Antacid chewable tablet × 2, sent home, approved excuse letter |
| Stage-1 incident (20) | incident `673` | Fall injury, Stage 1 only, vitals recorded |
| Completed incident (21) | incident `677` | Fall injury, complete and approved, parent reached |
| New visit (13) | patient picked by LRN of student `389`, symptom **Headache** | Headache has a three-step first-aid checklist |

## Screens

| File | Role | Screen | Route | State shown | Type | Pixels |
|---|---|---|---|---|---|---|
| 01_both_login.png | both | Login | `/login` | Logged out, empty fields, Demo Accounts button hidden | single | 3072 × 1920 |
| 02_staff_dashboard-overview.png | staff | Dashboard, Overview | `/` | Overview, default range (Today) | scrolling | 3072 × 2166 |
| 03_staff_dashboard-trends.png | staff | Dashboard, Trends | `/?view=trends` | Trends, Today | scrolling | 3072 × 1998 |
| 04_staff_activity-calendar.png | staff | Activity calendar | `/calendar` | Monthly, Calendar view, November 2026 (visits, All Saints', All Souls', Bonifacio Day, school events) | scrolling | 3072 × 2038 |
| 05_staff_student-list.png | staff | Student list | `/students` | Default list, first page | scrolling | 3072 × 2060 |
| 06_staff_add-student.png | staff | Add student | `/students/new` | Empty form | scrolling | 3072 × 2712 |
| 07_staff_student-profile.png | staff | Student profile | `/students/389` | Allergy, emergency contact, visit history, excuse letters, incidents | scrolling | 3072 × 7328 |
| 08_staff_incomplete-student-records.png | staff | Incomplete student records | `/students/incomplete` | Review queue, Open (61) | scrolling | 3072 × 7848 |
| 09_staff_yearly-list-import.png | staff | Yearly list import | `/students/import` | Step 1, no file chosen | single | 3072 × 1920 |
| 10_staff_staff-list.png | staff | Staff list | `/staff` | Default list | scrolling | 3072 × 2060 |
| 11_staff_staff-profile.png | staff | Staff profile | `/staff/33` | Visits, incident, follow-ups | scrolling | 3072 × 4266 |
| 12_staff_visit-log.png | staff | Visit log | `/visits` | Default list (Today) | scrolling | 3072 × 2212 |
| 13_staff_new-visit.png | staff | New visit | `/visits/new` | Patient chosen, symptom Headache, first-aid checklist shown, not saved | scrolling | 3072 × 4788 |
| 14_staff_visit-detail.png | staff | Visit detail | `/visits/22458` | Treatment line and approved excuse letter | scrolling | 3072 × 2210 |
| 15_staff_excuse-letter.png | staff | Excuse letter | `/visits/22458/excuse-letter` | Approved letter with its printable view | scrolling | 3072 × 4122 |
| 16_staff_pe-sports-referral.png | staff | PE/Sports referral | `/visits/pe-referral` | Empty form | scrolling | 3072 × 3040 |
| 17_staff_follow-ups.png | staff | Follow-ups | `/follow-ups` | Default list | single | 3072 × 1920 |
| 18_staff_incident-log.png | staff | Incident log | `/incidents` | Default list (Today: one incident) | single | 3072 × 1920 |
| 19_staff_new-incident-stage-1.png | staff | New incident, Stage 1 | `/incidents/new` | Empty fast-capture form | scrolling | 3072 × 2158 |
| 20_staff_complete-incident-stage-2.png | staff | Complete incident, Stage 2 | `/incidents/673/complete` | Stage-1 record opened to complete, not saved | scrolling | 3072 × 4054 |
| 21_staff_incident-report.png | staff | Incident report | `/incidents/677/report` | Completed, approved report | scrolling | 3072 × 2480 |
| 22_staff_inventory-list.png | staff | Inventory list | `/inventory` | Default list; expired and "below zero" flags visible | scrolling | 3072 × 2156 |
| 23_staff_dispense-log-usage.png | staff | Dispense / log usage | `/inventory/dispense` | Empty form | single | 3072 × 1920 |
| 24_staff_monthly-report.png | staff | Monthly report | `/reports` | Monthly Report tab, November 2026 | scrolling | 3072 × 2698 |
| 25_staff_sports-reports.png | staff | Sports reports | `/reports/sports` | Saved-reports list with one report (created for this set, see Notes) | single | 3072 × 1920 |
| 26_staff_backup-status.png | staff | Backup status | `/backup` | Latest backup, recent runs, one backup location (added for this set, see Notes) | scrolling | 3072 × 2860 |
| 27_staff_audit-log.png | staff | Audit log | `/audit-log` | Default list (All), first page | scrolling | 3072 × 2048 |
| 28_staff_settings.png | staff | Settings | `/settings` | "Sign out after inactivity" card | single | 3072 × 1920 |
| 29_admin_dashboard.png | admin | Dashboard | `/` | Admin's Clinic Overview, Today | single | 3072 × 1920 |
| 30_admin_student-list-read-only.png | admin | Student list (read only) | `/students` | Admin's read-only list | scrolling | 3072 × 1956 |
| 31_admin_reports.png | admin | Reports | `/reports` | Report month drop-down, November 2026 | single | 3072 × 1920 |
| 32_admin_user-accounts.png | admin | User accounts | `/users` | All 26 accounts | scrolling | 3072 × 5218 |
| 33_admin_add-user.png | admin | Add user | `/users/new` | Empty form with role selection | single | 3072 × 1920 |
| 34_admin_archive.png | admin | Archive | `/archive` | Current school year, Students tab | scrolling | 3072 × 2600 |

Skipped: none. Role variants not in the agreed table (Staff Archive; Admin Incident log, Audit log, Settings) were left out at Zean's choice.

## Notes

- **Two records were added for this set** (Zean's choice, `cliniq_testing` only, through the app's own forms): backup location "External drive" at `D:\` (stores a row only, no file written), and the sports report "Grade 10 basketball try-outs" (Grade 10, requested by "PE instructor"). Without them, 26 showed the red "No backup location is enabled" banner and 25 the empty state.
- **The load generator was patched** (`backend/tools/load/Generator.php`, uncommitted): the five-year build stopped with "Clove oil has no usable batch and can't be given" when an item's every batch had expired between two Monday restocks. The generator now skips such an item that day.
- **Audit log memory:** with five years of history (about 60,500 entries) the audit-log request exceeds PHP's 128 MB default and the page shows "Unable to load the audit log". The capture API ran with `memory_limit=512M`, the value in XAMPP's `php.ini` on Zean's machine. Worth a backend look before the clinic PC has years of data.
- The Student list shows 80 results by design (`studentListApi.ts` asks for 80; search narrows it).
- Today's visits in the generated data run to the end of the school day, so some rows are later than the clock in the header.
- Long inner lists keep their designed height; only the page itself is expanded.

## Retake

```
cd screenshots/_capture
npm install                      (once; Playwright and Chromium only here)
set CLINIQ_CAPTURE_PASSWORD=...  (the test accounts' password, never stored in a file)
node capture.mjs                 all screens
node capture.mjs 07 13           only those numbers
```

`config.json` holds the base URLs, the usernames, the record ids above and the pause between screens (the API allows 120 requests a minute per user). The dev servers used: Vite on `localhost:5180` (`VITE_API_MODE=api`, `VITE_API_URL=http://localhost:8001/api`) and the API on `127.0.0.1:8001` (`DB_DATABASE=cliniq_testing`, `CORS_ALLOWED_ORIGINS=http://localhost:5180`, `SANCTUM_STATEFUL_DOMAINS=localhost:5180`, `memory_limit=512M`). `probe.mjs` prints the app's API lists for choosing records.
