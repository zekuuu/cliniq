# Archive: dates behind one button, records in one card, name sort

Date/Day/Time: Sunday, November 08, 2026 — 17:31 PHT
Agent: Claude Code (Opus 5.5)
Task: Simplify the Archive page layout and the archived records' default sort.
Status: Completed
Prompt/Request: "then move this section to a single button" (screenshot of the School year dates card); "also default sort full name as descending", then "I mean ascending sort"; "then redesign these and table within one card" (screenshot of the School year picker card, the tabs and the Students table). Also asked, then withdrawn ("nvm it's good"): "in report, open report doesnt do the actual and expected". Checked before it was withdrawn: through `AppRoutes`, the Archive's "Open report" for June 2026 opens the Monthly Report for June 2026, so nothing was changed.
Files Modified:
- `frontend/src/features/archive/ArchivePage.tsx`, `frontend/src/features/archive/ArchivePage.test.tsx`
- `frontend/src/features/audit-log/AuditLogPage.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
Changes Made:
- `SchoolYearSettingsCard` became `SchoolYearDatesDialog`, opened by a "School year dates" button (secondary, calendar icon) beside End/Start in the Current school year card. It shows for both roles; for the Admin the fields are read-only and the only button is Close. It mounts only while open, so each opening starts from the saved dates. Saving closes it, and the success message shows in the card.
- One card ("Records of <year>", with the date range as the description and the School year picker as the header action) holds the tabs and the open section. The list buttons still scroll to it.
- `AuditLogPage` `embedded` renders without its own card or heading: a line with the count and range, Clear Filters, the filters and the table.
- `RecordsTable` sorts by Full name, ascending, by default (it was Archived, newest first).
- Prettier ran on both page files, so their diffs include formatting-only lines.
Reason: A shorter page with fewer cards, and records that read in name order.
Testing Performed: full `npx vitest run`, 1143 of 1143 passed; `tsc -b`; ESLint on archive and audit-log. Tests updated: the dates dialog, the default A-to-Z sort, and no "Audit entries" heading in the Archive. Not checked in a browser.
Known Issues: None.
Next Steps: None.
