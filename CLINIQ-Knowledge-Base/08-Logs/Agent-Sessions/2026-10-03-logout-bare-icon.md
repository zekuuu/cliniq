Date/Day/Time: Saturday, October 03, 2026 — 03:02 PHT
Agent: Claude Code (Opus 5.5)
Task: Apply the bare-icon click treatment to the Log out icon.
Status: Completed
Prompt/Request: "apply the icon click to logout icon". Follow-up to `2026-10-03-bare-icon-actions.md` and `2026-10-03-icon-sized-click-area.md`.
Files Modified:
- frontend/src/layouts/AppShell.tsx (Log out button class only; this file also has another agent's uncommitted changes, which were left untouched)
- frontend/src/features/qr-digital-health-id/mobile/QrMobileHubPage.tsx (Log out button class only)
- .claude/skills/cliniq-interactive-states/SKILL.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Both Log out controls (the desktop shell header, and the mobile QR hub header the PE Instructor uses) drop the `hover:bg-error/10` box and the fixed `size-8`/`size-10` box. The button now wraps only the 16px icon.
- Hover darkens the red icon with `hover:brightness-75`. That's the same darkening approach as the destructive button's `hover:brightness-90`, slightly stronger because a thin 16px stroke barely shows a 10% change.
- The focus ring stays `ring-error` with offset 2, now `rounded-sm` around the glyph. When disabled (while logging out) there's no hover change, and `motion-reduce` removes the transition.
- `aria-label` ("Log out" / "Logging out"), `title`, and the logout behavior are unchanged.
- Skill: `cliniq-interactive-states` now states that a red `text-error` icon darkens on hover (`brightness-75`) rather than shifting to `brand-green-dark`.
Reason: The requester wants the Log out icon to look and feel like an icon, consistent with the password-reveal icon.
Testing Performed:
- Typecheck clean; Vitest (`App.test.tsx`, `src/layouts`, `src/features/qr-digital-health-id`): 4 files, 28 tests passed.
- Playwright MCP:
  - Desktop header (1440×900, demo.nurse) and mobile QR hub (390×844, demo.pe): both buttons are 16×16, `text-error` at rest, no background at rest or on hover, pointer cursor, and clicking logs out to `/login`.
  - The hover filter settles at `brightness(0.75)`. Early samples read `brightness(1)` only because the headless page wasn't advancing animation frames; the transition completed once it did.
Known Issues: As with the password-reveal icon, the 16px target is below WCAG 2.2's 24px minimum target size (2.5.8). That matters most on the mobile QR hub, which is used on a phone; it was previously 40px. Revisit if Instructors report mis-taps.
Next Steps: The other still-boxed icon actions (Modal ✕, mobile "Open navigation", DatePicker ‹ ›) remain unconverted pending the requester.
