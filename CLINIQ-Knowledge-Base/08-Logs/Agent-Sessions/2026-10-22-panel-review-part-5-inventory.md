Date/Day/Time: Thursday, October 22, 2026 — 18:13 PHT
Agent: Claude Code (Claude Opus 5.5)
Task: Panel review, part 5 — Inventory Manage menu, expiry on Add Item, duplicate warning, Add/Remove toggle
Status: Completed
Prompt/Request: `Prompt-Build-Panel-Review-Fixes-Oct22.md`, Part 5 (IV-1, IV-2, IV-3, IV-7, defaults D9 and D10), at Zean's "Continue next part and to the last part no stopping". The asks:
- Restock as the one visible row action, with Adjust Stock, Batches and Edit under "Manage" and a help line;
- ADR-035's expiry rule on Add Item, enforced in the data layer;
- a non-blocking duplicate warning and free-text units with suggestions;
- Add / Remove with a positive quantity instead of a typed minus sign, showing the resulting stock.

Files Modified:
- frontend/src/lib/mock-db/api.ts (`InventoryInput.noExpirationConfirmed`, the Add Item rule)
- frontend/src/features/inventory/api/inventoryApi.ts (`findDuplicateItem`, `unitSuggestions`, the form context lists every item)
- frontend/src/features/inventory/InventoryListPage.tsx
- frontend/src/features/inventory/InventoryFormPage.tsx
- frontend/src/features/inventory/StockModals.tsx
- frontend/src/features/inventory/InventoryPanelReview.test.tsx (new)
- frontend/src/features/inventory/StockActions.test.tsx, frontend/src/features/back-navigation.test.tsx (new controls only)
- CLINIQ-Knowledge-Base: 01-Requirements/Features/Module-Overview.md, 03-Design/Screen-Inventory.md, 06-Decisions/ADR-035 (status note: extended to Add Item), canonical CLINIQ_Modules_and_Features.md, 08-Logs

Changes Made:
- **Row actions (IV-1).**
  - Each row has Restock, then one "Manage" row select with Adjust Stock, Batches and Edit. The row select is the `cliniq-dropdown-patterns` pattern, like the Follow-ups "Update status".
  - Same actions and dialogs, nothing removed. Dispense is unchanged.
  - The help line "Restock when new stock arrives. Adjust Stock to correct a count." sits above the table.
- **Add Item expiry (IV-2, D10).**
  - The date, or the "This item has no expiration date" tick. The tick clears and disables the date, as on Restock.
  - The form refuses a blank date. The data layer refuses a blank date without the confirmation, and refuses both together, for new items only.
  - An existing item's expiry still changes only through Restock.
- **Duplicates and units (IV-3, D9).**
  - `findDuplicateItem` matches name and unit, ignoring case, spacing and a trailing "s". It warns "<item> (<unit>) already exists. Restock it instead?", with a link to the Inventory list filtered by the name (new `?search=` on arrival). It never blocks.
  - The unit is a free-text `Combobox` with suggestions from the units in use.
  - Strength was not split into its own field.
- **Adjust Stock (IV-7).**
  - Remove, Add or "Set to counted quantity". Remove is first because a count correction or write-off is the common case.
  - The quantity is a positive whole number; zero or a minus sign is refused.
  - The batch's result before saving shows as "This batch after saving: N (now M)".
  - Reasons, the required note for Other, and the below-0 rule (ADR-018 item 8) are kept.

Reason:
- The panel review findings listed above, with Zean's "Yes" to the Manage menu (Thursday, October 22, 2026 — 15:44).

Testing Performed:
- Typecheck pass. Lint shows no new findings in the inventory files.
- `InventoryPanelReview.test.tsx` (7 new tests) covers:
  - data-layer expiry rules: blank refused, both refused, confirmed accepted, edits unaffected;
  - the form asking before saving a blank expiry;
  - duplicate matching and unit suggestions;
  - the warning and its link, without blocking;
  - Restock visible with the Manage options in order;
  - Add with the result shown;
  - zero refused.
- Existing tests now drive the new controls:
  - Adjust Stock opens from Manage;
  - "Quantity to remove 2" instead of "-2";
  - the Add Item back-navigation test ticks no-expiry.
- Inventory suites: 23 of 23 pass.
- Browser: Playwright + Chromium (not Edge), Staff (inventory is Staff only), at 1440, 768 and 390 px. Screens: the inventory list, the Manage menu open, Adjust Stock with Remove 3, Add Item with the duplicate warning and the no-expiry tick. All looked at. No horizontal scroll. axe found 0 violations on all four.

Known Issues:
- None new.

Next Steps:
- Part 6 (access, backup and wording).
