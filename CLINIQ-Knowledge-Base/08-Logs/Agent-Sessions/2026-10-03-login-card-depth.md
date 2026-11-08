Date/Day/Time: Saturday, October 03, 2026 — 02:49 PHT
Agent: Claude Code (Opus 5.5)
Task: Give the Login card depth against the blurred photo backdrop.
Status: Completed
Prompt/Request: "Improve the card, it looks flat just on top of the blurred background"
Files Modified:
- frontend/src/index.css
- frontend/src/features/auth/LoginBackdrop.tsx
- frontend/src/features/auth/LoginPage.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Diagnosis: the card used `shadow-card`, which is tuned for panels on a white page (4–6% alpha), and the blurred photo is bright, close in value to the white card. So neither shadow nor contrast separated the two layers.
- `LoginBackdrop`: a `bg-brand-green-dark/45` tint layer above the photo. It renders only while the photo is shown, because the fallback gradient is already dark. It uses an existing brand token, so it adds no new hue; it's a contrast layer, not decoration (no glass effect or texture).
- `index.css`: a new `--shadow-overlay` token (`0 2px 6px -1px` at 12% + `0 24px 48px -12px` at 45%, the same near-black as the other two shadow tokens) for a surface floating over a photo or backdrop. It's a token next to `--shadow-card`/`--shadow-raised` rather than a one-off arbitrary value.
- `LoginPage`: the card uses `shadow-overlay!` (important modifier, like `rounded-md!`, because `cn` doesn't resolve the conflict with `CARD_SURFACE`'s `shadow-card`). The call-site comment covers both overrides.
Reason: The requester found the card flat on the blurred photo.
Testing Performed:
- Typecheck passed; Vitest (`src/features/auth`, `App.test.tsx`, `Input.test.tsx`): 20 tests passed.
- Playwright MCP at 1440×900:
  - With the photo: tinted backdrop, card clearly separated; computed `box-shadow` confirms the overlay token.
  - Photo forced to 404: the backdrop has no child layers (photo and tint both removed), the gradient shows, and the shadow is visible on it. The only console error was the forced 404.
Known Issues: Design-System.md doesn't list the shadow tokens, so the new token is documented only in `index.css`. If shadows are added to the design-system doc later, include `--shadow-overlay`.
Next Steps: None.
