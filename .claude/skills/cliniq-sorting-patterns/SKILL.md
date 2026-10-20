---
name: cliniq-sorting-patterns
description: Apply when adding or changing sortable columns in a CLINIQ list or DataTable. Keeps sort state accessible, deterministic, privacy-safe, and coordinated with pagination and fixed table layout.
---

# CLINIQ Sorting Patterns

Use this alongside `cliniq-table-patterns`, `cliniq-pagination-patterns`, and
`cliniq-interactive-states` whenever a table can be reordered by a column.

The Visit Log (`frontend/src/features/clinic-visits/VisitLogListPage.tsx`) is the canonical
reference for this pattern: its date-time sort is active by default (newest first), its other
meaningful data columns use the same shared header control, and its action column is not sortable.

## Shared sort behavior

- Reuse `DataTableColumn.sort` in `frontend/src/components/ui/DataTable.tsx`; do not build a page-local sort button that bypasses the shared header control. The shared comparison and toggle helpers live in `frontend/src/lib/tableSort.ts`.
- Every user-facing data column with a meaningful order should expose this sort control. Leave action columns and purely visual/status-layout columns unsorted when ordering them would not help the user.
- Keep sort state controlled by the page. Store the key and direction explicitly, copy the source rows before sorting, and sort the complete filtered result before slicing the current pagination page.
- A first click on an unsorted column uses ascending order. A second click on the active column reverses the direction. Selecting a different column starts that column in ascending order unless the product requirement specifies another default.
- Whenever a table exposes a date or date-time column, make that column the active default sort in descending order so the latest record appears first. Only choose a different default when a documented product requirement makes the date order secondary.
- Use deterministic comparators for the displayed value (for example, locale-aware comparison with numeric ordering for LRNs and timestamps). Keep ties stable where the data layer provides a meaningful original order.
- Reset pagination to page 1 whenever the sort key or direction changes, just as when a filter changes.

## Accessibility and interaction

- Let `DataTable` render the sort button, `aria-sort`, direction icon, and accessible label (`Sort by …`). The label must include the current direction after a sort is active.
- Keep the header control keyboard operable with the shared focus, cursor, hover, and reduced-motion behavior. Do not make an entire static header cell clickable outside the button.
- Sorting changes row order only; it must not change the privacy rule, row actions, column widths, or visible caption behavior.

## Verification

- Test the required default order.
- Test the first click and second click on a sortable column, including the accessible label and `aria-sort` state.
- Test that changing sort while paginated returns to page 1 and that sorting occurs before pagination.
- Combine this with `cliniq-table-patterns` checks for fixed layout and `cliniq-display-privacy` checks for row content.
