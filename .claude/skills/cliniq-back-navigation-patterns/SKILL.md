---
name: cliniq-back-navigation-patterns
description: Apply when adding or changing a CLINIQ screen, route, form, dead-end state (not found, load error, empty state with no next step), or a link that drills into a list. Decides whether the screen gets a Back control, where it goes, what it says, and keeps every Back on the one shared `BackButton`.
---

# CLINIQ Back Navigation Patterns

Use this with `cliniq-interactive-states` (hover, cursor, focus) and `cliniq-display-privacy` (labels). Decided in ADR-024.

## When a screen gets Back

- **Yes:** every child, detail, form, and flow-step screen (anything reached from another screen); every shell-free screen that is not the viewer's home (QR Lookup for Staff, Emergency Response, the Instructor's read-only Student Profile); every dead end (Not Found, load-error and "not found" states, an empty state with no next step); Privacy Policy.
- **No:** top-level screens the sidebar reaches (Dashboard, Student List, Visit Log, Incident Log, Inventory, Follow-Ups, Reports, Audit Log, User Management, Backup), Login, and a role's home screen (Dashboard; QR Lookup for the Instructor, where Log out stays on the screen).
- **Drill-through exception:** a top-level list shows Back only when a drill-through link opened it. Drill-through links pass `DRILL_THROUGH_STATE` (`hooks/useGoBack.ts`) as router state: the shared `TitleLink` and `ListItemLink` do it already, and so does the Dashboard calendar's "View visits". The list renders `<BackButton fallback={paths.dashboard} drillThroughOnly />`. Opened from the sidebar or a URL, it shows nothing.
- **In-page drill-ins** that swap content without changing the route get a way back to the previous view: Visit Details in edit mode passes `onBack={cancelEdit}` (Back = Cancel, back to the read view). Dialogs (the calendar day panel) already have Close/Cancel and need no Back.

## Where it goes and what it does

- **History by default:** `<BackButton fallback={...} />` goes back in history when the user came from another screen in the app, and to `fallback` when the screen was the first one opened (bookmark, new tab, refreshed direct link). Back never leaves the app. Shared logic: `useGoBack` (also used by `useCancelNavigation`).
- **Role-aware fallback:** the fallback must be a screen the viewer's role can open (route `roles` in `routes/AppRoutes.tsx`, ADR-003). Use `homePathFor(role)` from `routes/paths.ts` when the screen is shared by roles. The PE/Sports Instructor's Student Profile falls back to QR Lookup, never `/students`. Never grant access to make a Back work; leave Back off and record why instead.
- **Forms:** Back and Cancel are the same action: `<BackButton onBack={cancel} />` with `cancel` from `useCancelNavigation`, so Back never saves or submits and asks "Discard unsaved changes?" exactly when Cancel does. In loading and error states (no form yet) use `fallback` with the same route.
- **No loops:** a save that moves to another screen uses `replace` (Edit Student → profile; New Visit's "Review excuse letter" link), so Back can't reopen a submitted form.

## Label

- History target: the visible text is plain **"Back"**, because history can land anywhere.
- "Back to <screen>" only for a fixed target, through `to` and `label` (a `Link`): "Back to Sign In", "Back to QR lookup".
- The visible text is the accessible name (no `aria-label`). Never a student name or Student Number.

## Look and placement

- First in the page content, above the page header card and before the `h1` in reading order; never in the sticky shell header.
- `quiet` (default): text control with a left chevron, `text-secondary`, turning `brand-green-dark` and underlined on hover, flush with the card edge. It must not compete with the page's primary action; a form's Cancel stays at the bottom.
- `prominent`: the neutral outlined button, for shell-free phone screens where Back is the main way out (QR Lookup, Emergency Response, the Instructor's profile and privacy page).
- 44px tall below `sm`, 36px from `sm` up; visible focus ring (global `:focus-visible`); always `print:hidden`.
- Shown while the page loads: render Back inside the page skeleton, outside its `aria-hidden` placeholders, so a slow screen can be left and nothing jumps when data arrives. Also render it in load-error and "not found" states.

## Shared implementation and tests

- `frontend/src/components/ui/BackButton.tsx` (exported from `components/index.ts`), logic in `frontend/src/hooks/useGoBack.ts`. Don't hand-roll a Back on a page.
- `frontend/src/routes/BackNavigation.test.tsx` walks the real route table for every role: each route must render Back, or appear in its `NO_BACK` allowlist with a one-line reason, and Back opened directly must land only on routes that role can open. A new route fails this test until it has Back or an allowlist entry.
- `frontend/src/features/back-navigation.test.tsx` covers no-loop save flows and Back/Cancel parity.
