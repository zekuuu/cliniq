---
name: cliniq-audit-trail
description: Apply whenever implementing any action that creates, modifies, deletes, views, or prints sensitive data — logins, form submissions, approvals, Print / Save as PDF, or any create/update/delete/archive operation. Ensures the action gets logged for RA 10173 accountability.
---

# CLINIQ Audit Trail Requirement

Every one of the following action types must write an audit log entry, across every module, not just the ones where it feels obviously sensitive (Modules & Features, "Audit Trail" cross-cutting section):

- **Login and logout** (Module 1)
- **Every form submission** — new visit, new incident, inventory dispense/restock, follow-up creation, etc.
- **Every approval** — excuse letter sign-off, incident report sign-off
- **Every create/update/delete/archive** action on any record
- **Every Print / Save as PDF** of student or clinic health information — one entry with the signed-in user, real time, and document title. Use shared `beforeprint` handling so buttons and Ctrl+P both log exactly once. A printout about a saved record may name that record instead (`PrintDocument`'s `auditRecord`, e.g. a Sports Report with "Printed for 12 students"): a count, never the students.

## What a log entry needs

Per the `AuditLogEntry` shape already defined (Frontend Context Brief, Section 5): **who** (the authenticated user), **what action type**, **what target record**, **when** (timestamp). This is what makes every access accountable under RA 10173: each action is attributable to a signed-in Staff or Admin/Principal account and timestamped.

**Never write an LRN in an entry (ADR-028).** A summary names fields, never values (ADR-017): a corrected LRN is "Updated LRN", with neither the old nor the new value. Where the Audit Log shows a student-related record, it shows the masked LRN (`●●●●●●●●1234`), and links to the student by the internal id.

## When you're implementing a new endpoint or mutation

If it touches student data, visit/incident records, inventory, or any account — write the audit log entry in the same change, not as a follow-up task. This isn't a "nice to have" logging layer; it's a named functional requirement (Project Plan, Section 5.1: "Audit logging of every login, submission, and approval across all modules").

## Don't confuse this with the two-stage incident flow

Emergency Response's Stage 1 → Stage 2 incident lifecycle uses the word "complete/incomplete" for a *different* concept (whether the record itself has all its fields filled in). Audit logging still applies at both stages — log the Stage 1 save and the Stage 2 completion as separate events, don't skip logging Stage 1 just because the record isn't "done" yet.

## Timestamps

Every audit log entry's timestamp must be a real one, captured at write time — this is the same standing rule as `AGENTS.md`'s general "Timestamps" section, just applied to data the system itself is producing rather than to documentation.
