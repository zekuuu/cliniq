---
name: cliniq-pagination-patterns
description: Apply when building or changing a CLINIQ operational list that can grow beyond a practical single page.
---

# CLINIQ Pagination Patterns

Reuse `frontend/src/components/ui/Pagination.tsx` for operational lists that grow over time, rather
than rendering every row at once.

## Behavior

- Show the current visible range, total record count, and a clear current-page indicator.
- Provide labeled Previous and Next buttons, disabling them at the first and last page.
- Reset to the first page when a filter changes so a user never lands on an empty later page.
- A print/export action renders the complete current filtered result, not only the visible page.
- Offer **Rows per page: 10 or 20** (Sir Rey, Sunday, October 25, 2026): pass `onPageSizeChange` and
  take the size from `hooks/usePageSize.ts`, which keeps the choice for the browser session and shares
  it between lists. Changing the size returns to page 1. Default 10.

Follow `cliniq-interactive-states` for cursor, hover, focus, and reduced-motion behavior.
