Date/Day/Time: Saturday, October 24, 2026 — 19:06 PHT
Agent: Codex
Task: Remove redundant passive badges from inventory and New Visit headers.
Status: Completed
Prompt/Request: "remove"
Files Modified:
- `frontend/src/features/clinic-visits/NewVisitEntryPage.tsx`
- `frontend/src/features/clinic-visits/NewVisitEntryPage.test.tsx`
- `frontend/src/features/inventory/InventoryDispensePage.tsx`
- `frontend/src/features/inventory/InventoryFormPage.tsx`
- `frontend/src/features/inventory/StockActions.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-24-remove-redundant-inventory-and-visit-badges.md`
Changes Made:
- Removed the `Staff form` badge from New Visit because the Staff-only route and page title already establish its purpose.
- Removed `New item` / `Editing` from Add/Edit Inventory Item because the page title states the current mode.
- Removed `Stock action` from Dispense Medicine or Supply because the title and explanatory text already establish the action.
- Added regression checks for all removed labels.
Reason: The removed labels repeated static page context without providing a meaningful, changing state. Existing status, safety, warning, archival, and loading badges were deliberately retained.
Testing Performed:
- `npm.cmd run test -- src/features/clinic-visits/NewVisitEntryPage.test.tsx src/features/inventory/StockActions.test.tsx` — passed (32 tests).
- `npm.cmd run typecheck` — passed.
- `git diff --check` — passed.
Known Issues:
- No new issues.
Next Steps:
- No follow-up is required for this scoped visual cleanup.
