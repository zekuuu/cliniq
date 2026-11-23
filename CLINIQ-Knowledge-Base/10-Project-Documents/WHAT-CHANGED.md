# What changed

Last updated: Monday, November 23, 2026 — 18:28 PHT · `main` 0a178b0

## Monday, November 23, 2026 — 18:28 PHT · main 0a178b0

Legend: 🟢 added · 🔴 removed · 🟡 edited · 🔵 diagram changed · 🟣 renumbered or moved · ⚪ needs decision

### Project Plan

🟡 **5.3.1 System Architecture, backend bullet** (p. 30). Because: ADR-080 (mock/API switch), ADR-081 (backend merged into `main`).

```diff
- The backend has eleven modules, shared services, and three scheduled jobs (backup, holiday sync,
- and follow-up closing). It is built and tested but not yet connected to the frontend.
+ The backend has eleven modules, shared services, and three scheduled jobs (backup, holiday sync,
+ and follow-up closing). It is built and tested, and the frontend connects to it through a
+ mock/API switch (ADR-080); everything is on `main` (ADR-081).
```

🟡 **14. System Development — Backend, row 14.1** (p. 47, timeline table). Because: ADR-080, ADR-081.

```diff
- Backend Development (API, database migrations on MariaDB, sign-in and audit, module endpoints,
- reports, and backup; not yet connected to the frontend) … In Progress
+ Backend Development (API, database migrations on MariaDB, sign-in and audit, module endpoints,
+ reports, and backup; connected to the frontend through a mock/API switch, ADR-080) … Completed
```

### SRS

No changes.

## Sunday, November 22, 2026 — 15:16 PHT · main 9da38fa

### Project Plan

**5.1 Requirements, FR-07 Inventory** (p. 26). Because: ADR-084 (no dispensing beyond the usable stock), ADR-068 (the Adjust Stock note is optional).

> ~~$\textcolor{red}{\text{Warn, but do not block, a dispense that would take stock below zero}}$~~ **$\textcolor{green}{\text{Refuse a dispense beyond the usable stock}}$**; lock the medicines of a completed incident; add a new batch on restock; and ~~$\textcolor{red}{\text{require a written note for}}$~~ **$\textcolor{green}{\text{flag}}$** a large write-off.

### SRS

**DR-015 Student search** (p. 59). Because: ADR-087 (an LRN search also matches the shown last 4).

> Student search shall match name words across the name parts, ignoring case and accents and tolerating spacing differences, and shall sort by last, first, and middle name. **$\textcolor{green}{\text{Typed LRN digits shall match the start of the LRN or, for up to four digits, its last four digits.}}$** A search that could contain an LRN shall not place it in a URL.

**DR-043 Dispensing** (p. 62). Because: ADR-084.

> If the usable batches cannot cover the quantity, the system shall ~~$\textcolor{red}{\text{warn and book the shortfall to the last usable batch}}$~~ **$\textcolor{green}{\text{refuse the dispense and record nothing}}$**.

**FR-014 Student lookup** (p. 71). Because: ADR-086 (top-bar search for students and staff).

> The School Clinician shall be able to look up a student by LRN or name, using a search that tolerates case, accents, and spacing, and shall be able to view the student list. **$\textcolor{green}{\text{A search field in the top bar shall find an active student or staff patient and open the profile.}}$**

**FR-021 Archive** (p. 72). Because: ADR-085 (Undo on the archive toast restores the record).

> The School Clinician shall be able to archive a student or staff record with a reason. The system shall refuse to archive without a reason and shall exclude archived records from active lists unless they are explicitly included. **$\textcolor{green}{\text{For eight seconds after an archive, the system shall offer an Undo that restores the record.}}$**

**FR-044 Dispense** (p. 74). Because: ADR-084.

> The School Clinician shall be able to dispense an item from the Dispense screen or from a visit or incident. The system shall refuse to dispense an item that has only expired stock, and shall ~~$\textcolor{red}{\text{warn when usable batches cannot cover the quantity}}$~~ **$\textcolor{green}{\text{refuse a quantity that its usable batches cannot cover}}$**.

## Sunday, November 22, 2026 — 14:29 PHT · main 9da38fa

### Project Plan

No changes.

### SRS

No changes.

## Sunday, November 22, 2026 — 10:44 PHT · Baseline

- **Project Plan:** `PROJECT-PLAN-2.pdf`, Document Revision No. 2, November 07, 2026, SHA-256 `135dbe679c513e7a9366da6a963facd93f09f489fedb0603aa8b8e5263f8b0f8`. Converted: all 53 pages. Left out: nothing.
- **SRS:** `Software-Requirements-Specification-SRS.pdf`, Version 1.1 (Draft), 11/07/26, SHA-256 `503a29e5895869815041ced83872b859a8ae23833624ab5b68bb873b8bf30c06`. Converted: all 82 pages, including the stacked course template (pp. 1–4), Wiegers template (pp. 5–12), section assignments (p. 13), blank CLINIQ draft (pp. 14–20), outline draft (pp. 21–25) and draft 1.0 (pp. 26–44) before the current draft (pp. 45–82). Left out: nothing.
