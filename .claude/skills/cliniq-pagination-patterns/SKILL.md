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
- Provide First, Previous, Next and Last page buttons on the shared `Pagination`: icon only, arrows without tails (`chevronLeft`/`chevronRight`) and double arrows (`chevronsLeft`/`chevronsRight`) for the first and last page, each named "First page", "Previous page", "Next page", "Last page" (`aria-label` and tooltip). Disable First and Previous on the first page, Next and Last on the last (Thursday, November 05, 2026 — 21:58 PHT).
- Reset to the first page when a filter changes so a user never lands on an empty later page.
- A print/export action renders the complete current filtered result, not only the visible page.
- Offer **Rows per page: 10, 20, 50 or 100** (Sir Rey, Sunday, October 25, 2026; 50 and 100 added Saturday, October 31, 2026): pass `onPageSizeChange` and
  take the size from `hooks/usePageSize.ts`. Changing the size returns to page 1. **Every list opens at
  10, every time** (Zean, Tuesday, November 17, 2026 — 23:58 PHT): a change holds only while that screen
  stays open. Nothing is stored (no `sessionStorage`) and nothing goes in the URL. Before: the choice
  was kept for the browser session and shared between lists, so one pick of 100 opened every list at 100.
- **No hidden caps** (Zean, Tuesday, November 17, 2026 — 21:04 PHT). A paged list fetches every record
  that matches its search and filters, and the pager's total is that count. Never pass a `limit` to a
  list fetch. Search, filters, "Include archived" and sorting run over all records, not over a slice.
  A `limit` is for suggestion lists (comboboxes, item pickers, complaint suggestions) and for "recent"
  summaries that say so in their heading. Before: the Student List fetched at most 80 students.

Follow `cliniq-interactive-states` for cursor, hover, focus, and reduced-motion behavior.
