Date/Day/Time: Sunday, October 25, 2026 — 23:55 PHT
Agent: Claude Code (Opus 5.5)
Task: Admin manages calendar events; no past expiry dates; Inventory Stock column left-aligned
Status: Completed
Prompt/Request: "Also admin should also be able to manage calendar, like add edit events" · "Then also verify on medicine expiry date, it can be set to past" · "Then also in inventory, align the stock column to left"
Files Modified:
- frontend/src/features/dashboard/CalendarPage.tsx, components/VisitCalendar.tsx, components/DayEventsPanel.tsx; tests CalendarPage.test.tsx, VisitCalendar.holidays.test.tsx
- frontend/src/lib/mock-db/api.ts, features/inventory/InventoryFormPage.tsx, features/inventory/StockModals.tsx; test features/inventory/InventoryPanelReview.test.tsx
- frontend/src/features/inventory/InventoryListPage.tsx
- CLINIQ-Knowledge-Base: ADR-042 (new), ADR-019 (status note), Decisions-Summary, Module-Overview, Changelog
Changes Made:
- Calendar: the Calendar screen passes `canNavigate` for both roles, so the Admin opens days, adds/edits/deletes events and pages into the future. New `showVisitsLink` prop hides the day panel's "View visits" link for the Admin (the Visit Log is Staff-only). The event API had no role check, so nothing changed there; events are audited under the signed-in user. The old "Admin calendar days view-only" test became "Admin can open a day and add an event, no View visits link".
- Expiry (verified: a past date was accepted on Add Item and Restock, in the form and the data layer): `saveInventoryItem` (new items) and `restockInventoryItem` now throw "The expiration date can't be in the past."; the DatePicker on both gets `min` = today so past days can't be picked. Today stays allowed, matching `usableBatches` (`expirationDate >= today` is usable). New test covers both paths.
- Inventory list: Stock column `align: 'right'` removed, so it is left-aligned (page-specific; no table skill rule on alignment).
Reason: User requests. The calendar change amends ADR-019 (ADR-042).
Testing Performed: `npx tsc -b` clean. `vitest run src/features/dashboard src/routes/AppRoutes.test.tsx` 91/91; `src/features/inventory` 28/28; `src/lib/mock-db` has 2 failures (`stock.test.ts` "keeps expired stock visible after restock…", `sync.test.ts` renamed student) that fail the same way with this session's `api.ts` change removed, so they predate it.
Known Issues: The 2 pre-existing mock-db failures above.
Next Steps: The canonical Modules & Features / Project Plan wording on calendar access should get the ADR-042 note.
