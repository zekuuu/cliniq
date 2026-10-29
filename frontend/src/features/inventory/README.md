# Medicine and Supply Inventory Tracker

## What it is
Item management, batch-aware dispense/restock flow, and derived low-stock/expiry flags. Full stock-flow mechanics: Modules & Features canonical doc and ADR-030.

## Screens and who can use them
All School Clinician only: Inventory, Add / Edit Inventory Item, Dispense Medicine or Supply, and the Restock, Adjust Stock and disposal dialogs (`StockModals.tsx`).

## Rules that matter
- Each received batch retains its quantity, received date and nullable expiry; restock adds a batch, usable stock excludes expired batches, and expired stock stays visible until an explicit disposal (ADR-030).
- Restock requires an expiry decision (ADR-035).
- Medicines given on a visit or incident come out of real stock (ADR-018).
- An item's brand (generic, branded or not specified) is optional and PROVISIONAL.

## Data and API files
`api/inventoryApi.ts`; status sorting in `inventoryStatusSort.ts`.

## Printouts and tests
No printout yet. Tests: `InventoryListPage.test.tsx`, `StockActions.test.tsx`, `BrandAndPaging.test.tsx`, `InventoryPanelReview.test.tsx`, `api/inventoryApi.test.ts`.

## Not built yet
Decided, not built:
- An "avoid if allergic to" tag on medicines that warns, never blocks (ADR-049).
- A monthly inventory printout (ADR-050).
