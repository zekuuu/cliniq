---
name: cliniq-table-patterns
description: Apply when building or changing a CLINIQ data table, especially one whose rows change with search, filters, sorting, pagination, date ranges, or report periods. Keeps columns stable, wide time-series tables readable, and table names accessible without repeating visible card headings.
---

# CLINIQ Table Patterns

Use this alongside `cliniq-interactive-states`, `cliniq-pagination-patterns`,
`cliniq-sorting-patterns`, and `cliniq-display-privacy` when a table is added or changed.

## Shared table boundary

- Reuse `frontend/src/components/ui/DataTable.tsx`; do not create a page-local table wrapper for the same behavior.
- Set `fixedLayout` whenever the table's row contents can change because of a search, filter, sort, pagination, date range, report period, tab, or other selection. This prevents browser auto-layout from moving columns when text lengths or badges differ between results.
- Use `DataTableColumn.width` for columns whose proportions matter. Widths should describe the table's intended hierarchy and add up to 100% when all columns are specified. Keep the table's existing horizontal scroller for narrow viewports.
- **Size columns by what they hold** (Monday, October 26, 2026 — 00:14 PHT). A column whose content has a known short length (a masked LRN, a date, a count, a status badge, a Medicine/Supply category, a fixed set of buttons) gets a `rem` width that fits its widest value and its header with the sort icon. Leave the column with free text or names (Item, Reason, Events, Name) unsized, so it takes the spare width. Don't let short columns share the leftover space equally with the text column: that leaves a narrow LRN column wide and the text column wrapping.
- **Check at both desktop widths.** Measure in a browser at 1366px (about a 983px table, sidebar open) and at the page cap (about 1104px). One-line content should stay on one line. A status badge's text never breaks inside the badge. Action buttons stay in one row. A free-text column may wrap. Where everything can't fit at 1366px, wrap the column whose content reads well on two lines (a name with the LRN under it, "date ·" over the time), never the badges or the buttons. A table should scroll sideways at 1366px only when it truly can't fit (Inventory, the Dashboard trend table).
- Keep the table semantic: use `rowHeader` for the identifying row cell, and keep column headers concise and accurate.

## Captions and visible headings

- Always provide a meaningful `caption`, even when the card header already names the table. The shared `DataTable` hides captions visually by default while keeping them available as the table's accessible name.
- Do not use an empty caption and do not duplicate a visible card heading inside the table. If the table must be visibly titled outside a card, opt out of `hideCaption` deliberately and preserve the caption text.

## Horizontal scrolling and sticky columns

- Keep horizontal scrolling on the shared `DataTable` wrapper; do not make the page itself scroll sideways.
- Set `stickyFirstColumn` when the first column identifies each row and `stickyLastColumn` when a summary/action column must remain available at the right edge. The shared component keeps either edge column opaque, layered above scrolled cells, and visually separated at its inner edge.
- Combine sticky columns with `fixedLayout` and calibrated widths. A sticky position without an intrinsic table width can still leave the browser compressing the columns until their content overlaps.
- When a fixed-layout table must grow past its scroller (a wide time series), give it an explicit `minTableWidth` equal to the sum of its column widths (e.g. `calc(26ch + 12 * 8rem + 5rem)`). Don't use `min-w-max` / `min-width: max-content` on a fixed-layout table: how browsers resolve max-content for `table-layout: fixed` isn't consistently defined. Don't drop `fixedLayout` to get overflow either: the column widths only apply with it, so columns would reshuffle as rows are filtered.
- Verify the actual scroll interaction at the left edge, middle, and far-right positions. Each sticky edge column must remain inside the scroller viewport, readable, and not show the columns underneath through its background.

- No button or link may spill out of its column at any width: a fixed-layout table whose columns are percentages or unsized gets a `minTableWidth` large enough for its widest action at the narrowest column share (Visits 48rem, Incidents 58rem, Follow-Ups 60rem, Students 40rem, Accounts 48rem, Inventory 67rem, Sports Reports 60rem), and an Actions cell with several buttons lets them wrap (`flex flex-wrap`). A spilled button is cut off by the scroller, with its focus ring (Tuesday, October 20, 2026 — 17:42 PHT).
- `DataTable`'s scroller keeps 4px of room for the focus ring (`-mx-1 px-1`, `scroll-px-1.5`) and, with pinned columns, scroll padding the width of the pinned column, so a focused cell never scrolls under it (`cliniq-interactive-states`, "Room for the focus ring").

## Wide time-series tables

- Cap period columns in the table view itself when a date range can produce a wide time series; do not cap the shared aggregation or chart data just to make a table fit.
- Show the most recent periods, preserve the source bucket indexes for counts and cluster markers, and add a plain note below the table stating how many earlier periods are hidden and how to see them.
- Keep period headers compact when their repeated prefix adds no information in a dense table (for example, use `Sep 14` in a weekly table while retaining `Week of Sep 14` in chart explanations and tooltips). Drop the year from period headers too: show it once in the card title (e.g. `Visits trend · 2025–2026`), keep it in each header's accessible name as screen-reader-only text, and size period columns to the short header (the Dashboard trend table uses 5rem). Yearly periods keep their year, since it is the period.
- Keep the cap local to the table's view model so charts, summary totals, and other dashboard panels continue to represent the full selected range.

## Low-signal rows

- For a dense period table, hide rows whose count is zero across every visible period by default. Decide this from the post-cap visible bucket window, not from the full source range.
- Provide a small, clearly labelled toggle with `aria-pressed` that reveals all complaint types, including rows hidden by the zero-activity rule.
- Filter only the table rows. Never mutate the source series or the totals used by another panel; the Common complaints card and its selected-range totals must remain unchanged.

## Verification

- In the screen test, assert that changing the relevant filter still leaves the same table structure and that a fixed table has the `table-fixed` class.
- For calibrated tables, assert the `col` widths so a later content change cannot silently restore auto-layout.
- For sticky wide tables, assert the sticky edge-column classes and verify both identifying and summary cells remain readable at multiple real horizontal scroll positions.
- For wide time-series tables, assert no more than 12 period columns, the earlier-period note, and that the chart still receives the uncapped bucket list.
- For low-signal filtering, assert a zero-activity row is hidden by default, appears after the labelled toggle is pressed, and does not alter another panel's totals.
- Apply the display-privacy rule to the row content and the pagination pattern when the list can grow.
