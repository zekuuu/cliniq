---
name: cliniq-date-range-patterns
description: Apply when building or changing a CLINIQ date-range filter for a multi-record operational view. Keeps presets, the All default, custom-range confirmation, and overlay behavior consistent.
---

# CLINIQ Date-Range Patterns

Use this with `cliniq-dropdown-patterns` and `cliniq-interactive-states` whenever a screen filters a multi-record operational list by date.

## Shared implementation

- Reuse `frontend/src/components/ui/DateRangePicker.tsx`; do not build a second date-range menu or separate From/To filter pattern.
- Configure the presets with All first, followed by Today, This week, This month, and Custom range. Use `presetLabels` when the underlying seven-day preset needs the user-facing label “This week”.
- Start every date-range filter on All, so opening a screen does not hide historical records behind an arbitrary time window.
- Exception: Visit Log and Incident Log open on Today (Zean request, Friday, October 23, 2026 — 06:12 PHT). All remains the first selectable preset.
- Exception: the Clinic Overview Dashboard is a summary view, not a record list, and opens on Today (user request, Thursday, October 22, 2026 — 14:25 PHT). All stays available as its first preset.
- The trigger is the same 40px control on every screen. Pass `fullWidth` when the picker sits in a grid of equal-width filters, so it fills its cell like the selects beside it.

## Custom range

- Keep edits as a draft and apply them only after the user selects Apply (or presses Enter). Invalid or incomplete dates must explain the problem without changing the currently applied range.
- Use `customPopover` when the picker sits in a filter row above a table or list. The custom From/To panel must overlay content below the trigger, never reflow the controls, table, or page layout.
- The popover opens only when Custom range is chosen and closes on Apply, Cancel, Escape, or an outside click; the applied preset stays unchanged until Apply succeeds. Pass `popoverAlign="start"` when the picker is at the left edge of its row so the panel does not overflow leftward.
- In a filter row, size the picker to its content (no `fullWidth`) unless the row is an intentional grid of equal-width filters.
- Do not let a custom range end later than today.

## Interaction boundary

- Preserve the picker’s accessible listbox, keyboard navigation, focus restoration, and outside-click dismissal.
- Follow `cliniq-dropdown-patterns` for preset-menu sizing and selected-option treatment, and `cliniq-interactive-states` for cursor, hover, and focus behavior.
