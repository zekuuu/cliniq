---
name: cliniq-input-patterns
description: Apply when building or changing a CLINIQ text, search, number, date, month, time, or password input. Keeps all shared text inputs visually and dimensionally aligned with standard selects, and keeps date and month fields on the themed DatePicker instead of native browser calendars.
---

# CLINIQ Input Patterns

Use this with `cliniq-interactive-states` whenever a text input is created or changed.

## One standard control treatment

- Reuse `frontend/src/components/ui/Input.tsx`; do not create page-local text input styling.
- Standard inputs are 40px tall, with `border-border`, a light card shadow, semibold 14px values, and a `brand-green` focus ring. This deliberately matches the shared `Select` trigger beside it.
- Keep the real visible label above the field, required indicator, nearby hint/error text, hover response, and visible keyboard focus treatment.
- Use an explicit local override only where a documented compact control is necessary; do not shrink filter inputs merely to create a different height from their paired dropdown.

## Leading icons and password reveal

- `Input` takes an optional `icon` (an `IconName`), drawn inside the field on the left in `text-secondary`. It is decorative (`aria-hidden`) and never replaces the visible label. Use it where an icon helps a user recognize the field, as on Login (`user` for Username, `lock` for Password); don't add one to every field by default.
- Every `type="password"` field automatically gets a reveal toggle on its right: a 32px eye/eye-off button named "Show password", with `aria-pressed` for its state. It's `type="button"`, so it never submits the form. Edge's built-in reveal eye is hidden so a field never shows two. Don't build a page-local reveal.
- Fields without `icon` or `type="password"` render exactly as before, with no extra wrapper.

## Clear button, optional fields and field width (Thursday, November 05, 2026 — 02:21 PHT)

- **Clear button on every editable text field** (Zean): the shared `Input` shows an X button whenever a `text`, `tel`, `email`, `url` or `number` field holds text; `Combobox` does the same. It is named "Clear" (search fields keep "Clear search"), carries `aria-controls` for its field, empties the field and keeps focus in it. It never shows on a password (the reveal eye sits there), a date or time field (their own pickers), or a read-only or disabled field. Don't add a page-local clear button.
- **Optional fields say so in the placeholder, not the label** (Zean): no "(optional)" in a label and no "Optional." at the start of a hint. The placeholder reads "Optional", or "Optional, e.g. Santos" when it also gives an example. Required fields keep the red asterisk (ADR-051). A field whose empty value already has a meaning keeps that placeholder ("None recorded", ADR-051), and a select whose empty choice is named ("Not specified") needs nothing more.
- **Size a field to what it holds** (Zean): a field alone on its row is not stretched across the card. From `sm`: a patient or student picker, an item picker and a long single-line text `sm:max-w-md`; a short select (complaint) or a short text (username) `sm:max-w-sm`; a select of a few short choices `sm:max-w-xs`; a quantity `sm:max-w-40`. Fields in a grid row, text areas and lists keep the full width. Below `sm` every field is full width.

## Date, month, and time fields

- Never use a native `type="date"`, `type="month"`, or `type="datetime-local"` input: their calendars are operating-system chrome. Use `DatePicker` (value `YYYY-MM-DD`) or `MonthPicker` (value `YYYY-MM`) from `frontend/src/components/ui/DatePicker.tsx`.
- The trigger is the shared 40px dropdown trigger with a `brand-green-dark` calendar icon, showing the value in the standard `Oct 2, 2026` / `October 2026` format and a muted placeholder when empty.
- The calendar is a floating, viewport-pinned panel: selected day/month in `brand-green-dark` with white text, today ringed in `brand-green`, a heading that zooms out to month and year grids, and a Today/This month footer action. Pass `min`/`max` instead of validating out-of-range picks afterward.
- `Clear` appears only for optional fields; pass `clearable={false}` for a value that must always exist without a required asterisk (for example a report period).
- A date-and-time value is a `DatePicker` plus a typed `Input type="time"`; the global stylesheet hides the browser's clock popup.
- Tests pick dates through `pickDate` / `pickMonth` in `frontend/src/test/pickDate.ts`.

## Failed submit

- Every entry and edit form uses the shared `useFocusFirstInvalid(formRef)` (`frontend/src/hooks/useFocusFirstInvalid.ts`): call `report(errorCount)` on each submit, after setting the errors, and render its `announcement` in a `role="status"` `sr-only` paragraph inside the form.
- On a failed submit, focus moves to the first field marked `aria-invalid` (or the form's one `role="alert"` message when the form has no per-field errors), scrolled to the middle of the screen so the sticky top bar never covers it, and screen readers hear "N fields need attention."
- Shared controls (`Input`, `Select`, `DatePicker`, `Combobox`, `Textarea`, `StudentPicker`) already set `aria-invalid` from their `error`; a page-local field must do the same.

## Scope

This rule covers text, search, number, date, month, time, and password fields. It does not replace `Select`, `DateRangePicker`, or `MultiSelect`; use the relevant shared control for those choices (the date-range custom From/To fields are themselves `DatePicker`s).

- **Search fields are `type="search"`** (Zean, Tuesday, November 03, 2026 — 23:58 PHT): every list search uses `<Input type="search">`. Its role is `searchbox`. Since Wednesday, November 04, 2026 — 00:17 PHT the shared `Input` does two things for it: what is typed reaches the page 250ms after typing stops (a change from outside, such as Clear Filters, shows at once), and its own clear button (X, secondary text, brand green on hover, "Clear search") shows whenever the field has text and clears at once. The browser's own button is hidden: it showed only on hover or focus. Don't add a delay in the page as well.
