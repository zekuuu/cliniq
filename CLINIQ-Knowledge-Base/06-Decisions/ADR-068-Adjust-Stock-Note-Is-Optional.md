# ADR-068: The Adjust Stock note is optional

**Date:** Thursday, November 05, 2026 — 21:36 PHT
**Status:** Accepted (Zean, in chat: "Optional note, shorter", then at Thursday, November 05, 2026 — 21:42 PHT: "Make notes in adjust stock only optional"; first recorded Thursday, November 05, 2026 — 21:36 PHT: "Optional note, shorter"). Amends ADR-061.

## Context
The nurse found the 20-character note a chore when disposing of expired medicine: the reason "Expired - disposed" already says why, yet a large write-off (25%+ of the item, or down to zero) still needed a sentence. ADR-061 named this case on purpose.

## Decision
**The Adjust Stock note is always optional**, for every reason including Other, and for a large write-off. The reason says why. A large write-off (25%+ of the item, or down to zero; ADR-061's setting) is still marked "Large write-off" in the Audit Log, and the form still says so. The data layer no longer refuses a missing or short note; `LARGE_WRITE_OFF_NOTE_MIN` is removed.

## Alternatives Considered
- **A 5-character minimum:** the first version of this ADR, earlier the same evening, replaced at Zean's request ("Make notes in adjust stock only optional").
- **No note only for "Expired - disposed" on an expired batch:** not chosen.
- **Keep 20 characters (ADR-061):** not chosen; too much friction for routine disposal.

## Consequences
- An adjustment may carry no explanation beyond its reason; the Admin still sees each flagged large write-off. Reason Other with no note says nothing about why.
- Backend: the adjustment endpoint accepts an empty note for every reason (API contract, Data Dictionary), on the `backend` branch. The seed check that "other" needs a note is removed.
- The canonical Modules & Features document still says a note is required (DOC entry).
- Session: [2026-11-05-shorter-write-off-note](../08-Logs/Agent-Sessions/2026-11-05-shorter-write-off-note.md), [2026-11-05-disposition-colour-optional-stock-note](../08-Logs/Agent-Sessions/2026-11-05-disposition-colour-optional-stock-note.md)
