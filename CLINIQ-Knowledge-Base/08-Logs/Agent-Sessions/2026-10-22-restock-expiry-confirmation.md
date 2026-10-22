Date/Day/Time: Thursday, October 22, 2026 — 15:03 PHT
Agent: Codex (GPT-5)
Task: Make inventory restock expiry entry a deliberate safety decision
Status: Completed
Prompt/Request: "For inventory restock expiry date, make it required then maybe add a button or whatever that the clinician can click indicating the items has no expiration. This is for safety check since the clinician might accidentally save it even the items actually has expiration"
Files Modified:
- frontend/src/features/inventory/StockModals.tsx
- frontend/src/features/inventory/api/inventoryApi.ts
- frontend/src/features/inventory/StockActions.test.tsx
- frontend/src/lib/mock-db/api.ts
- frontend/src/lib/mock-db/stock.test.ts
- frontend/src/test/pickDate.ts
- CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md
- CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md
- CLINIQ-Knowledge-Base/06-Decisions/ADR-035-Restock-Expiry-Confirmation.md
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-22-restock-expiry-confirmation.md
Changes Made:
- Made a restock batch expiration date required by default.
- Added an explicit **This batch has no expiration date** checkbox that clears and disables the date picker, with guidance to use it only when there is no manufacturer expiration date.
- Enforced the one-of choice in the mock inventory write layer so an unconfirmed blank date is rejected even outside the UI.
- Updated the reusable date-picker test helper so it can select a date while a parent modal is open.
- Added ADR-035 and synchronized the requirements, screen inventory, and canonical Modules & Features document.
Reason:
- A blank expiry date previously saved silently as no expiration, so an accidental omission could bypass expiration safety checks.
Testing Performed:
- Focused Inventory Stock Actions and DatePicker test suites passed (16 tests).
- Focused inventory data-layer validation test passed (1 test; 19 unrelated stock tests skipped).
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
Known Issues:
- The complete stock test file has one pre-existing date-sensitive assertion that expects the mock date October 17, 2026; it fails on the current October 22, 2026 clock. The new no-expiry validation test passes in isolation.
- The existing form-focus suite has a pre-existing Visit Detail selector failure (it queries Complaint as a combobox, but the current shared control is a button/select).
Next Steps:
- None.
