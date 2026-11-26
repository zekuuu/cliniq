---
name: cliniq-action-menu-patterns
description: Apply when a CLINIQ table row, list row, card, detail page, or header has several secondary actions. Keeps the primary and protected actions visible while one shared accessible kebab menu holds the rest.
---

# CLINIQ Action Menu Patterns

Use alongside `cliniq-interactive-states`, `cliniq-button-feedback-patterns`, `cliniq-modal-patterns`, `cliniq-toast-patterns`, `cliniq-display-privacy`, and `cliniq-audit-trail`. The shared component is `frontend/src/components/ui/ActionMenu.tsx` (ADR-095).

## When to use

- Keep one primary next-step action visible. Never menu Save/Submit, Cancel, Back, a modal footer, an emergency-flow action (Stage 1, Escalate to incident, Complete Stage 2, Complete Incident), or Print / Save as PDF.
- When a row or card has a primary action plus multiple secondary actions, put the secondary actions in an action menu while the direct primary action and record link remain clear. A page header keeps its primary plus at most one ordinary secondary action; from three actions, menu the rest. A single action stays visible. A record-opening link in an identifying cell does not need a duplicate View/Open action; place a single clinical next step in its relevant status cell when that reads more clearly.
- If a row or card already has a clickable title, remove a separate View/Open button. Otherwise keep one direct View/Open link. The Visit and Incident Log date/time opens the record; the Student Profile letter date range opens its letter (ADR-095).
- Hide actions that the role never has. When an action is temporarily unavailable because of record state, show it disabled with a short reason in the item description. Do not render an empty menu.
- Put destructive or hard-to-reverse actions last, after a divider, in error colour. Keep the original confirmation dialog, toast and Undo, and audit behavior.

## Shared component

- Use `ActionMenu` instead of a page-local copy or a selection `Select`. The trigger's `label` is its accessible name and tooltip: “More actions for <row label>”. Follow `cliniq-display-privacy` for that label.
- The vertical ⋮ trigger is a borderless ghost icon button at the right end with solid dark-green dots, slightly more space between them, and visible hover and focus states. Match adjacent 40px buttons on desktop; keep a 44px square touch target below the desktop breakpoint and never let a flex row shrink it. This is the explicit touch-target exception to the small glyph-sized icon-action rule in `cliniq-interactive-states`.
- The panel reuses `DROPDOWN_PANEL` and option-row styling from `dropdownClassName.ts`, aligns to the right, flips inside the viewport, and stays open only while in use. Each item has a small decorative `Icon` plus a text label. This differs from the icon-free *selection* dropdown in `cliniq-dropdown-patterns`: action labels describe different operations rather than mutually exclusive values.
- The trigger has `aria-haspopup="menu"` and `aria-expanded`; the panel has `role="menu"`, its items `role="menuitem"`. Arrow keys, Home/End, Enter/Space work. Escape returns focus to the trigger; outside click, Tab and selection close it. Do not trap focus. No type-ahead is needed.
- Navigation uses `href` and renders a real router link, preserving open-in-new-tab. Mutations use `onSelect`. An asynchronous action closes the menu and holds the trigger busy until it finishes. Keep keyboard shortcuts active and show the hint in the item.
- Hide the trigger and panel in print. Check desktop and phone widths with Chromium; the panel stays inside the screen and items remain touch-sized.
