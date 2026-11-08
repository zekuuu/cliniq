Date/Day/Time: Saturday, October 03, 2026 — 02:39 PHT
Agent: Claude Code (Opus 5.5)
Task: Make the password-reveal icon's click area the icon itself.
Status: Completed
Prompt/Request: "The click area must also feel like it's the icon not a button". Follow-up to `2026-10-03-bare-icon-actions.md`.
Files Modified:
- frontend/src/components/ui/Input.tsx
- .claude/skills/cliniq-interactive-states/SKILL.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Reveal toggle: removed the fixed `size-8` box and its centering. The `<button>` now wraps only the 16px icon, positioned `right-3` (12px), which mirrors the leading lock icon's `left-3`. The focus ring is `rounded-sm` with offset 2, so it outlines the glyph rather than a square.
- `cliniq-interactive-states` (old → new): the previous rule kept "an invisible hit area of at least 32px". Now the click area is sized to the icon, with no padding or fixed box, so the pointer cursor and hover begin only over the icon. It's still a real, labelled `<button type="button">`; "not a button" now means neither styled nor sized as one.
Reason: The requester wants a clickable icon to look and feel like an icon. The padded 32px area made the pointer cursor and hover start well outside the glyph.
Testing Performed:
- Vitest: `Input.test.tsx` and `src/features/auth`, 5 tests passed.
- Playwright MCP at 1440×900:
  - The toggle's box is exactly 16×16, with 12px gaps on both sides matching the lock icon, and vertically centered.
  - Space on the focused toggle reveals the password.
  - Hover recolors the icon `#616161` → `#035419`, with a pointer cursor.
Known Issues: A 16px target is below WCAG 2.2's 24×24px minimum target size (2.5.8, AA), and its spacing exception doesn't apply because the icon sits inside the input's own target. The requester's explicit choice was a click area that feels like the icon; this is noted so it can be revisited if the PE Instructor's phone use shows mis-taps. The three still-boxed icon actions from the previous session (Modal ✕, mobile "Open navigation", DatePicker ‹ ›) remain unconverted pending the requester.
Next Steps: Convert those three if the requester confirms.
