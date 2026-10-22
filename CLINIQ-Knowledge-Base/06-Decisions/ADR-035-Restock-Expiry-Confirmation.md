# ADR-035: Restock expiry requires an explicit no-expiration confirmation

**Date:** Thursday, October 22, 2026 — 15:01 PHT
**Status:** Accepted. Extended to Add Item (the item's first batch) on Thursday, October 22, 2026 by panel review part 5 (IV-2, D10); session [2026-10-22-panel-review-part-5-inventory](../08-Logs/Agent-Sessions/2026-10-22-panel-review-part-5-inventory.md)

## Context

The Restock dialog accepted a blank expiration date and silently saved the received batch as having no expiration. Although some supplies genuinely have no manufacturer expiration date, this made a missed entry indistinguishable from an intentional safety decision and could let expiring stock bypass expiry alerts.

## Decision

1. A Restock batch requires an expiration date by default.
2. The clinician may instead select **This batch has no expiration date** only when the item genuinely has no manufacturer expiration date. That affirmative choice clears and disables the date picker so the two choices cannot conflict.
3. The inventory write layer rejects a blank expiration date unless that explicit confirmation is present, and rejects an expiration date paired with that confirmation.
4. The existing restock audit entry remains the accountability record for the submitted stock change.

## Alternatives Considered

- **Keep treating a blank date as no expiration.** Rejected: it makes accidental omission look intentional and weakens expiry safety checks.
- **Require a date for every item.** Rejected: certain supplies legitimately have no manufacturer expiration date.

## Consequences

- The Restock dialog gives Staff a deliberate, visible safety choice before stock enters the usable pool.
- The mock inventory layer enforces the rule as a data-integrity boundary, not just a UI convenience.
- The future Laravel Inventory API (Phase B8) must validate the same one-of expiration contract.
- The canonical Modules & Features document and its `01-Requirements` mirror were updated in the same change.
