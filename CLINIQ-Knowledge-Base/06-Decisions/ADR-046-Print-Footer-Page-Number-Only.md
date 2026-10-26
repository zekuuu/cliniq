# ADR-046: Printouts footer with the page number only

**Date:** Monday, October 26, 2026 — 11:35 PHT
**Status:** Accepted

## Context
ADR-026 gave every printout a footer on each page with three parts: "Printed <date, time> (Philippine time) by <name>, <role>", a confidentiality line, and "Page X of Y". ADR-034 gave the Sports Report its own confidentiality line. When the browser's own header ("10/26/26, 11:17 AM … CLINIQ — Clinic Overview") was also turned on, every page carried two rows of small print. In the system review on Monday, October 26, 2026, Zean asked to remove these from all printouts "to reduce crowded in documents". Zean then chose "Remove both, keep Page X of Y" and asked to "keep page number on bottom right footer".

## Decision
- Every printout's footer is "Page X of Y" at the bottom right. The printed-by line and the confidentiality line are removed, including the Sports Report's own line.
- The Sports Report keeps its confidentiality line on the screen.
- Printing is still audit-logged with who printed what and when (`usePrinting`), so accountability does not depend on the paper.
- The browser's own header (date and title) is removed in code (Zean, "remove this headers", Monday, October 26, 2026 — 11:39 PHT). The page has no top margin (`@page { margin: 0 15mm 20mm }`), so Chrome has no room to draw its header there. Chrome draws its header and footer in any page margin that has room, even when the page sets its own footer (Chrome for Developers, "Add content to the margins of web pages when printed using CSS"). The `PrintDocument` has 14mm of top padding with `box-decoration-break: clone`, so every page keeps a top gap. This was checked in a Chromium PDF: about 19mm on page 1 and 17mm on later pages. The bottom margin stays for "Page X of Y". If Chrome still prints its own footer (page address, "1/2") there, untick "Headers and footers" in the print dialog.

## Alternatives Considered
- Set the page margins to 0 to force the browser header and footer off. This was not chosen because it also removes "Page X of Y", which Zean asked to keep.
- Merge the footer into one short line. This was not chosen; Zean chose to remove both lines.

## Consequences
- This amends ADR-026 (footer content) and ADR-034 (the Sports Report's printed confidentiality line).
- A sheet found away from the clinic no longer says who printed it or that it is confidential. The audit log is the record of who printed it.
- The clinic computer's Chrome may still need "Headers and footers" turned off once if the browser footer appears. This belongs in the deployment checklist.
- The canonical Frontend Context Brief and Frontend Design Reference (print rules) need a matching note.
