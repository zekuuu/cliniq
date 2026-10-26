# ADR-026: Every Printout Is a Purpose-Built A4 Document

**Date:** Thursday, October 15, 2026 — 23:02
**Status:** Accepted (requested by Zean, project team; details agent-decided)
**Note (Sunday, October 25, 2026 — 16:58):** the printed DRAFT mark on an unapproved excuse letter is replaced by a rule: a draft letter cannot be printed or saved as PDF until it is approved; the Admin cannot print at all (ADR-038, Zean, Sunday, October 25, 2026 — 16:45). Built Sunday, October 25, 2026 — 21:57 PHT ([2026-10-25-mina-rey-feedback-build-all-parts](../08-Logs/Agent-Sessions/2026-10-25-mina-rey-feedback-build-all-parts.md)); the DRAFT banner and watermark described below no longer occur. A superseded or void letter still prints stamped.
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 07:00):** the CLINIQ Student Number this ADR mentions was replaced by the LRN (ADR-028, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); lists show it masked. The rest of the decision stands.

## Context
Seven screens have a Print / Save as PDF action: the Clinic Overview Dashboard, Reports, the Excuse
Letter, the Incident Report, the Student Profile, the Audit Log, and Print QR Health IDs. Each printed
the screen itself with some controls hidden. The page size was never set, so the paper was whatever the
print dialog offered (Letter or A4). The Dashboard printed its widgets on about four pages, with colored
badges, link icons, and a "Showing…" line; the QR sheet printed its "Print Sticker" button and card
header. `Design-System.md` already said print layouts are "first-class, not an afterthought", and
Issues-and-TODOs had two open questions: "Dashboard print length and paper size" and "What is the
Dashboard print for, compared with the Reports print?".

Zean asked that every Print / Save as PDF come out on A4 and be a document with meaningful information
that a nurse, the Principal, or the school can hand to someone without the app in front of them.

## Decision
- **All printouts are A4** (portrait; a named landscape page exists only for a table that can't be read
  in portrait, and none needs it today). The school has **not yet confirmed** that A4 is its paper; the
  team chose it, and confirming it is a `VERIFY` item.
- **A printout is a purpose-built document**, not the screen with buttons hidden. Every one has a
  letterhead (school logo, "Mendez Christian Academy — School Clinic", the title), a plain-words scope
  line, content in reading order, and a footer on every page: printed date and time (Philippine time),
  the signed-in user's name and role, a confidentiality line, and "Page X of Y". No app chrome.
- **The Dashboard print is a period summary** ("Clinic Overview Report", button "Print overview") for
  the nurse and the Principal: key figures, a templated written summary, items needing attention,
  complaints (chart and table), and visit activity with the period's school events and holidays. **The
  Reports print is the formal document** (Monthly Clinic Report, Incident Report Archive, Health
  Summary), printing the tab on screen. This answers both open questions; it was decided by the team
  lead's request, not by an agent.
- **The privacy rules apply to paper:** a printout listing several students shows Student Numbers only;
  a printout about one deliberately opened student may show the full name (ADR-004). No internal record
  id is ever printed, and no reference number is invented (backend `LATER`).
- **Printing never fetches.** A printout renders from data the screen already loaded through the same
  data layer, so every figure equals the screen's.

Agent-decided details: the shared components in `frontend/src/components/print/`; the print tree mounts
only on `beforeprint` (no cost on screen); the footer lives in `@page` margin boxes (Chromium supports
them, including `counter(pages)`); the Dashboard printout regroups a daily trend into weeks and caps its
complaint table at eight rows plus an "Other" row; the excuse-letter draft prints with a "DRAFT, NOT
APPROVED" banner and a light DRAFT watermark; the Monthly Report's contents (below) are interim.

The Monthly Report's interim contents: totals with the previous month beside them, complaints (count and
share), dispositions, follow-ups by status, medicines and supplies given (dispenses minus visit-edit
returns, by item), the incident list, a prepared-by line, and signature lines. "What belongs in the
Monthly Report?" stays open for the nurse and the school.

**Added Wednesday, October 21, 2026 — 07:23:** the **Sports Report** (ADR-034, [2026-10-21-sports-report](../08-Logs/Agent-Sessions/2026-10-21-sports-report.md)) is a further document on the same components: full names (a decided exception), its own confidentiality line for the PE/Sports Instructor, signature lines for the clinician and the instructor, and the content read again at the moment of printing.

This supersedes ADR-025's "Print prints everything, whichever view is open": the Dashboard now prints
the Clinic Overview Report whichever view is open.

**Amended Monday, October 26, 2026 — 11:35 PHT (ADR-046, Zean):** the footer is now "Page X of Y" only. The printed-by and confidentiality lines are removed from every printout.

**Amended Monday, October 26, 2026 — 11:13 PHT (ADR-045, Zean):** the Dashboard now prints only the open tab. Overview prints the Clinic Overview Report, with the screen's stat cards and chip counts plus the lists behind them. Trends prints the Clinic Trends Report. The scope line names the tab.

## Alternatives Considered
- **Keep printing the screen, with tighter print CSS:** the fastest change, but still widget order,
  color-coded badges, and no who/when, so the paper doesn't stand alone.
- **A PDF library (generated files):** adds a dependency and a second rendering path; the browser's
  Save as PDF already gives a file.
- **Always-mounted hidden print trees (`hidden print:block`):** simpler, but every screen renders its
  content twice and every screen test sees duplicated text.
- **A fixed-position footer or a repeating table footer:** can overlap content or sit mid-page; the
  margin boxes keep the footer in the page margin on every page.
- **Page numbers from JavaScript:** not reliable; dropped in favor of CSS counters, which work in Chromium.
- **One-page Dashboard print for every normal period:** not reachable without dropping required
  sections; a normal month measures two pages (see the session log).

## Consequences
- Every new Print follows `.claude/skills/cliniq-print-patterns/` and reuses the shared components.
- The Student Profile now loads a student's whole history (the screen still lists the eight most
  recent), and the Dashboard loads Staff's pending letters and the period's events and holidays, so the
  printouts never fetch.
- Firefox and Safari support for `@page` margin boxes is not verified; the target is the clinic
  workstation's Chromium-based browser.
- **Canonical documents need updating** (flagged as `DOC` in Issues-and-TODOs, not edited here): the
  Frontend Design Reference (print layouts, Reference 1's print behavior) and the Frontend Context
  Brief (print rules), plus Modules & Features where it describes the Dashboard and Audit Log prints.
