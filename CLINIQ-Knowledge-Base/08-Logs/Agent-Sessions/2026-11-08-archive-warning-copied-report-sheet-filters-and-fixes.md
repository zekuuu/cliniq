Date/Day/Time: Sunday, November 8, 2026 — 22:36 PHT
Agent: Claude Code (Opus 5.5)
Task: Eight small requests in one session
Status: Completed
Prompt/Request (Zean, in chat):
1. "archive warning icon in sidebar if the date is due or, also add warning if due is today"
2. "Codes copied. = Change button for duration "Copied""
3. "admin report file viewer should be exactly like the printable paper, also remove the "list" in Back button"
4. "add more filters in archives, like student and staff"
5. "remove the required reason when changing to Missed in follow-up"
6. "Make the "Commonly used for" required, then add other to add more symptons that aren't in the checklist"
7. "Grade 5 has no active students. Place the error message right below the Or add a whole grade level drop down, and make it red color as error"
8. "remove Account setup text in force password change page"
Files Modified:
- frontend/src/lib/mock-db/api.ts: `getSchoolYearReminder` and `schoolYearReminderOf` (shared with the Dashboard); the reminder has `dueToday`, and `overdue` now means past the due day. Missed needs no reason. "Commonly used for" accepts typed words after the options and requires at least one (`USED_FOR_REQUIRED`, `distinctWords`).
- frontend/src/types/dashboard.ts: `SchoolYearReminder`.
- frontend/src/layouts/Sidebar.tsx: the Backup warning badge is generalized (`warningFor`). The Archive item gets "School year … ends/starts today" or "… is overdue to end/start" for Staff, reloaded on `SCHOOL_YEAR_CHANGED_EVENT`.
- frontend/src/lib/accountEvents.ts: `SCHOOL_YEAR_CHANGED_EVENT`. ArchivePage fires it after End/Start and after a dates save.
- frontend/src/features/dashboard/components/SchoolYearBanner.tsx: due today is a warning: "School year … ends today."
- frontend/src/features/account/AuthenticatorDialog.tsx: Copy reads "Copied" (check icon) for 2 s; a screen-reader-only status says "Codes copied."
- frontend/src/components/print/Print.tsx: the on-screen sheet is A4 at real size with the print margins; it scrolls sideways instead of shrinking.
- frontend/src/features/reports/AdminReportsPage.tsx: Back reads "Back".
- frontend/src/features/archive/ArchivePage.tsx: a Grade level filter (Students) or Type filter (Staff), like the Student and Staff Lists. Options come from the archived rows, in natural order.
- frontend/src/features/emergency-response/FollowUpListPage.tsx: the reason is optional for Missed and still required for Cancelled.
- frontend/src/features/inventory/InventoryFormPage.tsx, api/inventoryApi.ts: "Commonly used for" is required (asterisk, error under it, focus) and has Other with a comma-separated text field (`usedForOther`).
- frontend/src/lib/mock-db/integrity.ts: usedFor allows typed words after the options.
- frontend/src/features/reports/SportsReportFormPage.tsx: the grade messages ("no active students", "already on this report", "Choose a grade level first.") are a red `role="alert"` error under the grade row. Add Grade stays level with the drop-down.
- frontend/src/features/auth/ForcePasswordChangePage.tsx: the "Account setup" eyebrow is removed; the divider moved onto the heading.
- Tests: ArchivePage, AppShell, AdminReportsPage, ExcuseLettersAndFollowUps, FollowUpListPage, SuggestedMedicines, back-navigation, InventoryPanelReview, SportsReport.
- Docs: ADR-071 and ADR-077 amended; Module-Overview (FU-4 line); "Back to list" changed to "Back" in Screen-Inventory, Decisions-Summary and Keyboard-Shortcuts-and-Efficiency.
Reason: Zean's requests, as quoted.
Testing Performed: `tsc --noEmit` clean; full suite 1179 of 1179; `npm run lint` 0 errors (1 old warning in ErrorSummary.tsx). New tests cover: the due-today reminder and banner; the sidebar Archive badge (absent the day before, present on the day); Missed without a reason and Cancelled refused without one; "Commonly used for" required and Other saved as typed words; the seed accepting Other words; the grade error under the drop-down.
Known Issues: The Admin's report sheet is one tall A4 sheet without page breaks or page numbers. The Archive's new filter has no UI test (one filter line). The sidebar warning is for Staff only, matching the Dashboard reminder; the Admin gets none.
Next Steps: Panel review FU-4 in the canonical Modules & Features document still says Missed needs a reason, and ADR-071's "optional" tags are now required there too. Both need the team's canonical update.
