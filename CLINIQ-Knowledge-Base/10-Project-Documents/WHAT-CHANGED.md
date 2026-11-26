# What changed

Last updated: Thursday, November 26, 2026 — 22:20 PHT · `staging` 9400024d

## Thursday, November 26, 2026 — 21:47 PHT · staging 9400024d

### Project Plan

**5.1 FR-05 Emergency incidents** (p. 25). Because: ADR-094 and the current [Module Overview](../01-Requirements/Features/Module-Overview.md).

> **Emergency incidents.** Support two-stage incident logging, with the essential fields captured first and the details completed afterward. **$\textcolor{green}{\text{Record when the incident happened separately from the immutable entry time; accept optional, individually timed readings during Stage 2.}}$** Track hospital referrals, and log each parent-notification attempt with a timestamp and an outcome.

### SRS

**DR-007 Student contacts** (p. 58). Because: ADR-088 and the current [Data Dictionary](../02-Architecture/Database/Data-Dictionary.md).

> The system shall hold a student’s emergency contacts in order, with the first contact as the primary contact. ~~$\textcolor{red}{\text{When a contact is saved, the system shall prompt the School Clinician to verify the contact number before it is used for emergency notification, and shall let the School Clinician mark a contact number as verified or unverified.}}$~~

**DR-008 Unreachable contact** (p. 59). Because: ADR-088 and the current [Module Overview](../01-Requirements/Features/Module-Overview.md).

> If a contact number proves unreachable during an emergency, the system shall ~~$\textcolor{red}{\text{re-flag the record and prompt the School Clinician to verify the number with the class adviser or Registrar’s Office; the verification shall be logged.}}$~~**$\textcolor{green}{\text{record the person contacted, number dialed, time, and call outcome without creating a re-verification flag.}}$**

**DR-028 Incident stages** (p. 61). Because: ADR-094 and the current [Module Overview](../01-Requirements/Features/Module-Overview.md).

> For an emergency incident, Stage 1 shall require only the patient and the main symptom, with ~~$\textcolor{red}{\text{vital readings and notes optional}}$~~**$\textcolor{green}{\text{an editable “When it happened” time defaulting to now and optional notes; Stage 1 shall not accept entered vital readings}}$**, and shall save immediately. The record shall remain marked as an incomplete Stage 1 record until the School Clinician completes Stage 2, and incident lists shall show each incident’s stage. Every Stage 2 field shall be optional, and a completed Stage 2 left empty may still be approved after a no-treatment warning. **$\textcolor{green}{\text{Stage 2 readings shall each have their own clinician-entered time; the system shall retain the immutable entry time separately.}}$**

**DR-049 Operational settings** (p. 63). Because: ADR-091 and the current [Module Overview](../01-Requirements/Features/Module-Overview.md).

> Starting values (frequent visitor, cluster alert, follow-up windows, near-expiry window, top symptoms, vital-sign ranges, and similar) shall be stored as settings. ~~$\textcolor{red}{\text{Only the idle sign-out minutes have a Settings screen; the other values are changed in the database by the developer or the IT provider.}}$~~**$\textcolor{green}{\text{Staff may edit idle sign-out minutes, the upcoming follow-up window (1–30 days, default 7), and the approaching inventory-expiry window (1–180 days, default 30) on Settings; the Admin may view them. School-year dates remain editable on Archive; clinical and security limits remain fixed.}}$**

**FR-015 Emergency contacts** (p. 72). Because: ADR-088 and the current [Functional Requirements](../01-Requirements/Functional-Requirements.md).

> The School Clinician shall be able to record and order emergency contacts~~$\textcolor{red}{\text{, mark each as verified or unverified, and}}$~~**$\textcolor{green}{\text{ and}}$** record allergies and conditions. ~~$\textcolor{red}{\text{After an unreachable call, the system shall re-flag the contact for verification.}}$~~

**FR-036 Incident Stage 1 and Stage 2** (p. 73). Because: ADR-094 and the current [Module Overview](../01-Requirements/Features/Module-Overview.md).

> The School Clinician shall be able to save Stage 1 of an incident with the patient and main symptom, with the patient’s allergies, conditions, and contacts shown, and to return later to complete Stage 2. **$\textcolor{green}{\text{Stage 1 shall capture an editable event time and optional notes without entered readings. Stage 2 shall allow optional timed readings and an event-time correction before report approval.}}$** Incident lists shall show each incident’s stage.

**FR-064 Audit Log print** (p. 76). Because: ADR-093, [API Contract](../04-Development/API-Contract.md), and `backend/app/Shared/AuditLog/AuditLogController.php`.

> The Audit Log Viewer shall be read-only, shall let both roles filter entries by date, actor, action, and target, and shall let the School Clinician print ~~$\textcolor{red}{\text{the filtered entries}}$~~**$\textcolor{green}{\text{all entries matching the filters, including those beyond the current screen page}}$**.

**FR-066 Reversible changes** (p. 76). Because: ADR-089 and the current [Functional Requirements](../01-Requirements/Functional-Requirements.md).

> **$\textcolor{green}{\text{For a successful reversible change, the system shall offer Undo for eight seconds. Before reversing, it shall refuse a stale Undo when the record has changed again, and it shall retain both the original and reversing actions in the audit trail. Supported reversals include restoring a deleted calendar event, reinstating an eligible entered-in-error visit, and compensating stock movements without rewriting the original ledger.}}$**

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
