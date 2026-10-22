# ADR-022: Shell Navigation Below the `lg` Breakpoint Is In Scope

**Date:** Wednesday, October 14, 2026 — 17:59
**Status:** Accepted (agent-decided, pending team review)
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.

## Context
Below `lg` (1024px) the shell hides its sidebar. Staff reach shell screens on a phone from the QR
quick actions (New Visit, Incident Entry, Dispense, the student profile). Before October 1 those screens
had no menu, so only the browser's Back button left them. On October 1 an agent added a role-aware
"Open navigation" menu to the top bar. The Issues-and-TODOs entries asking "Is mobile shell navigation in
scope?" stayed open because no decision recorded it, and the team asked an agent to decide.

## Decision
Mobile shell navigation is in scope, and the built menu stays:
- The top bar's "Open navigation" button opens the shared `Modal` (focus trap, Escape, focus returns to
  the button) listing exactly the signed-in role's sidebar entries, as 44px touch targets.
- The menu ends with the sidebar footer's Privacy Policy link and Report an Issue button, which phones
  could not reach before.
- A role with no menu entries gets no menu button. The PE/Sports Instructor sees the shell only on the
  shared privacy page (ADR-003) and previously got an empty "Navigation" dialog there.

## Alternatives Considered
- **Out of scope (remove the menu).** Leaves QR quick-action screens with only browser Back, which
  `Design-System.md` ("keep important functionality easy to discover") argues against.
- **A bottom tab bar.** A new pattern for up to 11 Staff entries; the dialog reuses the shared `Modal`.
- **A slide-in drawer.** Same content with new animation and focus code; no usability gain over the
  existing dialog.

## Consequences
- Navigation entries stay defined once (`layouts/navigation.ts`) and show in both the sidebar and the
  phone menu, so role visibility can't drift between them.
- `cliniq-sidebar-patterns` holds the rules. Canonical documents (Frontend Design Reference, navigation)
  need the matching sentence once the team accepts this.
