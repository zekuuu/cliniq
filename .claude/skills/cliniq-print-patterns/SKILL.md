---
name: cliniq-print-patterns
description: Apply when adding or changing any CLINIQ Print / Save as PDF, or any screen whose output is meant for paper (reports, letters, record sheets, logs). Keeps every printout a purpose-built A4 document with a letterhead, a scope line, and a printed-by footer, built on the shared print components, never the screen with its buttons hidden.
---

# CLINIQ Print Patterns

Use this with `cliniq-display-privacy` (names on paper), `cliniq-table-patterns`, and
`cliniq-pagination-patterns` (a printout lists the complete filtered result). Decision: ADR-026.
Requested by Zean (project team), Thursday, October 15, 2026.

## A printout is a document, not the screen

The screen and the printout may share data and helpers, but the printout is its own document with
its own structure. A person who has never seen the app must be able to read it.

Every printout has:

1. **A letterhead:** the school logo (`/MCA_Logo.png`, no other brand asset), "Mendez Christian
   Academy — School Clinic", and the document title.
2. **A "what is this" line:** the scope in plain words (the date range, the report month, the applied
   filters, or the student and visit it is about). Never a placeholder date such as All's 1900 start.
3. **A footer on every page:** "Printed <date and time, Philippine time> by <name>, <role>", the
   confidentiality line ("Confidential: contains student health information. Handle according to the
   school's Data Privacy policy."), and "Page X of Y".
4. **Real content in reading order:** a short summary first, then the detail, then notes. Numbers that
   matter appear in words or a table, never only in a chart.
5. **No app chrome:** no sidebar, top bar, Back, buttons, tabs, filter controls, skeletons, tooltips,
   "Showing…" hints, loading text, or screen-only helper text.

## Page setup

- **A4 portrait** (`@page { size: A4 }` in `frontend/src/index.css`). The school has not yet confirmed
  A4 is its paper; the team chose it.
- A **landscape** page (`landscape` prop, `@page landscape`) only for a table that can't be read in
  portrait. None needs it today; the Audit Log reads in portrait.
- Body text about 10pt, tables no smaller than 9pt, the excuse letter and incident report 11–12pt.
- Tables repeat their header row on every page, never split a row, and a heading never sits alone at
  the bottom of a page.
- Correct in **black and white**: status in words, no large dark fills, charts labeled directly
  (`PrintBars`), never color alone.
- Use only data the screen already loaded: **printing never fetches**. Every figure equals the
  screen's figure because it comes from the same data function. If a figure isn't in the data, it
  doesn't print; log it as `LATER`.
- Never print an internal record id (`visit-0001`) and never invent a reference number (backend
  `LATER`). A printout that lists several students shows masked LRNs only; a printout about one
  deliberately opened student shows the full name and the full LRN (ADR-004, ADR-028, ADR-040).
- A draft or unapproved excuse letter does not print at all (ADR-038 item 6): it stays on screen and
  its Print is unavailable, with "Approve the letter to print it." in the same tooltip. A superseded or void letter still prints,
  stamped SUPERSEDED or VOID, so it can't pass for a valid one.

## Who can print

- **The Admin/Principal never prints or saves as PDF** (ADR-038 item 3). Every Print button is the
  shared `PrintButton`, which is unavailable for the Admin (not hidden): `aria-disabled`, so it stays
  focusable, with "Printing is done by the clinician." in a tooltip on hover or focus (Escape closes
  it) and as its accessible description. A tooltip, not a line under the button, so it never shifts
  the layout (Zean, Sunday, October 25, 2026). `usePrinting` mounts no document and records no audit entry for the Admin; the shell blocks
  Ctrl+P / Cmd+P for the Admin, and the browser's own Print menu prints only that line. The browser
  menu itself can't be blocked.

## Where it lives

- Shared components: `frontend/src/components/print/Print.tsx` (`PrintDocument`, `PrintSection`,
  `PrintTable`, `PrintFigures`, `PrintBars`, `PrintFields`, `PrintSignatures`, `PrintNote`).
- `PrintDocument` mounts only while the browser prints (`frontend/src/hooks/usePrinting.ts`, set on
  `beforeprint` with `flushSync`), renders into `document.body`, and writes the footer into the
  `@page` margin boxes; `index.css` hides the rest of the app for that print. So it costs nothing on
  screen and never duplicates screen text in tests. Pass the screen's loaded data as props.
- The screen's Print button is the shared `PrintButton` (`components/print/Print.tsx`), inside a `print:hidden` block; it calls `window.print()` (or `onPrint`) and takes a `disabledReason` for a document that isn't printable yet.
- Existing printouts: `DashboardPrint` (Clinic Overview Report), `ReportsPrint` (Monthly Clinic
  Report, Incident register, Complaint summary), and the print trees in `ExcuseLetterPage`,
  `IncidentReportPage`, `StudentProfilePage`, and `AuditLogPage`, and `SportsReportPrint` (the Sports
  Report, ADR-034).
- **The Sports Report is the one printout with its own confidentiality line** (`confidentiality` prop:
  "Confidential: for the PE/Sports Instructor named above. Do not post or share. Shows only what CLINIQ
  recorded; this is not a medical clearance.") and full names (a decided exception, ADR-034). Its Print
  button reads the visits and incidents again just before calling `window.print()`, so the paper is
  current; the print tree itself still renders only what the screen holds. Its audit entry names the
  report and the student count (`auditRecord` prop), not the title alone.

## Verification

- A test fires `beforeprint` and asserts the letterhead, the scope line, the footer CSS, figures equal
  to the screen's, and no names or internal ids on multi-student printouts
  (`frontend/src/features/print-documents.test.tsx`).
- Generate the PDF with Playwright Chromium (`emulateMedia('print')`, dispatch `beforeprint`,
  `page.pdf({ preferCSSPageSize: true })` without a `format`), check 595 × 842 pt per page, then
  rasterize every page, in color and grayscale, and look at it. Never Microsoft Edge.
