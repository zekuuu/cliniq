Date/Day/Time: Thursday, October 22, 2026 — 19:21 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 7 — Kinder phone, allergy banner, terminology, seed data, count test, 600-student check, audit coverage
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 7 (ST-3, ST-9, 5.1, 5.3, 5.6, AU-1, default D8), run last, at Zean's "Continue next part and to the last part no stopping". The prompt asks to show the terminology table before changing anything. Because Zean said not to stop, the table below was applied on safe defaults: the clinician's title was not touched, and every choice can be reversed.

Files Modified:
- frontend/src/lib/students.ts (new), lib/mock-db/selectors.ts, features/student-records/StudentFormPage.tsx (Kinder phone)
- frontend/src/features/student-records/StudentProfilePage.tsx (allergy banner, terminology)
- terminology: frontend/src/features/clinic-visits/ExcuseLetterPage.tsx, clinic-visits/LogbookFields.tsx, clinic-visits/VisitDetailPage.tsx, dashboard/components/DashboardHeader.tsx, dashboard/components/ComplaintTrends.tsx, emergency-response/IncidentEntryPage.tsx, components/forms/ItemsGivenField.tsx
- frontend/src/lib/mock-db/relativeDates.ts, seed.ts, mock-db.json (seed coherence)
- frontend/src/lib/mock-db/selectors.ts (Audit Log lookups built once; report label "Complaint summary"), lib/mock-db/store.ts (dev-only `cliniqMockDb.load`)
- frontend/scripts/generate-load-data.mjs (new, dev only)
- Tests:
  - new: frontend/src/lib/mock-db/countsAndSeed.test.ts, lib/mock-db/auditCoverage.test.ts, features/student-records/KinderAndBanner.test.tsx
  - names only: clinic-visits/ItemsGiven.test.tsx, LogbookFields.test.tsx, ExcuseLetterPage.test.tsx, student-records/StudentProfilePage.test.tsx, emergency-response/ParentNotificationPage.test.tsx, IncidentSafety.test.tsx, print-documents.test.tsx
- frontend/src/lib/mock-db/README.md
- CLINIQ-Knowledge-Base: 04-Development/Audit-Coverage.md (new), 01-Requirements/Features/Module-Overview.md, 02-Architecture/Database/Data-Dictionary.md, canonical CLINIQ_Modules_and_Features.md, 08-Logs

Changes Made:
- **Kinder phone (ST-3, D8).**
  - `contactInfoRequired(gradeLevel)` is false only for Kinder. The Student form makes the field optional there, with the hint "Optional for Kinder. The emergency contacts below are still required."
  - `missingRequiredFields` no longer marks a Kinder record incomplete for lacking it.
  - Emergency contacts stay required.
- **Allergy banner (ST-9).** At the top of the Student Profile, a compact warning band lists recorded allergies and medical conditions. Nothing shows when both lists are empty.
- **Terminology (5.1): what was found and what was chosen.**

  | Concept | Variants found | Chosen | Changed |
  |---|---|---|---|
  | Done states | Incident "Complete" / "Needs completion"; follow-up "Completed"; record review "Resolved"; letter and report "Approved" | Already one vocabulary per object; kept | none |
  | Counting word | "Cases" column headers, "cases" in calendar cells and tooltips, "Visits and incidents" in captions | Say what is counted: the Trends weekday headers now read "Visits and incidents" (columns widened); calendar cells keep "cases", defined by their legend "Cases per day (visits + incidents)" | ComplaintTrends |
  | Print buttons | "Print", "Print overview", "Print / Save as PDF" | "Print / Save as PDF" everywhere | Excuse Letter, Student Profile, Dashboard |
  | Archive | Student "Archive"; Incident Report Archive | Student archive only; the register was renamed "Incident register" (Part 4) | Part 4 |
  | Allergies | "Allergies", "Allergies and restrictions", "Recorded allergies" | "Allergies"; empty reads "None recorded." | Profile heading and printout, the medicine-picker note |
  | Referral | "Referred to hospital", "Referred to hospital or clinic", "Hospital referral", "Referred to (hospital or clinic)" | Outcome "Referred to hospital"; section "Hospital referral"; destination field "(hospital or clinic)" | Incident Stage 2 checkbox and Destination label |
  | Parent contact | "Parent/Guardian", "Parent notification", "Emergency contacts" | "Parent or guardian" (the person on a visit); "Emergency contacts" (stored people); "parent notification" (the call log) | Visit logbook field and Visit Details |
  | Clinician's title | "School Clinician", "School Nurse", "Clinic Staff" | **Not changed:** waits for the clinician | none |

- **Seed data (5.3).**
  - **Weekends:** past clinic activity resolves to school days (`toSchoolDay`): a Saturday or Sunday moves back to the Friday before, so no case lands on a weekend whatever day the app is opened. This covers visits, incidents and their calls, letters, transactions, audit rows, reviews, PE referrals, follow-ups and logins. Today is never moved; backups and calendar events keep their days.
  - **The weekday chart** now shows 0 for Saturday and Sunday (seen in the browser).
  - **Same-minute visits:** 9 visits that shared a minute with another got distinct times.
  - **Medicine in notes:** about 60 old visits said a medicine was "given" with no medicine line. Their notes now describe care that isn't stock. Lines were not added, because added lines would have no matching stock transactions.
  - **Grade 12 identifiers:** the two Grade 12 LRNs that implied enrolment in 2026 now use 2014 (the README's `000000 + enrolment year + sequence`).
  - **Nickname:** the guardian "Bea Cabrera" is now "Beatriz Cabrera".
  - Volume (48 students, 159 visits) and ids unchanged. Tests that named "Bea Cabrera" were updated.
- **One definition per number (DB-3, FU-5).** `countsAndSeed.test.ts` builds the data once and checks:
  - this month's incidents and visits agree on the Dashboard, the calendar, the Monthly Report and the Incident register;
  - incidents still at Stage 1 agree between the Dashboard and the incident list;
  - overdue follow-ups agree between the Dashboard and the Follow-ups list.

  All agreed, so no definition had to change. The definitions are written once, at the top of that test.
- **600 students, five years (5.6).**
  - `frontend/scripts/generate-load-data.mjs` (dev only, never imported by the app) grows the data deterministically to 600 students, 11,680 visits, 284 incidents, 3,489 stock movements and 11,810 audit rows.
  - It is about 7 MB, over the localStorage quota, which is a finding for the mock layer only. It is loaded in memory through a new dev-only `cliniqMockDb.load`.
  - Measured with Playwright and Chromium, mock latency 0, moving between screens in the app:

    | Screen | Time | Rendered |
    |---|---|---|
    | Student List | 553 ms | 80 rows |
    | Student search "Santos" | 129 ms | 25 rows |
    | Visit Log (All) | 436 ms | 10 rows per page |
    | Dashboard Overview | 257 ms | |
    | Trends, Today | 143 ms | |
    | Trends, All five years | 260 ms | |
    | Calendar | 699 ms | |
    | Monthly Report | 159 ms | |
    | Incident register | 55 ms | |
    | Printing the Monthly Report | 78 ms to mount | 34 rows |
    | Audit Log | **2,633 ms** | |

  - **Fixed (clearly wrong and small):** for each of the ~12,000 audit rows, the Audit Log rebuilt the student map and scanned the visit list. It now builds the lookups once, and the screen takes **420 ms**.
  - Nothing else went over 1 second or a few hundred rendered rows.
- **Audit coverage (AU-1).**
  - `04-Development/Audit-Coverage.md` lists every audited event: what the user does, the action, the target, the summary, and the tests.
  - `auditCoverage.test.ts` (13 tests) exercises every event in the list.
  - The page also lists actions that are **not** logged (opening a health record, searches, failed sign-ins and lockouts, aggregate views, reading the Audit Log, dev tools) and whether they should be. That decision is open (new `DECIDE`); nothing was changed.

Reason:
- The panel review findings listed above.

Testing Performed:
- **Final run, with no other load:**
  - typecheck pass;
  - lint unchanged from the baseline (1 error, 2 warnings, all pre-existing);
  - tests: **17 failed, 634 passed (651)**. The failing set is exactly the 17 that failed before Part 1 (`diff` of the two lists is empty). Passing tests rose from 561 to 634;
  - build pass.
- **New Part 7 tests (23):** Kinder and banner 4, counts and seed 6, audit coverage 13.
- **Browser:** Playwright + Chromium (not Edge), Staff, at 1440, 768 and 390 px:
  - the Student Profile with the banner;
  - Add Student with Kinder (the optional hint);
  - Dashboard Trends;
  - the weekday table (two widths), checked after widening its count columns.
- All looked at. No horizontal scroll. axe found 0 violations on all three screens.

Known Issues:
- The calendar's cells still say "N cases", defined by the legend. A wider change waits for the team's word.
- The expanded data is too large for localStorage. That matters only for the mock layer.

Next Steps:
- Review and commit Parts 1–7 (each part's files are listed in its session log).
- Ask the clinician for her title and the Visit-versus-Incident rule.
