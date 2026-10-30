# Decisions build, Part 6: staff wording, extra complaints and backup locations

Date/Day/Time: Friday, October 30, 2026 — 03:36 PHT
Agent: Claude Code (Opus 5.5)
Task: Build Part 6 of the decisions-sheet answers (ADR-052, ADR-053): six `FIX` entries.
Status: Completed
Prompt/Request: The same "Build the fixes that came out of the decisions sheet" prompt, "Parts 1 to 6", on the branch `build/decisions-sheet-answers-oct29`. Part 6: the PE wording marked "to confirm", extra complaint tags, the staff type "Other", "Returned to work" for staff, the Admin's totals without staff incidents, choosing and editing backup locations. Defaults D27 to D32 apply.

What each item did before (checked first):
- PE referral: the three phrases in `peReferralApi.ts` `CLINICAL_DEFAULTS` prefilled the fields with no note.
- A visit had one complaint only.
- Staff types were Teacher, Non-teaching staff, Utility worker.
- A staff visit showed "Returned to class".
- The Admin's Dashboard incident counts included staff incidents, which the Admin's Incident Log leaves out (ADR-043 item 9).
- The Backup screen assumed one "designated external drive" and "Back up now" only recorded a run.

Files Modified:
- Data layer: `frontend/src/lib/mock-db/api.ts` (`extraComplaints` with `EXTRA_COMPLAINTS_MAX` 3 and `ExtraComplaintsError`; `getDashboardSummary(query, viewer)`; `listBackupLocations`, `saveBackupLocation`, `setBackupLocationEnabled`, `NoBackupLocationError`; `recordBackupNow` runs to each enabled location; the stale alert reads the locations), `types.ts` (`BackupLocation`, `backupKeepLast`), `seed.ts`, `store.ts` (migration adds "Other" and the locations), `integrity.ts`, `selectors.ts` (audit target "Backup location"), `index.ts`, `mock-db.json` (staff type "Other", `backupKeepLast` 60, two synthetic locations), `frontend/src/types/entities.ts` (`Visit.extraComplaints`, PROVISIONAL), `frontend/src/lib/dispositions.ts` (`dispositionLabel`, `dispositionOptionsFor`), `frontend/src/lib/itemsGiven.ts` (`complaintWithExtras`)
- UI: new `features/clinic-visits/ExtraComplaintsField.tsx`; `NewVisitEntryPage.tsx`, `VisitDetailPage.tsx`, `VisitLogListPage.tsx`, `PeSportsReferralPage.tsx`, `api/newVisitApi.ts`, `api/visitDetailApi.ts`, `api/peReferralApi.ts`; `features/student-records/StudentProfilePage.tsx`; `features/staff-records/StaffProfilePage.tsx`; `features/dashboard/DashboardPage.tsx`, `api/dashboardApi.ts`; new `features/backup/BackupLocationsPanel.tsx`, `BackupStatusPage.tsx`, `api/backupApi.ts`; `features/audit-log/AuditLogPage.tsx`; `features/reports/components/ReportsPrint.tsx`
- Tests: new `features/StaffComplaintsBackupDecisions.test.tsx` (9 tests); `AccessAndBackup.test.tsx` (the stale alert reads the locations), `auditCoverage.test.ts` (backup summary names the location count), `personnel.test.ts` (four staff types), `ItemsGiven.test.tsx` (the complaint label query anchored), `lib/mock-db/dashboard.test.ts`
- Docs: `Module-Overview.md`, `Screen-Inventory.md`, `Audit-Coverage.md`, `frontend/src/lib/mock-db/README.md`, ADR-052 and ADR-053 status lines, Changelog, Issues-and-TODOs, Issues-Done-Archive

Changes Made:
- **PE wording (D27).** "Starting wording, to be confirmed: the three fields below start with suggested phrases you can edit." above the fields, hidden in print; the phrases stay editable.
- **Extra complaints (D28).** "Other complaints (optional)" on New Visit and the Visit Details edit form: pick from the complaint suggestions or type and Add, removable tags, up to 3. A fourth is refused on screen ("Up to 3 extra complaints. Remove one to add another.") and in the data layer ("Add at most 3 extra complaints."). Tags are cleaned like the main complaint, never repeat it, and are stored only when there are some; an edit that leaves them alone is not audited as a change. Reports and the Dashboard count the main complaint only. Shown on Visit Details ("Other complaints") and in the Student and Staff Profile histories ("Fever (also Headache, Chills)"). There is no visit printout (open `FIX` "Visit Details has no A4 printout").
- **Staff type Other (D29).** In `config.personnelTypes` after Utility worker; a saved browser copy gains it on load.
- **Returned to work (D30).** `dispositionLabel(disposition, kind)` on New Visit (the disposition options for a staff patient), Visit Details, the Visit Log rows and the Staff Profile. The stored value is unchanged. The Monthly Report's disposition table, which mixes students and staff, reads "Returned to class or work". The Visit Log filter already read "Returned".
- **Admin totals (D31).** The Dashboard passes the viewer; for the Admin, incidents are those the Admin's Incident Log shows (students only). The clinician's counts are unchanged.
- **Backup locations (D32).** A "Backup locations" panel on the Backup screen: label, path, status (Found, Not found, Not writable), last backup time and result, Edit and Disable or Enable (Staff; the Admin sees it read-only), Add location, and a warning when none is enabled ("Back up now" is then refused). Add, edit and enable or disable are audited on `backup-location`; there is no delete. "Back up now" runs to every enabled location and the panel shows each result. A preview shows the folders the backend creates on each location and that the latest 60 backups are kept. The stale-backup warning reads the newest successful backup across enabled locations. The screen's text no longer says "the external drive". `backupLocations` is PROVISIONAL; a browser can't reach a drive, so a new location reads "Found" until the backend checks it.

Reason: ADR-052, ADR-053 items 1 to 4 and 6, and the six `FIX` entries of "Decisions answered after the list was resent".

Testing Performed:
- Typecheck pass, build pass, lint unchanged from the baseline (1 error, 2 warnings, pre-existing).
- Tests: 13 failed and 800 passed of 813: the 12 baseline failures plus one incident-report print test failing with "No print document mounted", which passes when its folder runs alone (three of three); logged as a `VERIFY`.
- Screens (Playwright Chromium headless shell, screenshots outside the repository): PE/Sports Referral, New Visit with two extra tags, a staff Visit Details ("Returned to work"), Visit Log, Add Staff, Dashboard (both roles), Backup (both roles) and the Edit location dialog, at 1440, 768 and 390 px. No horizontal scroll. axe-core first flagged the folder preview (`scrollable-region-focusable`); it now takes keyboard focus with a label and a visible focus outline, and axe reports no violations. At 390 px the Add button first sat out of line with the field; the hint moved below the row.

Known Issues: the `VERIFY` "No print document mounted once per full test run". The Part 1 to 4 documentation, committed to `main` at 01:28 PHT (`3bcaea1`), was re-applied on this branch at 03:40 PHT after being mistaken for a reset; the two overlap (see the Part 1 log). No code was affected.

Next Steps: Zean reviews and commits the branch; the open items are listed in the hand-back.
