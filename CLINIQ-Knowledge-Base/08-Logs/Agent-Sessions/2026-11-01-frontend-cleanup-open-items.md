Date/Day/Time: Sunday, November 1, 2026 — 21:05 PHT
Agent: Claude Code (Opus 5.5)
Task: Finish the items left open by the frontend clean-up, Part 3
Status: Completed for the frontend items. Backend-branch items remain, listed under Known Issues.
Prompt/Request: "finish Not done or still open", then "/komit the current uncommitted related to backend then also push, then switch back to main branch then continue what I requested if it's frontend related".
Files Modified: `frontend/src/lib/mock-db/api.ts`, `frontend/src/features/inventory/api/inventoryApi.ts`, `frontend/src/features/inventory/InventoryFormPage.tsx`, `frontend/src/components/ui/Modal.tsx`, `frontend/src/features/reports/components/ReportsPrint.tsx`, the Modal, Inventory and Backup tests, two canonical documents, `Screen-Inventory.md`, `Module-Overview.md`, the Changelog and Issues files, this log.
Changes Made:
- Q10: `verifyLatestBackup` refuses a failed run with `BackupFailedError`.
- Q11: an exact active item name is refused on save, whatever the unit, with `DuplicateItemNameError`, matching the approved key `uq_items_active_name`. The hint while typing now matches on name alone. This replaces the name-and-unit rule, so one test's expectation changed with it.
- Modal: when the control that opened a dialog is gone, focus moves to the main content instead of the page body. The keyboard walk found this on Mark as Missed.
- Monthly report printout: restored the gap above the two-column sections.
- Canonical documents, Screen Inventory and Module Overview carry ADR-061, the import screen and Usage History.
Reason: The Part 3 log listed these as not done.
Testing Performed:
- Tab walk on the built app in Chrome, 33 screens across both roles, 1,085 stops: every stop has a visible focus style, and none is off-screen or hidden.
- Keys-only flows with 0 pointer events: sign-in, new visit, opening a list row, the Manage menu, Back on a dirty form with Escape, Mark as Missed then Set new date, approving and printing a letter. Focus stayed inside the dialog over 12 Tabs.
- PDFs from Chrome, read page by page: Visit Details, Incident Report, Health Record, approved Excuse Letter, Monthly Report, Dashboard, Audit Log. All A4 with letterhead and page numbers. The Sports Report printout was not rendered.
- `Audit-Coverage.md` checked by script: all 34 action and target pairs in `api.ts` have a row, and every test file named exists.
- Typecheck 0, lint 0, Vitest 929 of 929 in three consecutive runs at `--maxWorkers=6`. At the default worker count, with 3.4 GB of 31.7 GB memory free, runs lost 2 to 29 different tests, mostly `Test timed out in 5000ms`. One run at the default passed.
Known Issues:
- On the `backend` branch: `API-Contract.md` still says "Mock differs" for Q10 and Q11, and the `Reference-Schema.sql` change has not been run against a database.
- Keyboard walk at 1280 only. Paper-form timing remains a team task.
Next Steps: Update the contract rows on `backend`.
