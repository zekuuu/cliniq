Date/Day/Time: Thursday, November 26, 2026 — 22:17 PHT
Agent: Codex
Task: Organize Inventory table column widths and place the kebab menu at the right edge.
Status: Completed (code); visual verification pending.
Prompt/Request: “inventory table, fix the columns positions organize and make the kebab menu close to edge”
Files Modified: `frontend/src/features/inventory/InventoryListPage.tsx`, `frontend/src/features/inventory/InventoryListPage.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md`.
Changes Made: Fit Stock, expiry, Status and Actions columns to their contents, leaving more room for item names; narrowed Actions from 15rem to 10.5rem and right-aligned Restock and the final ⋮ trigger. Added a structural table test and updated the screen description.
Reason: The former wide Actions column left the menu visually detached from the table edge.
Testing Performed: Source-level review; the structural test was written but not run before the requested commit.
Known Issues: Desktop and phone visual checks have not yet been run on this change.
Next Steps: Run the focused Inventory List test and inspect the table in Chromium at 1366px and the page cap.
