---
name: cliniq-dropdown-patterns
description: Apply when building or changing a CLINIQ dropdown, select, listbox, or menu of mutually exclusive options. Keeps every dropdown on the one shared look (the Dashboard's date-range control), with selection feedback that is compact, icon-free, accessible, and sized to its content.
---

# CLINIQ Dropdown Patterns

Use this alongside `cliniq-interactive-states` whenever a dropdown's trigger or option list is created or changed.

## One look: the Dashboard's date-range control

- The Dashboard's date-range dropdown is the reference. Every dropdown matches its trigger, panel, and option rows.
- The look lives in `frontend/src/components/ui/dropdownClassName.ts`. `DateRangePicker`, `Select`, and `MultiSelect` all build on it; change the look there, never in one component or on one page.
- Trigger: 40px tall (`md`), `text-sm font-semibold`, `border-border`, `shadow-card`, and a 14px `brand-green-dark` chevron that flips while the panel is open. Use `size="sm"` (32px) only beside 32px inputs in a form grid or inside a table row.
- A leading icon belongs only to a dropdown whose type calls for one (the calendar on a date range). Don't add one to an ordinary select.

## Selected option

- Do not show a checkmark, radio glyph, or empty icon spacer beside the selected option.
- Use `bg-surface`, `font-semibold`, and `text-brand-green-dark` for the selected row. The background and weight make the state clear without relying only on green text.
- Keep non-selected options `text-text-primary` and give them the established `hover:bg-surface` response.

## Placeholder

- A prompt placeholder ("Select complaint", "Choose a reason", "Update status") shows on the trigger only. It is not an option row, because choosing it does nothing.
- A placeholder that is a real choice (a filter's "All grade levels", "All statuses") is listed as the first option, so choosing it clears the filter. Pass `clearable` to `Select` for these.

## Menu sizing

- First match the option panel to its trigger with `min-w-full`; then let it expand for its longest label with `w-max`.
- Keep `whitespace-nowrap` on option labels so the intrinsic width reflects the complete option.
- Constrain panels on small screens with `max-w-[calc(100vw-2rem)]`; do not allow a long option to create horizontal page overflow.
- Do not reserve width for a removed selection icon.
- Size a select's trigger to its content too: a filter select takes its natural width (`sm:w-auto`), not a fixed wide one.

## Implementation boundary

- Reuse or update the nearest shared dropdown component before creating a one-off pattern: `Select` for one choice, `DateRangePicker` for date ranges, `MultiSelect` for several values (`cliniq-multi-select-patterns`).
- Do not use a native `<select>` or a page-local select wrapper. A native control's open menu is operating-system chrome, which can't match the reference. The shared `Select` is a themed trigger with an accessible listbox.
- `Select` pins its panel to the trigger in viewport coordinates, so a scrolling table can't clip it; it opens upward when there is more room above and scrolls past 256px. Keep that when changing it.
- In tests, pick an option with `selectOption(user, trigger, valueOrLabel)` from `frontend/src/test/selectOption.ts`.
- When a record moves to one of several equal outcomes (a follow-up becoming Completed, Missed, or Cancelled), use **one** status select on the row, not a button per outcome. The shared `Select` has `size="sm"` and `hideLabel` for a compact control inside a table row; keep a full accessible label that names the row.
- Keep keyboard behavior (arrow keys, Home/End, typing to jump, Enter, Escape), focus restoration, `aria-expanded`, and `role="listbox"` / `role="option"` semantics intact.
