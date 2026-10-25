# Audit coverage

**Written:** Thursday, October 22, 2026, panel review part 7 (AU-1). Session: [2026-10-22-panel-review-part-7-students-wording-data-tests](../08-Logs/Agent-Sessions/2026-10-22-panel-review-part-7-students-wording-data-tests.md).

Every action CLINIQ writes to the audit trail, what the entry records, and the test that proves it.
- Entries are written by the mock data layer (`frontend/src/lib/mock-db/api.ts`, the `audit()` calls). They are append-only, kept 10 years (ADR-037), and record names of fields, never their values (ADR-017).
- The test for every row is `frontend/src/lib/mock-db/auditCoverage.test.ts`; the "Also tested in" column lists screen tests that check the same entry.
- When a new audited action is added, add a row here and a case to that test.

## Audited events

| What the user does | Action | Target recorded | Summary | Also tested in |
|---|---|---|---|---|
| Signs in | `login` | user | — | `lib/mock-db/auth.test.ts` |
| Signs out | `logout` | — | — | `layouts/AppShell.test.tsx` |
| Gets locked out (5 wrong passwords in a row at sign-in; locked 30 minutes) | `login` | user | "Account locked for 30 minutes after 5 wrong passwords (sign-in)" | `features/backup/AccessAndBackup.test.tsx` |
| Changes their password (first sign-in) | `update` | user | "Changed password" | — |
| Admin creates an account | `create` | user | — | `features/user-management/accounts.test.ts` |
| Admin edits an account (name, username, role, picture) | `update` | user | changed field names | `features/user-management/profilePicture.test.ts` |
| Admin disables / enables an account | `update` | user | "Disabled account" / "Enabled account" | `features/backup/AccessAndBackup.test.tsx` |
| Admin resets a password | `update` | user | "Reset password" | `features/user-management/accounts.test.ts` |
| Adds / edits a student record | `create` / `update` | student | changed field names ("Updated grade level"); a name correction adds "Name corrected; reason: <reason>", never the old or new name. The LRN can't change after creation (Sunday, October 25, 2026) | `features/student-records/StudentFormPage.test.tsx` |
| Archives a student record | `archive` | student | — | `features/ui-review-regressions.test.tsx` |
| Saves a visit | `submit` | visit | "Late entry" when dated more than 30 minutes earlier | `features/clinic-visits/VisitLogic.test.tsx` |
| Edits a visit (including correcting its date and time) | `update` | visit | changed field names ("Updated date and time") | `features/clinic-visits/VisitDetailPage.test.tsx` |
| Marks a visit "Entered in error" | `update` | visit | "Marked entered in error" | `features/clinic-visits/VisitLogic.test.tsx` |
| …and its excuse letter is voided | `update` | excuse-letter | "Voided: visit entered in error" | `features/clinic-visits/VisitLogic.test.tsx` |
| …and its pending follow-ups are cancelled | `update` | follow-up | "Marked cancelled: visit entered in error" | `features/clinic-visits/VisitLogic.test.tsx` |
| Escalates a visit to an incident (ADR-036) | `update` | visit | "Escalated to incident" | `features/clinic-visits/VisitLogic.test.tsx` |
| Approves an excuse letter | `approve` | excuse-letter | — | `features/clinic-visits/ExcuseLetterPage.test.tsx` |
| Issues a replacement letter | `update` | excuse-letter | "Superseded; replacement draft opened" | `features/clinic-visits/ExcuseLettersAndFollowUps.test.tsx` |
| Creates a follow-up (from a visit or incident) | `create` | follow-up | — | `features/clinic-visits/NewVisitEntryPage.test.tsx` |
| Changes a follow-up's status | `update` | follow-up | "Marked <status>" (the reason stays on the record) | `features/emergency-response/FollowUpListPage.test.tsx` |
| Saves a PE/Sports referral | `submit` | pe-sports-referral | — | `features/clinic-visits/PeSportsReferralPage.test.tsx` |
| …referred to hospital | `create` | incident-escalation | — | `features/clinic-visits/PeSportsReferralPage.test.tsx` |
| Saves incident Stage 1 | `submit` | incident-stage-1 | "Included additional notes" when filled | `features/emergency-response/IncidentEntryPage.test.tsx` |
| Completes incident Stage 2 | `update` | incident-stage-2 | "Completed Stage 2 details", plus the optional field names | `features/emergency-response/IncidentSafety.test.tsx` |
| Logs a parent notification attempt | `create` | parent-notification | — | `features/emergency-response/IncidentEntryPage.test.tsx` |
| Approves an incident report | `approve` | incident-report | — | `features/ui-review-regressions.test.tsx` |
| Adds / edits an inventory item | `create` / `update` | inventory | changed field names | `lib/mock-db/stock.test.ts` |
| Dispenses stock (standalone, or a visit or incident line) | `submit` | inventory-dispensation | — | `lib/mock-db/stock.test.ts` |
| Restocks | `submit` | inventory-restock | — | — |
| Adjusts stock (or a visit edit moves stock) | `submit` | inventory-adjustment | the reason ("Visit edited", "Damaged or spilled", …) | `lib/mock-db/stock.test.ts` |
| Starts a backup ("Back up now") | `create` | backup | "Backup started from the Backup page" | `features/backup/AccessAndBackup.test.tsx` |
| Marks a backup verified | `update` | backup | "Verified backup" | — |
| Adds / edits / deletes a calendar event | `create` / `update` / `delete` | calendar-event | changed field names on edit | `lib/mock-db/calendarEvents.test.ts` |
| Creates / edits / duplicates / archives / restores a Sports Report | `create` / `update` / `create` / `archive` / `update` | sports-report | "Duplicated from another Sports Report", "Restored from the archive" | `features/reports/SportsReport.test.tsx` |
| Prints or saves as PDF | `print` | the printed record, or print-document | the document's title or scope. Never written for the Admin, who can't print, or for a draft excuse letter (ADR-038) | `components/print/Print.test.tsx` |
| Admin/Principal opens a student profile or an incident report | `view` ("Viewed (Admin)") | student / incident | "Opened student profile" / "Opened incident report". Once per record per sign-in session (ADR-038 item 4) | `features/admin-read-only.test.tsx` |
| Reports an issue | `create` | issue-report | — | `features/issue-reports/api/issueReportApi.test.ts` |

## Not logged today (an open decision; nothing was changed)

| Action | Logged? | Should it be? |
|---|---|---|
| Staff opening a student profile, a visit, an incident or a report (reading a health record). The Admin's opening of a profile or an incident report **is** logged since Sunday, October 25, 2026 (ADR-038, above) | No | **Still open** (lockouts were decided separately). RA 10173 accountability favours logging access to health records; ADR-016 decided that reading the Audit Log itself is not logged. Logging every profile view adds many rows. A `DECIDE` is logged. |
| Searching for a student (Student List, pickers) | No | Probably not: the opened record is the access worth logging. |
| A single wrong password at sign-in | No | No: decided with the lockout below (Zean, Friday, October 23, 2026). Five in a row are logged as a lockout. |
| Viewing the Dashboard, Calendar, Trends or lists | No | No: aggregate or masked (ADR-004, ADR-028). |
| Reading the Audit Log | No | Decided (ADR-016). |
| Dev-only resets and test data loads (`?mockReset=1`, `cliniqMockDb`) | No | No: development tools, not in a production build. |
