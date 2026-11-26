# ADR-096: Light semantic backgrounds for result toasts

**Date:** Thursday, November 26, 2026 — 22:41 PHT
**Status:** Accepted by Zean in the request: “the white background of the toast match the system, so it becomes kinda hard to notice. change it with respective color, like for error it must be red but the color must be light colors.”
**Amends:** [ADR-083](ADR-083-Action-Feedback-In-Sonner-Toasts-Forms-Reset-And-Scroll-To-Top.md), November 19 white-card note. The original note remains as history.

## Decision

Result toasts use the existing light semantic fills: `brand-green-fill` for success, `error-fill` for error, `warning-fill` for warning, and `info-fill` for info. Their borders and shrinking bottom lines use the matching semantic accents. Dark text, the existing outline icons, position, timing and interactions remain as specified in ADR-083 and ADR-089. Loading toasts stay neutral until the result is known.

## Reason

The white cards blend into the white system background, making feedback easy to miss. The light fills distinguish each meaning without using a saturated card background.

## Consequences

Update the shared toast skill and the knowledge-base Design System. The canonical Frontend Context Brief and Frontend Design Reference still need the same visual rule at their next document review; track that as an open documentation item.
