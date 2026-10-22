---
name: cliniq-combobox-patterns
description: Apply when building or changing a CLINIQ text field with a suggestion list (a combobox), such as a student lookup by LRN or name (StudentPicker). Keeps every combobox on the one shared, keyboard-usable primitive in the shared dropdown look.
---

# CLINIQ Combobox Patterns

Use this with `cliniq-dropdown-patterns` (the panel and option look), `cliniq-input-patterns` (field sizing), and `cliniq-interactive-states` (hover and cursor rules). Don't repeat their rules here.

## The primitive (`Combobox`)

- One shared component: `frontend/src/components/ui/Combobox.tsx`. Build every suggestion field on it. Don't write a page-local one.
- ARIA 1.2 combobox: the text field has `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`; suggestions are a `role="listbox"` of `role="option"` rows. Focus stays in the field.
- Keyboard: Down/Up open the list and move through it, Enter picks the highlighted option, Escape closes the list (or clears the field when the list is already closed), Tab moves on. Enter never submits the surrounding form.
- Look: the field uses `dropdownTriggerClassName` (40px, semibold, `border-border`, `shadow-card`) with a text cursor and no chevron (it would promise a list the field may not have yet; StudentPicker lists nothing on focus). The panel uses `DROPDOWN_PANEL` and `placeDropdownPanel`, so it pins to the field like `Select`. The highlighted row takes `bg-surface`.
- `allowFreeText` decides whether typed text is the value (`true`) or only a pick counts (`false`).
- States: `loading` ("Searching…"), `loadError` (shown in the panel as an alert), and "No matches" (`noMatchesText`, or `null` to keep the panel closed when empty).
- The caller filters and caps the options. The primitive doesn't filter, so it serves a local list and an async search alike.

## Complaint field (select plus Other)

- The visit Complaint field is the shared `ComplaintField` (`frontend/src/features/clinic-visits/ComplaintField.tsx`), built on the shared `Select`, not a Combobox. New Visit and the Visit Detail edit form both use it. "Other (type your own)" is always the first option: selecting it visibly retains that selection, clears a prior suggestion, reveals a required, focused **Specify other complaint** field, and never stores the option label.
- The select lists Other plus at most 8 ranked suggestions. Suggestions are predefined visit complaint types plus complaints already saved on visits, ranked by use count, then most recent. The pool comes from a data-layer selector (`complaintSuggestions`, ADR-014), never stored data.
- On save the text is normalized (`frontend/src/lib/complaints.ts`): trimmed, repeated spaces collapsed, 60 characters max. Text that matches a suggestion case-insensitively is stored in that suggestion's spelling. Whitespace-only is invalid. The data layer applies the same normalization on create (`recordVisit`) and on edit (`updateVisit`).
- Helper text says complaint only, no names.
- The first-aid checklist triggers on a case-insensitive match to a predefined type. Free text with no match shows no checklist.

## Student lookup (`StudentPicker`)

- `frontend/src/components/forms/StudentPicker.tsx`: a Combobox without free text. It matches an LRN prefix or a name substring, case-insensitively, for active students only. Results appear from the first character typed; nothing is listed on an empty field or on focus, and at most 8 results show, so it never reads as a roster. The placeholder is "YYYY-NNNNN or student name".
- Each result shows the masked LRN, full name, and grade, so similar names can be told apart (ADR-028). It's a deliberate single lookup, so full names are correct (`cliniq-display-privacy`).
- The query is never reformatted. A query of digits (spaces and dashes allowed) matches the start of the full LRN even though the list shows it masked. Anything with a letter is a name search.
- A complete 12-digit LRN highlights its match, so typing it and pressing Enter still works.
- No match: say so under the field. Pass `addStudentHref` only to roles that can add a student (Staff).
- Search goes through the feature's `api/` function (ADR-013), so the real backend can replace it. Results carry no medical fields (`StudentSearchResult`).
- After a pick, the form shows the chosen student (name, number, grade) with a Change action that brings the search back, focused. Pass `selected` and `onClear` to get this from `StudentPicker` itself; don't rebuild it on the page.
- Every field that identifies a student uses it: New Visit, Incident Stage 1, PE/Sports Referral, and Dispense. There is no separate typed identifier field.
