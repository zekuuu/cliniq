Date/Day/Time: Thursday, October 01, 2026 — 08:20
Agent: Codex
Task: Default Inventory List sorting to staff attention status
Status: Completed
Prompt/Request: "For the Inventory, default sort to status that shows first the near expire, low stock,all warning"
Files Modified:
- frontend/src/features/inventory/InventoryListPage.tsx
- frontend/src/features/inventory/inventoryStatusSort.ts
- frontend/src/features/inventory/InventoryListPage.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Set the Inventory List's initial active sort to Status, ascending.
- Added a dedicated status-priority helper: expired/below-zero items first, then nearing expiration, then low stock, then normal items. An item with both near-expiry and low-stock flags remains in the near-expiry priority group, so all warnings remain ahead of normal inventory.
- Added a regression test for the active Status header and the rendered staff-attention row order.
Reason: Staff should see items needing action before normal stock when opening Inventory; the user specifically requested near-expiry and low-stock warnings at the top.
Testing Performed:
- `npm.cmd test -- InventoryListPage.test.tsx` — passed (1 test).
- `npx.cmd eslint src/features/inventory/InventoryListPage.tsx src/features/inventory/InventoryListPage.test.tsx src/features/inventory/inventoryStatusSort.ts` — passed.
Known Issues:
- No new issues found.
Next Steps: None.
