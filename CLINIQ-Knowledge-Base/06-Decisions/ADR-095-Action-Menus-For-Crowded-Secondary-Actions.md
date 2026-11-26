# ADR-095: Action menus for crowded secondary actions

**Date:** Thursday, November 26, 2026 — 19:48 PHT  
**Status:** Accepted (Zean, Thursday, November 26, 2026)  
**Amends:** The action presentation in `cliniq-dropdown-patterns`, `cliniq-table-patterns`, `cliniq-page-header-patterns`, and the affected screen descriptions. ADR-085's Undo behavior, ADR-036's emergency escalation, ADR-038's Admin access and print restriction, and ADR-066's account menu remain in force.

## Request and answers

Zean: “turn those multiple non-primary buttons into kebab menu drop downs so it doesn't fill the screen or floods it. always ask me everything now, don't guess”. The attached prompt calls for one visible primary action, an action menu for crowded secondary actions, and no change to Save/Submit, Cancel, Back, modal footers, emergency actions, or visible Print / Save as PDF. Zean approved Phase A, approved adding the missing vertical ⋮ glyph to the existing icon set, and answered the two navigation-link questions and Phase B scope with “what do you think is best and recommended base on common UI/UX practices and principles” and “everywhere that can be applicable”.

## Decision

1. A table row or card with two or more actions uses the shared `ActionMenu` when the primary action and direct record link can remain easy to reach. A crowded page header keeps its primary action and at most one ordinary secondary action visible. The emergency actions, form and modal controls, Back, and Print / Save as PDF stay visible.
2. `frontend/src/components/ui/ActionMenu.tsx` is the one action-menu component. The trigger is a right-end, ghost, vertical ⋮ button with a 44px target, visible focus ring, tooltip, and “More actions for …” accessible name. The label follows the display-privacy rule. Items have a consistent icon and label; links remain real links. The menu uses the shared dropdown panel look, aligns right, flips to fit, supports keyboard navigation and close behavior, and does not print.
3. Destructive or hard-to-reverse actions appear last, after a divider where another action precedes them, in the error colour. Their existing confirmation, toast, Undo, and audit behavior remain with the original handler. The trigger shows busy feedback while an asynchronous action runs.
4. Inventory rows keep Restock directly available and replace the former Manage selection list with action items. User Accounts rows keep Edit visible and menu Enable/Disable and Reset Password. Sports Reports rows use their title link and menu Edit, Duplicate, and Archive/Restore. Calendar event rows keep Edit visible and menu Delete.
5. On the Visit Log, the date/time becomes the direct Visit Details link; a pending Review Letter link stays visible. On Student Profile letter rows, the date range becomes the letter link; View visit remains visible where present. These choices avoid a menu made only of navigation links.
6. Staff list headers keep Add and Incomplete records visible; Archive and Import List move to the menu. The Inventory header keeps Add Item and Usage history visible; Monthly inventory sheet moves to the menu. Student and Staff Profile headers keep visit and incident actions visible, and Student Profile keeps Print visible; Edit and Archive move to the menu for active records. Visit Details keeps Print, Escalate to incident, and Edit visible; Entered in error moves to the menu.
7. Admin read-only screens gain no write actions. The Admin's existing Archive link and disabled Print control remain visible. Single-action rows, Dashboard widgets, calendar navigation, form footers, modal footers, sidebar navigation, and the existing account menu stay as they are.

## Consequences

The same actions, routes, confirmations, toasts, Undo and audit calls are retained in mock and API modes. The menu is a set of actions (`role="menu"`), unlike an icon-free selection dropdown (`role="listbox"`). The new `cliniq-action-menu-patterns` skill is the standing cross-screen rule. Canonical Frontend Design Reference, Frontend Context Brief, and Modules & Features copies need review through the project's document workflow; the groupmate-owned Project Plan and SRS are not edited here.
