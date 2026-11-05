# ADR-061: A large stock write-off needs a written note

**Date:** Sunday, November 1, 2026 — 13:03 PHT
**Status:** Accepted on the recommendation in `Prompt-Frontend-Cleanup-Code-Nov1` D1, which Zean ran on Sunday, November 1, 2026; Zean may overrule it. Closes the open question from panel review IV-7.

**Amended by [ADR-068](ADR-068-Adjust-Stock-Note-Is-Optional.md):** the note is optional; a large write-off is still flagged in the Audit Log.

## Context
Large negative adjustments are where shrinkage hides. Adjust Stock already asked for a reason, but a preset reason explains little.

## Decision
A removal of 25% or more of the item's whole quantity on hand, or one that leaves the item at zero, needs a written note of at least 20 characters. Its audit entry is marked "Large write-off" and never holds the note. The 25% is the setting `largeWriteOffPercent` (`large_write_off_percent`). No second person is required; the Admin sees the flagged entries in the Audit Log.

## Alternatives Considered
- **A second person or the Principal's acknowledgement:** not chosen. There is one nurse, and ADR-060 keeps the Principal's acknowledgement on paper.

## Consequences
- Disposing of the last expired batch of an item now needs the note too.
- The data layer refuses the Admin on Adjust Stock, as the screen already did.
- There is no settings screen yet, so the 25% changes in the data only, like the other numeric settings.
- Session: [2026-11-01-frontend-cleanup-part-2](../08-Logs/Agent-Sessions/2026-11-01-frontend-cleanup-part-2.md)
