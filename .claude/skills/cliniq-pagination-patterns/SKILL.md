---
name: cliniq-pagination-patterns
description: Apply when building or changing a CLINIQ operational list that can grow beyond a practical single page.
---

# CLINIQ Pagination Patterns

Reuse `frontend/src/components/ui/Pagination.tsx` for operational lists that grow over time, rather
than rendering every row at once.

## Behavior

- Show the current visible range, total record count, and a clear current-page indicator.
- **The current page number is a field** (Zean, Wednesday, November 4, 2026): "Page [ 3 ] of 12". The
  shared `Pagination` does it; don't rebuild it on a page. Enter or leaving the field jumps; Escape, an
  empty field or a non-number restores the current page; a number past either end goes to that end.
  A polite live region says "Page 7 of 12". The field is named "Page number", is sized for the page
  count's digits (no jump while typing), and is 44px tall on a phone. A single-page list shows the field
  too, holding 1, so every pager looks the same (Zean, Thursday, November 05, 2026 — 03:46 PHT; before, it showed plain "Page 1 of 1").
- Provide labeled Previous and Next buttons, disabling them at the first and last page.
- Reset to the first page when a filter changes so a user never lands on an empty later page.
- A print/export action renders the complete current filtered result, not only the visible page.
- Offer **Rows per page: 10, 20, 50 or 100** (Sir Rey, Sunday, October 25, 2026; 50 and 100 added Saturday, October 31, 2026): pass `onPageSizeChange` and
  take the size from `hooks/usePageSize.ts`, which keeps the choice for the browser session and shares
  it between lists. Changing the size returns to page 1. Default 10.

Follow `cliniq-interactive-states` for cursor, hover, focus, and reduced-motion behavior.
