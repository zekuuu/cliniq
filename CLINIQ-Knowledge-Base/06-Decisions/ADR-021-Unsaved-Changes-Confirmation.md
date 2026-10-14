# ADR-021: Cancel Asks Before Discarding Unsaved Input

**Date:** Wednesday, October 14, 2026 — 17:59
**Status:** Accepted (agent-decided, pending team review)

## Context
The shared Cancel on entry and edit forms (`useCancelNavigation`, added in the October 11 fix sweep)
returned to the previous screen at once, so a mistaken click threw away everything typed: a half-written
visit, an incident's Stage 1, a new student record. Issues-and-TODOs asked whether entry forms should
confirm before discarding typed input, and the team asked an agent to make the call. `Design-System.md`
says to confirm an action that can't be undone from the screen it's on and to protect against accidental
destructive actions, but also not to interrupt harmless, reversible actions.

## Decision
Cancel asks "Discard unsaved changes?" **only when the form has unsaved input**. An untouched form, or
one whose input was just saved, leaves at once. The dialog is the shared `Modal`: "Keep Editing" (the
safe choice, focused on open) and "Discard Changes". It lives in the shared hook,
`useCancelNavigation(fallback, isDirty)`, so all seven forms that use it behave the same: New Visit,
Incident Entry (Stage 1 and Stage 2), Add/Edit Student, PE/Sports Referral, Add/Edit Inventory Item,
Dispense, and the User form. Each form passes its own dirty state (typed or chosen values that differ
from what was loaded or last saved).

## Alternatives Considered
- **Leave as is (no confirmation).** Fastest path, but one wrong click loses a clinical record being
  typed, which can't be recovered from the screen.
- **Confirm on every Cancel.** Adds a click to the normal "I opened this by mistake" path for no benefit.
- **Also block browser Back and sidebar links while dirty.** Better coverage, but the app uses a plain
  `BrowserRouter`, and React Router's navigation blocker needs a data router. That is a routing change,
  so it is logged as `LATER`.

## Consequences
- New entry or edit forms pass `isDirty` to `useCancelNavigation` and render the returned `discardDialog`
  (`cliniq-modal-patterns`).
- Leaving by browser Back, a sidebar link, or a keyboard shortcut still doesn't ask (`LATER`). Visit
  Details' in-page Cancel (it leaves edit mode, and doesn't use the hook) doesn't ask yet either (`LATER`).
- Canonical documents (Frontend Context Brief, Section 7, Modals & Confirmation) need the matching
  sentence once the team accepts this.
