# ADR-059: A student's emergency contact is optional at saving

**Date:** Sunday, November 1, 2026 — 12:01 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 1, 2026; the time of his message was not recorded). Changes the "at least one is required" line of Module 2 and the "stay required" wording kept by ADR-054.

## Context
Add/Edit Student refused to save without a complete first emergency contact, though the contact is often filled in later. Staff records already saved without one (ADR-051).

## Decision
A student saves with no emergency contact. A contact that is started must still be complete. A record with no contact stays flagged Incomplete and stays in the Incomplete Records queue, so the gap is followed up.

## Alternatives Considered
- **Optional and no longer flagged:** not chosen. Parents are reached only through these contacts (ADR-054), so a missing one must stay visible.

## Consequences
- The required marks on the first contact appear only once it is started (ADR-051).
- An incident on such a student starts its call on "Other", which already exists for a student with no contact.
- The backend validates the same way.
- **Canonical documents need updating:** the emergency-contact line in Modules & Features.
- Session: [2026-11-01-frontend-cleanup-part-1-missed-row-and-contact](../08-Logs/Agent-Sessions/2026-11-01-frontend-cleanup-part-1-missed-row-and-contact.md)
