# ADR-090: Field labels do not activate controls

**Date:** Thursday, November 26, 2026 — 03:31 PHT
**Status:** Accepted (Zean: “everything, the issue is when I click the label, it focuses on the fields or input fields itself”).

## Decision

Clicking a visible field label does not focus, open, check or toggle its control. The rule covers text, date, dropdown, checkbox, radio and toggle fields. The direct control remains interactive. Native label associations stay in the markup so assistive technology and label-based test queries still identify fields. A shared capture handler prevents only the label's default activation. Upload zones expose a separate Browse files button.

## Consequences

This replaces the former whole-label checkbox/radio hit target and hover rule in the input and interactive-state skills. A screen-reader name remains available, while the pointer target for a checkbox or radio is smaller by the user's stated choice. The canonical Frontend Design Reference needs updating through the group's document review.
