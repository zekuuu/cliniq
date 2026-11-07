---
name: cliniq-item-picker-patterns
description: Apply when building or changing a CLINIQ screen that records medicines or supplies given (a visit, an incident's Stage 2, the standalone Dispense page), or that lets Staff search and pick an inventory item. Keeps the searchable item picker and the "Medicines & supplies given" lines on one shared, keyboard-usable pattern with the stock rules of ADR-018.
---

# CLINIQ Item Picker Patterns

Use this with `cliniq-dropdown-patterns` (the panel look), `cliniq-input-patterns` (the search field), and `cliniq-interactive-states` (hover, cursor, bare icon actions). Stock rules come from `06-Decisions/ADR-018-Stock-Integrity-For-Items-Given.md`.

## The picker (`InventoryItemPicker`)

- A type-ahead search field, not a `Select`: inventory is long enough that typing beats scrolling. It's an ARIA 1.2 combobox: focus stays in the field, Up/Down move through options, Enter picks, Escape closes (or clears the search when already closed), Tab moves on. Enter never submits the surrounding form.
- Options are grouped under **Medicines** and **Supplies**, sorted by name, and each shows its **current stock and unit** on the right. Stock at or below zero shows in `text-error`.
- **Expired items stay visible but disabled**, with an `Expired` badge (`aria-disabled`, `cursor-not-allowed`). They can't be picked by click or keyboard.
- **Nearing-expiry items stay pickable**, with a warning badge ("Expires in 11d"). Items with no expiration date are always pickable.
- It's an "add" control: picking calls `onPick` and clears the search, ready for the next item. For a single-item form (Dispense), show the picked item in place of the picker with a bare remove icon to change it.
- The panel uses the shared dropdown surface and `placeDropdownPanel` from `components/ui/dropdownClassName.ts`, so it pins to the field in viewport coordinates like `Select`.
- **Suggested medicines (ADR-071, Zean, Saturday, November 7, 2026 — 04:18 PHT).** Pass the visit's chosen symptoms as `symptoms` (New Visit, Visit Details edit). Items whose "Commonly used for" tags (`usedFor`) match come first under **Suggested for these symptoms**, with the note "Suggestions come from the tags set on each item. The clinician decides." The rest sit behind a last option row, **Show all medicines (N more)**, collapsed by default and opened by click or Enter (it then reads "Show suggested only"). Typing always searches every item. A suggestion never hides, disables or blocks an item, and stock, expiry and allergy warnings stay exactly as above. With no symptom, or no tagged match, the list is the plain Medicines/Supplies one.

## The lines (`ItemsGivenField`)

- Legend: **Medicines & supplies given**. Optional; the free-text box beside it is labelled **Treatment notes** (care that isn't stock), and a visit can be saved with neither.
- Each line: the item name, a **quantity stepper** (bare `-`/`+` icon buttons around a typed whole-number field, minimum 1), the **unit** read-only from the item, an optional **Instructions** field (120 characters max, no visible counter), and a bare **remove** icon. Every control's accessible name includes the item name ("Increase Paracetamol 500mg", "Instructions for Paracetamol 500mg").
- **Compact rows** (Zean, Tuesday, November 03, 2026 — 18:18 PHT: "compact like in sports report"): one row per item in a list divided by lines, no box around each line. From `sm` the columns are named once above the list (Item, Quantity, Unit, Instructions (optional)) and every row uses the same fixed column widths, never `auto`, so names and values line up; below `sm` the row stacks and the instructions field shows its own label. Stock and expiry warnings sit under the row, full width. Column widths: Item takes the rest, Quantity 6rem (a tight stepper), Unit 4.5rem, Instructions up to 12rem, Remove 1rem, and the names row has the same `gap-x-3` as the rows. A line's expiry ("Expires in 11 days", "Expired") is a small coloured line under the item name, not a badge beside it (Zean, Tuesday, November 03, 2026 — 18:24 PHT: badges overlapped a wrapping name).
- Picking an item already on a line **adds one to that line**; it never creates a duplicate. Picks and removals are announced through a polite status region.
- A quantity above current stock **warns but never blocks** ("Only 12 tablets in stock. Saving takes stock below zero; recount and restock."). On an edit form, available stock counts what the saved record already took.
- An expired item already on a saved record can be kept or lowered, not raised: its `+` is disabled.
- Show the student's **recorded allergies** next to the picker, for awareness. An item's optional "avoid if allergic to" words that the patient's allergy entries mention show a warning that never blocks (ADR-049); nothing else is matched (there's no ingredient data). Before a student is identified, say they'll appear once identified; picking the student loads them at once.
- Saved lines are displayed with `formatItemGiven` from `frontend/src/lib/itemsGiven.ts`: "Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)", from the line's own name/unit snapshot. History lists use `visitCareSummary`.

## Where it's used

- New Visit and Visit Detail (edit), Incident Stage 2 (Stage 1 stays fast with no medicine entry), and the standalone Dispense page (picker only).
- The data layer enforces every rule above again; the UI is never the only guard.

## Shared components

- `frontend/src/components/forms/InventoryItemPicker.tsx`
- `frontend/src/components/forms/ItemsGivenField.tsx`
- `frontend/src/lib/itemsGiven.ts` (display helpers and `draftsFrom` for edit forms)
