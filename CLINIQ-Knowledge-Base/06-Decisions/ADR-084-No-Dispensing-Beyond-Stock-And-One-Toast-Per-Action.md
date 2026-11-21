# ADR-084: Nothing is given beyond the stock on hand, and every action gets its own toast

**Date:** Friday, November 20, 2026 — 20:03 PHT
**Status:** Accepted (Zean, Friday, November 20, 2026, bug report: "Below zero in inventory is confusing" and "toast notification stucks (doesn't automatically removes after the duration), multiple actions does not stack notif". Answers in the run's pop-up: "I cannot be dispensed if no stock. plus clearer display. so remove the Below zero badge and use Out of stock instead. Block dispensing if out of stock, or quantity of medicine. Then also when adding quantity (clicking plus) for medicines given, it should also check how many does it have then if it's equals to the quantity now, it should block to add more then error appears"; and "Yes, each own toast".)
**Supersedes:** the "below zero warns, never blocks" part of [ADR-018](ADR-018-Stock-Integrity-For-Items-Given.md), and the "each toast has an id (by default its kind plus its message), so a repeated action shows one toast" sentence of [ADR-083](ADR-083-Action-Feedback-In-Sonner-Toasts-Forms-Reset-And-Scroll-To-Top.md) §2. Everything else in both stays.

## Context
- **Stock.** ADR-018 let a visit, an incident or the Dispense page give more than the usable stock; the shortfall became a negative count on the last usable batch, shown as "-3 tablets usable" with a "Below zero" badge. The nurse found the negative count confusing.
- **Toasts.** ADR-083 gave each toast the id `kind:message`. Two actions with the same result text (two restocks, two dispensations) merged into one toast instead of stacking. Each merge restarted Sonner's timer but not the CSS countdown line, which runs once when the toast mounts. The merged toast so stayed on screen after its line had run out, which read as "stuck".

## Decision
1. **No dispensing beyond the usable stock.** The backend's `StockService::take()` (the one path every visit, incident and Dispense-page dispense goes through) refuses a quantity above the usable, unexpired stock with a `409 stock_rule`: "Only N unit of Item in stock. Lower the quantity or restock first.", or "Item is out of stock. Restock it before giving it." when none is left. The mock's `takeUsableBatches` does the same. Nothing is written when refused.
2. **The forms stop at the stock.** In "Medicines & supplies given" the plus button is disabled once a line reaches the stock on hand (plus what the saved record already took), a typed quantity is capped there, and a line at the cap says "Only N unit in stock. You can't give more." in the error colour. The item picker disables an out-of-stock item with an "Out of stock" badge, as it does an expired one. The Dispense page refuses an over-stock quantity as a field error.
3. **"Out of stock" replaces "Below zero".** The Inventory list shows "Out of stock" (and drops "Low stock") at 0 or less, and never prints a negative count (`stockQuantityText` and the list's stock cell show 0). Counts that went negative before this decision stay stored; they read as 0 / Out of stock until a recount or restock.
4. **One toast per action.** `notify` no longer gives a toast an id. An `id` passed to `notify` only turns the `loading` toast with that id into its result (Back up now, `notify.promise`); any other id is ignored. "Please check the highlighted fields" is no longer merged either.

## Consequences
- A nurse who has really given medicine the count says is gone must restock or adjust the count first, then record it. This is the trade-off Zean chose over ADR-018's "never block recording care".
- The `belowZero` result field and its warning toasts remain for old negative counts, but new dispenses never set it.
- Pressing an action several times can show up to three toasts at once (Sonner's `visibleToasts`); double submits are still prevented by the busy button (`useSaveFeedback`).

## Canonical documents to update
Modules & Features (Module 8, Inventory: "dispensing below zero warns but never blocks" becomes "refused beyond the stock on hand"); Frontend Context Brief (toast behaviour).
