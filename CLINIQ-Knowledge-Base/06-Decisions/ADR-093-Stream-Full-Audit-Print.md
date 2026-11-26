# ADR-093: Stream the complete Audit Log print document

**Date:** Thursday, November 26, 2026 — 08:31 PHT
**Status:** Accepted (Zean, "okay implement", after the measured image, Dashboard and full-audit-print improvements were explained)

## Context

At five school years and 100,000 audit entries, the Staff Audit Log Print button fetched a single 29.05 MB JSON response. The PHP CLI server exhausted its 128 MB memory limit; the request succeeded at 512 MB in 4.56 seconds, before the browser rendered the printout. ADR-082 item 6 required the button to print every matching entry, while Ctrl+P alone prints only the visible page. ADR-026 requires a purpose-built A4 document, and the Audit Log print alone shows full LRNs to Staff (ADR-044 as amended).

## Decision

- In API mode, the Staff Print button opens `GET /api/audit-log/print` in a separate browser tab. The endpoint returns one HTML document in bounded 1,000-row database chunks. It applies the same date, user, action, target, visible-text search and sort filters as the screen, freezes the highest audit id before writing its own print entry, and prints every matching row exactly once. It writes exactly one `print` audit entry for the document.
- The endpoint is Staff-only. It includes the full LRN only in this print document, never on the Audit Log screen. All stored text is escaped before entering HTML; the document is private and not cached.
- The document retains A4 portrait, school letterhead, the filter scope and entry count, a repeating table header, and page-number footer. It opens the browser print dialog after the last chunk arrives, and offers an explicit Print / Save as PDF button if the browser blocks the automatic dialog.
- Ctrl+P on the Audit Log screen still prints only its visible page and says so. Mock mode keeps its existing small-data in-app printout. Other printouts continue to use `PrintDocument` and the screen's loaded data. This amends ADR-082 item 6 and records the Audit Log's existing exception to ADR-026's no-fetch print rule.
- The older `GET /api/audit-log?fullLrn=1` response remains for API compatibility, but the application no longer calls it for Audit Log printing.

## Consequences

At 100,000 entries the streamed response succeeded under the existing 128 MB PHP limit; it transferred about 15.3 MB in 18–20 seconds, and Chromium loaded 100,035 rows in about 19.8 seconds before invoking print. Creating a PDF from that many rows can still take substantial browser time and paper; staff can narrow filters for a practical document. The canonical Frontend Context Brief, Frontend Design Reference, Modules & Features and SRS descriptions of Audit Log printing need group review. The API Contract and CLINIQ print skill must describe this exception.
