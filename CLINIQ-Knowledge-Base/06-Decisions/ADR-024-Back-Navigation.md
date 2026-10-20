# ADR-024: One Shared Back Control on Every Non-Top-Level Screen

**Date:** Wednesday, October 14, 2026 — 23:11
**Status:** Accepted (requested by Zean, project team; details agent-decided)
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 07:00):** the CLINIQ Student Number this ADR mentions was replaced by the LRN (ADR-028, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); lists show it masked. The rest of the decision stands.

## Context
The app had two Back links ("Back to Sign In", "Back to QR lookup"). Everywhere else, leaving a detail page,
form, report, or dead end needed the browser's Back button or the sidebar. Shell-free phone screens (QR
Lookup flows, Emergency Response, the Instructor's read-only profile) have no sidebar at all. Zean asked
for a Back control on every screen and situation where a user can get stuck, built once and used
consistently.

## Decision
- **One shared `BackButton`** (`frontend/src/components/ui/BackButton.tsx`), first in the page content,
  above the header card, before the `h1`. Never printed; 44px tall on phones; also shown while loading.
- **Where:** every child, detail, form, flow-step, dead-end (Not Found, load error, "not found", empty
  with no next step), and shell-free non-home screen, and Privacy Policy. **Not** on Login, a role's home
  screen, or top-level sidebar screens, except when a drill-through link (a Dashboard stat card, list
  title, list item, or the calendar's "View visits") opened the list: those links pass router state and
  the list then shows Back.
- **Target:** history back when the user came from another screen in the app; otherwise a fallback.
  **The fallback must be a screen the viewer's role can open** (e.g. the Instructor's Student Profile
  falls back to QR Lookup, never the Student List). A route-coverage test checks this for every role.
- **Label:** plain "Back" for a history target; "Back to <screen>" only for a fixed target. The visible
  text is the accessible name and never names a student or Student Number.
- **Forms:** Back runs the same shared Cancel (`useCancelNavigation`), including the unsaved-changes
  question (ADR-021). Saves that move to another screen use `replace`, so Back can't reopen a submitted
  form.

## Alternatives Considered
- **Back in the sticky shell header.** One place, but shell-free screens have no header, and it would sit
  far from the page it belongs to.
- **Always "Back to <parent>" links.** Predictable, but wrong when the user arrived another way (from QR
  Lookup or a profile), which is common on phones.
- **Back on top-level screens always, or never.** Always duplicates the sidebar; never strands a user
  who drilled in from the Dashboard. The drill-through rule shows it only when there is a place to
  return to.

## Consequences
- New screens must render `BackButton` or be added to the `NO_BACK` allowlist in
  `frontend/src/routes/BackNavigation.test.tsx` with a reason; the test fails otherwise.
- Rules live in `.claude/skills/cliniq-back-navigation-patterns/` and `03-Design/Design-System.md`
  (Navigation). The canonical Frontend Design Reference (navigation) needs the matching sentence.
