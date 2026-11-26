# ADR-088: Remove emergency-contact verification

**Date:** Wednesday, November 25, 2026 — 10:33 PHT
**Status:** Accepted (Zean, Tuesday, November 24, 2026: “drop the verification, we don't want to verify the contact information now as they will do it in personal not in the system”; scope and data-removal confirmation, Wednesday, November 25, 2026.)
**Amends:** the contact-verification Undo entry in ADR-085. Backup verification is unchanged. The originating request attributes the old routes to ADR-082, but the live ADR-082 is the unrelated server-side paging decision; this ADR does not amend it.

## Context

Student and staff emergency contacts carried a verification state, routes, audit entries and—on students—a verification-history table. The clinic will verify contact information in person, outside CLINIQ, so storing a system verification claim is misleading and adds work without value.

## Decision

1. Remove verification only from student and staff emergency contacts. Contacts retain their name, relationship, phone, primary ordering and use in notification attempts.
2. Remove the verification controls, API routes, client methods, mock field, related audit actions and the student verification-history table.
3. Migrate existing development data by permanently dropping the contact verification columns and `emergency_contact_verifications`; no report or export retains the old values.
4. Parent-notification attempts continue to record the selected/contacted person and outcome only. An unreachable contact does not change a contact state or create a re-verification task.
5. Keep Backup Verification, including its status, audit record and UI, unchanged.

## Alternatives Considered

- Hide the contact verification UI while retaining the fields and routes. Rejected: it would preserve unused, misleading data and an API capability the clinic does not use.
- Retain historical verification records. Rejected by Zean: no report or export needs the old values.
- Extend the removal to backup verification. Rejected: backup verification is a separate operational control.

## Consequences

- Contact verification is no longer represented in the database, API, mock mode, print/profile displays or audit log.
- Existing saved contact-verification data is intentionally deleted when the migration runs.
- The groupmate-owned SRS/Project Plan statements that still require contact verification need her separate update; they are not edited in this run.

## Canonical documents to update

The groupmate-owned Project Plan/SRS and their Markdown copies that describe emergency-contact verification require a matching approved update. They are deliberately not changed here.
