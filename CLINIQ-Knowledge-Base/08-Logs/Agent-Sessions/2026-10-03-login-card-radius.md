Date/Day/Time: Saturday, October 03, 2026 — 02:47 PHT
Agent: Claude Code (Opus 5.5)
Task: Reduce the Login card's corner rounding.
Status: Completed
Prompt/Request: "can you reduce the round of the card"
Files Modified:
- frontend/src/features/auth/LoginPage.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Login card radius 12px → 8px through `rounded-md!` on the Login `Card`. 8px is the existing `--radius-md` token, already used by the card's inputs and Sign In button, so no new radius value was introduced (Design-System.md, "one consistent set of radius values").
- The important modifier is needed because the shared `cn` helper only joins class names and doesn't resolve conflicts, so `rounded-lg` (from `CARD_SURFACE`) and `rounded-md` would otherwise compete on CSS order. A one-line comment at the call site explains the override.
- Scoped to Login: the request named "the card" on the screen being redesigned, so the shared `Card`/`CARD_SURFACE` (12px on every other screen) is unchanged.
Reason: The requester wanted a less rounded card.
Testing Performed: Vitest (`src/features/auth`, `App.test.tsx`): 17 tests passed. Playwright MCP at 1440×900: computed card radius 8px, matching the input's 8px; screenshot checked.
Known Issues: Login's card radius now differs from other cards (12px). If the tighter radius is wanted system-wide, change `CARD_SURFACE` in `frontend/src/components/ui/Card.tsx` instead and drop the Login override.
Next Steps: None.
