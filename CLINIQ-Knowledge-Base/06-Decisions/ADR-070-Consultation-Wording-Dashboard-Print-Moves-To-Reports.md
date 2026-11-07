> **Note, Saturday, November 07, 2026 — 11:43 PHT:** the Clinic Overview printout was removed altogether; Reports keeps its four monthly reports. See [ADR-074](ADR-074-No-Clinic-Overview-Printout.md).

# ADR-070: "Symptoms" and "Released to" are labels only; the Clinic Overview print moves to Reports; no pain rating

**Date:** Saturday, November 07, 2026 — 05:13 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026 — 04:18 PHT, answering the open questions from the professor's consultation of Friday, November 6, 2026). Amends ADR-045 (the Dashboard printout) and adds notes to ADR-049. The label changes are **built** (Part 1, this date); the print move is built in Part 2 of the same job.

## Context
At a consultation on Friday, November 6, 2026 (organized transcript `VOICE_261106_150820_organized_info.md`, plus a groupmate's handwritten notes), the professor asked for plainer words on the visit forms, questioned whether the Dashboard is the right place to print the clinic overview, and raised a pain rating. Zean answered the open points on Saturday, November 7, 2026 at 04:18 and 04:20 PHT.

## Decision
1. **"Complaint" becomes "Symptoms" on every screen and printout**, and **"Collected by" becomes "Released to"**. These are **labels only**. Internal field names, types, API functions, stored tag names and the ERD stay as they are (`complaint`, `extraComplaints`, `collectedBy`), so the ERD stays consistent and nothing is migrated. The words live in one module, `frontend/src/lib/labels.ts`, so a later change of wording is one edit.
2. The Visit form asks **"What symptoms is the patient feeling? Choose all that apply."** over the main symptom and the "Other symptoms" tags (ADR-053 is unchanged: one main symptom, up to three others, reports count the main one).
3. "Released to" keeps ADR-049's optional name, relationship and time. When the relationship is **Other**, a **"Specify who"** field appears and becomes required. The record stores who it was ("Neighbour"), not the word "Other".
4. **The Clinic Overview print leaves the Dashboard and moves to Reports**, as a "Clinic Overview" report with the Dashboard's period choices, an on-screen preview and the unchanged `DashboardPrint` component. The Dashboard keeps its "View full report" links. This amends ADR-045.
5. **No pain or severity rating.** It was considered and declined. No field, scale or rule is added.

## Alternatives Considered
- **Rename the data fields too** (`complaint` to `symptoms`). Rejected: it would churn the ERD, the API contract and every test for no change anyone can see. Zean asked to keep the ERD consistent.
- **Keep "Complaint".** Rejected: the professor found it unclear for the nurse. Whether the nurse herself says "symptoms" or "complaint" is still to be asked (Team Tasks); the single label module makes either answer a one-line change.
- **A pain scale (0 to 10).** Declined by Zean.

## Consequences
- Screens, printouts, tests and help text say "Symptom(s)" and "Released to"; stored data and the backend documents keep their names. The backend branch copies only the label note (hand-off in the Part 4 session log).
- Before Part 2 ships, the Dashboard still prints; after it, printing the clinic overview is done from Reports.
- A pain or severity field must not be added without a new decision.
