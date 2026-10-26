Date/Day/Time: Monday, October 26, 2026 — 11:04 PHT
Agent: Claude Code (Opus 5.5)
Task: System review fixes: list pagination, Dashboard print and chip, inventory batches, Sports Report, Incomplete Records
Status: Completed
Prompt/Request: "Here are my system review that I want you to resolve — student list and staff list - pagination; Dashboard - print, show LRN; - delete in clinic button; inventory - batches, sort by first expiry; sports report - align the visits; - print - automatic fill up clinician and instructor name; student incomplete - vertical line. ask me if you have confusion do not guess". Clarified answers: Dashboard print gets the full LRN on the print only (the screen stays masked). "Delete in clinic button" means removing the "in clinic now" chip. For "align the visits", the user said "DO best options, or maybe separate columns… do not just agree to me". The clinician on the Sports Report print is the logged-in user, and the instructor is the "Requested by" name. For the vertical line, the user said to remove a stray line. The only vertical line on that page was the sticky Student column's divider.
Files Modified:
- frontend/src/features/student-records/StudentListPage.tsx
- frontend/src/features/staff-records/StaffListPage.tsx
- frontend/src/features/dashboard/components/DashboardPrint.tsx
- frontend/src/features/dashboard/components/AttentionChips.tsx
- frontend/src/features/inventory/StockModals.tsx
- frontend/src/features/reports/sportsReportContent.tsx
- frontend/src/features/reports/SportsReportPage.tsx
- frontend/src/features/reports/components/SportsReportPrint.tsx
- frontend/src/features/student-records/IncompleteRecordsQueuePage.tsx
- frontend/src/features/print-documents.test.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-044-Full-LRN-On-The-Dashboard-Printout.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md
- .claude/skills/cliniq-display-privacy/SKILL.md
- .claude/skills/cliniq-print-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- Student List and Staff List now use the shared `Pagination` with Rows per page 10 or 20 (`usePageSize`), as `cliniq-pagination-patterns` requires. Changing the search, the grade or type filter, or the archived checkbox returns to page 1.
- Dashboard printout (Clinic Overview Report): the due follow-ups, frequent visitors and excuse letters awaiting approval print the full LRN instead of the masked one. Staff still print by Staff No., and no names are printed. The screen is unchanged. Recorded as ADR-044, and the privacy and print skills were updated. Old rule: every multi-student printout is masked. New rule: the Dashboard printout prints the full LRN.
- Dashboard: the "in clinic now" count chip is removed. The Visit Log's own "In clinic now only" filter stays.
- Inventory Batches dialog: the batches are listed with the earliest expiry first and no-expiry batches last. This is the same order that dispensing takes stock in (`usableBatches`).
- Sports Report: in "Recent visits and incidents", each entry is laid out in three aligned columns: date, what happened, outcome. Every entry uses the same column template, so wrapped text stays in its column instead of running under the date. This was chosen over splitting into separate table columns, where entries with different line counts would drift apart across columns. On the screen preview the cells are now top-aligned, as the printout already was, so the student name sits level with the first entry.
- Sports Report printout: the signature lines carry the names. "Released by (clinician)" shows the logged-in user, and "Received by (instructor)" shows the report's Requested by name.
- Incomplete Records: `stickyFirstColumn` is removed, which takes away the Student column's vertical divider. Below 60rem the table still scrolls sideways, but the name no longer stays pinned.
- `print-documents.test.tsx`: the Dashboard tests now wait for the Summary counts region instead of a heading that no longer exists, and they assert full LRNs and no mask characters on the printout.
Reason: User's system review.
Testing Performed:
- `npx tsc -b --noEmit` passes.
- The affected test files (student-records, staff-records, dashboard, print-documents, inventory, reports, staff-patients, staff-counts) were run with `--testTimeout=30000`. 2 tests failed, and both also fail without these changes; see the Issues NOTE. The full suite fails 131 tests on `main` before these changes, mostly 5-second timeouts under load.
- No browser check was run.
Known Issues:
- The Dashboard print test still fails on a stale figure (`65`). It failed before these changes too.
- The Incomplete Records name no longer stays pinned on narrow screens.
Next Steps:
- Update the canonical Modules & Features for ADR-044 (DOC entry).
