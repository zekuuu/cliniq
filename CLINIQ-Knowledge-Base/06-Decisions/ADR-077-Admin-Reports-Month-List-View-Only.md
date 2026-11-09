# ADR-077: The Admin's Reports page is a month drop-down with the monthly reports, view only

**Date:** Sunday, November 08, 2026 — 18:45 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 8, 2026). It refines ADR-074 (the four monthly reports) and ADR-038 (the Admin reads but never prints) for the Admin. **Built** the same day ([session](../08-Logs/Agent-Sessions/2026-11-08-admin-reports-view-only.md)).
**Amended Sunday, November 08, 2026 — 22:36 PHT** (Zean, in chat): the Back control reads just **Back**, and the sheet is the printed page at its real size: A4 (210 mm, or 297 mm landscape), at least one page tall, with the print margins (14 mm top, 15 mm sides, 20 mm bottom). It never shrinks; a narrow screen scrolls it sideways. Still one sheet, without page breaks or page numbers.

## Context
The Admin opened the same Reports page as Staff. It had four tabs, filters, sort controls, a chart, a disabled Print / Save as PDF button, and links into each incident. Zean wanted the Admin's page simpler. Only Staff print or save, because the clinician sends the Monthly Report to the Principal.

## Decision
1. **The Admin sees a Report month drop-down and the list of that month's reports.** The list holds the four monthly reports of ADR-074, with Staff's names and order: Monthly Report, Incident register, Symptom summary, Inventory sheet. Each row has a title, one line of description, and an **Open** button. Nothing else is on the page.
2. **The months on offer.** The current school year comes first, from its recorded start (ADR-075) up to this month, newest first. The earlier recorded school years follow, each month labelled with its year, for example "May 2026 (2025–2026)". The page opens on the latest month with a visit or an incident. A month with no visits stays selectable and shows "No visits recorded this month".
3. **Open shows the report as a paper sheet, view only.** It is the same component Staff print, drawn on screen as a white A4 sheet, with a **Back** control. There is no Print, Save as PDF, Download, export or copy control. The tab title is "CLINIQ <report>, <Month Year>".
4. **Privacy.** On screen, the sheet shows the masked LRN or Staff No., like the Reports screen (ADR-040 item 2). The full LRN prints only on Staff's paper copy (ADR-044). No student name appears. Asked with the pop-up, Zean chose to keep what the printout shows: the incident rows stay, rather than being replaced by counts. The "Prepared by" line carries no name on the Admin's sheet, because the clinician who prints it signs it.
5. **Guards.** A Staff-only report route opened by the Admin (the Sports Report pages) redirects to `/reports`, not to the Dashboard. The data layer still refuses every Sports Report read for the Admin. The Admin reads the monthly report data only.
6. **No audit entry for opening a report.** Staff opening a report writes none today (ADR-048 logs profiles and incident reports only), so the Admin's opening writes none either.

## Limits
The browser's own Print (Ctrl+P) cannot be blocked by a web page. For the Admin, the app already replaces the printout with "Printing is done by the clinician." (ADR-038). Anyone can still take a screenshot. "View only" means the app offers no way to print or save, not that copying is impossible.

## Alternatives Considered
- **The Admin prints too.** Rejected: ADR-038 keeps printing with the clinician, who sends the Monthly Report.
- **The Admin keeps the full Reports page.** Rejected by Zean: too much for someone who only reads the month's reports.
- **Counts only for the Admin** (no incident rows). Offered; Zean chose to keep what the printout shows.

## Consequences
- `PrintDocument` gains an `onScreen` mode, and `ReportsPrint` a `readOnly` prop, so both roles see the same figures from one component.
- `BackButton` accepts a "Back to …" label with `onBack` (an in-page drill-in).
- The mock gains `getLatestRecordedMonth` and `getSchoolYearHistory` (settings with the recorded starts, read only).
- Backend: the Admin may call the aggregate monthly report endpoint only, every Sports Report endpoint returns 403 for the Admin, and the Admin's view needs no print endpoint (session log, "For the backend branch").
- Canonical documents that describe the Admin's Reports access need updating (DOC).
