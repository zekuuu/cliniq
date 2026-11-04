---
name: cliniq-form-section-patterns
description: Apply when building or changing a CLINIQ entry or edit form with more than one group of fields (student, staff, visit, incident, inventory item, PE referral and the like). Keeps forms split into titled sections with dividers, on the one shared FormSection.
---

# CLINIQ Form Section Patterns

Use this with `cliniq-input-patterns` and `cliniq-interactive-states`. Source: Zean, Thursday, November 05, 2026 — 02:21 PHT ("reorganize it and design the layout intuitively"; "apply those by sections concept to everywhere it needs, like forms").

## Rules

- **Split a form with more than one group of fields into titled sections.** Use the shared `FormSection` (`frontend/src/components/forms/FormSection.tsx`): a visible `h2` title, an optional one-line description, and a divider above every section after the first. Put the sections as siblings directly in the card body (`CardBody className="flex flex-col gap-5"`); `first-of-type` drops the first divider. Don't build a page-local section heading.
- **A short form with one group of fields gets no sections** (Dispense, Parent notification, a modal): a lone heading adds nothing.
- **The divider is `FORM_DIVIDER`** (`border-t border-text-muted/50`, darker than `border-border` so it reads as a break). The action row under the last section uses it too: `pt-4 ${FORM_DIVIDER}`.
- **Titles name the group, never a field in it.** A section title that repeats a field label ("Complaint" over a Complaint field, "Treatment" over Treatment notes) makes the label ambiguous to screen readers and tests, because the section is labelled by its title. Use a group name instead ("Presenting problem", "Care given").
- **Fields inside a section line up on one grid**: a 3-column grid from `md` when a section has three or more short fields (the name fields are three columns), so field edges line up from section to section. Two long fields (allergies and conditions) may use two columns.
- **Order the first section by what is filled first**: the identifier or the name, then the rest. The failed-submit focus goes to the first invalid field in DOM order.

## Where it is used

Add/Edit Student (Identity, School details, Emergency contacts, Medical history), Add/Edit Staff (Identity, Work details, Emergency contacts, Allergies and conditions), New Visit (Patient and time, Presenting problem, Care given, Disposition, Logbook details), Add/Edit Inventory Item (Item details, Stock), PE/Sports Injury Referral (Referral source, Findings, Outcome).
