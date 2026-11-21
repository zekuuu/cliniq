Date/Day/Time: Friday, November 20, 2026 — 20:03 PHT
Agent: Claude Code (Opus 5.5)
Task: Fix four reported bugs: backup locations, inventory below zero, authenticator warning, stuck/unstacked toasts
Status: Completed
Prompt/Request: "here are some bugs that we found in the system: duplicate backup, not writable should not be added or warn; Below zero in inventory is confusing; warning for authenticator; toast notification stucks (doesn't automatically removes after the duration), multiple actions does not stack notif". Answers to the follow-up questions: block dispensing beyond stock and show "Out of stock" instead of "Below zero", cap the "+" in medicines given at the stock with an error; nudge to set up the authenticator and warn before disabling it; every action its own toast; refuse a "Not found" backup path too.
Files Modified:
- backend/app/Modules/InventoryTracker/Services/StockService.php, backend/app/Modules/BackupVerification/Services/BackupService.php
- backend/tests/Feature/VisitsTest.php, backend/tests/Feature/UsersBackupTest.php
- frontend/src/lib/notify.ts, frontend/src/lib/notify.test.tsx
- frontend/src/lib/mock-db/api.ts, frontend/src/lib/mock-db/stock.test.ts
- frontend/src/components/forms/ItemsGivenField.tsx, frontend/src/components/forms/InventoryItemPicker.tsx, frontend/src/components/status/inventory.ts
- frontend/src/features/inventory/InventoryListPage.tsx, InventoryDispensePage.tsx, inventoryStatusSort.ts, api/inventoryApi.ts, api/inventoryApi.test.ts
- frontend/src/features/clinic-visits/ItemsGiven.test.tsx
- frontend/src/features/backup/BackupLocationsPanel.tsx
- frontend/src/features/account/AuthenticatorDialog.tsx, frontend/src/layouts/AccountMenu.tsx, frontend/src/layouts/AppShell.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-084-…, ADR-Index.md, Decisions-Summary.md; 08-Logs changelogs
Changes Made:
1. Backup locations: adding a location now refuses (422 on `path`) a folder already listed (case and trailing slash ignored), a folder not found, and a folder CLINIQ cannot write to. The panel shows the message under the folder picker and in the toast. The mock refuses duplicates.
2. Stock (ADR-084): `StockService::take()` and the mock's `takeUsableBatches` refuse more than the usable stock. Items-given lines cap at the stock (plus disabled, typed value capped, error line); the picker disables out-of-stock items; the Dispense page refuses over-stock as a field error. Inventory shows "Out of stock" instead of "Below zero" and never a negative count.
3. Authenticator: a warning dot on the account avatar and a warning icon on "Set up authenticator app" when not set up (not shown while the status loads); a warning box in the dialog for Staff who have not set it up; a warning box before disabling (stronger for the Administrator).
4. Toasts (ADR-084): root cause was ADR-083's default id `kind:message`: same-text results merged, and each merge restarted Sonner's timer but not the CSS countdown line, so the toast outlived its line. `notify` now gives no id; an id only pairs a loading toast with its result.
Reason: Bug report from testing.
Testing Performed: Backend `php artisan test`: 251 passed. Frontend: `tsc -b` clean, `npm run lint` 0 errors (1 old warning), Vitest: full run with 4 workers had 8 timeouts (5 s) in untouched screens; every one of those files then passed on its own (54 + 215 tests), and the same files pass on unchanged main, so they are load timeouts. New/changed tests: notify stacking and auto-close, stock refusal (backend + mock), items-given cap, backup duplicate/not-found refusal.
Known Issues: Counts already negative stay stored and read as 0 / Out of stock until recounted. A brand-new item with no batch still gets the old "no usable batch… dispose of expired stock" message (pre-existing wording).
Next Steps: Update Modules & Features (Module 8) and the Frontend Context Brief per ADR-084. Skills `cliniq-item-picker-patterns` and `cliniq-toast-patterns` should mention ADR-084.
