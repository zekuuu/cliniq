Date/Day/Time: Saturday, October 17, 2026 — 12:09 PHT
Agent: Codex
Task: Professor consultation follow-up, Part 1 — inventory batches and expired stock
Status: Partial
Prompt/Request: “Fix what the professor suggested and criticized (October 16 consultation),” beginning with Inventory: expiry must be tracked per batch and expired stock must stay visible until disposed.
Files Modified:
- `frontend/src/types/entities.ts`
- `frontend/src/lib/mock-db/{api.ts,selectors.ts,seed.ts,store.ts,types.ts,dashboard.ts,dashboard.test.ts,stock.test.ts}`
- `frontend/src/features/inventory/{README.md,InventoryListPage.tsx,InventoryListPage.test.tsx,StockModals.tsx,StockActions.test.tsx,api/inventoryApi.ts,api/inventoryApi.test.ts}`
- `CLINIQ-Knowledge-Base/{01-Requirements/Features/Module-Overview.md,02-Architecture/Database/ERD.md,06-Decisions/ADR-018-Stock-Integrity-For-Items-Given.md,06-Decisions/ADR-030-Inventory-Batches-And-Expired-Stock.md,06-Decisions/Decisions-Summary.md,08-Logs/Issues-and-TODOs.md}`
Changes Made:
- Replaced raw one-date inventory state with received batches and migration of both seed and persisted mock state.
- Derived usable, expired and total-on-hand quantities; low stock now uses only usable stock.
- Made Restock add a batch, Dispense use usable earliest-expiry batches, and visit edits return allocations to their source batches.
- Added explicit selected-batch adjustment/disposal, batch/movement-history view, expired-stock filter, and restock warning.
- Added ADR-030, amended ADR-018’s status line, added ERD decision D-19, updated module and inventory documentation, resolved the professor’s inventory FIX and auto-zero DECIDE, and opened canonical-document drift entries.
Reason: A new restock used to overwrite an item's only expiry date, hiding expired medicine and allowing an unsafe view of stock.
Testing Performed:
- `npm.cmd run typecheck` — passed.
- Focused Vitest run: `src/lib/mock-db/stock.test.ts`, `src/features/inventory/api/inventoryApi.test.ts`, `src/features/inventory/StockActions.test.tsx`, and `src/features/inventory/InventoryListPage.test.tsx` — 34 passed.
- `npm.cmd run lint` — passed.
Known Issues:
- The backend database design is still unapproved; D-19 deliberately records the batch-table decision without adding migrations or changing draft tables.
- The overall professor-consultation task remains in progress; Parts 2–10 have not been started.
Next Steps:
- Continue with Part 2 only after preserving this checkpoint, then complete remaining parts in prompt order before the shared Phase 2 audit.
