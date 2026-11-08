Date/Day/Time: Saturday, October 03, 2026 — 02:26 PHT
Agent: Claude Code (Opus 5.5)
Task: Add field icons and a show-password control to Login, via the shared Input.
Status: Completed
Prompt/Request: "It still seems missing, like a user icon and lock icon for password and able to show password, what else?" Follow-up to `2026-10-03-login-backdrop-and-demo-accounts.md` and `2026-10-03-login-backdrop-photo-and-blur.md`.
Files Modified:
- frontend/src/components/ui/Input.tsx
- frontend/src/components/ui/Input.test.tsx (new)
- frontend/src/components/icons/Icon.tsx
- frontend/src/features/auth/LoginPage.tsx
- .claude/skills/cliniq-input-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
Changes Made:
- Built into the shared `Input` rather than on Login only, because password fields recur (Login, Force Password Change ×2, future account screens), and `cliniq-input-patterns` forbids page-local input styling.
- `icon?: IconName`: a decorative leading icon in `text-secondary` (#616161, which passes the 3:1 non-text contrast; `text-muted` would not), with the field padded to `pl-9`.
- Every `type="password"` field gets a 32px eye/eye-off toggle inside its right edge:
  - Named "Show password", with `aria-pressed`, `aria-controls`, and `type="button"`, so it never submits.
  - Has a pointer cursor and a `surface` hover tint per `cliniq-interactive-states`.
  - Is disabled with the field.
  - Edge's native `::-ms-reveal` eye is hidden, so the shared workstation never shows two eyes.
- Inputs with neither option render with no wrapper, exactly as before.
- New icons `lock`, `eye`, `eyeOff` (hand-drawn, in the existing inline set; no dependency).
- Login: Username uses `icon="user"`, Password uses `icon="lock"`. Form logic is unchanged.
- Skill change (old → new): `cliniq-input-patterns` had no guidance on icons or password reveal; it now documents the optional leading icon (used where it helps recognition, not by default) and the automatic reveal on all password fields. As a consequence, Force Password Change's two password fields gained the toggle with no edit to that page.
Reason: The requester asked for user/lock icons and a way to show the password. The reveal also lets someone catch a typo before a failed attempt counts toward the 5-attempt lockout.
Testing Performed:
- Typecheck passed; full Vitest suite: 51 files, 228 tests passed. New `Input.test.tsx` covers:
  - The reveal toggle switches the type and keeps the value.
  - `aria-pressed` and `type="button"` are set.
  - A plain field gets no toggle or icon.
  - The leading icon is `aria-hidden`.
- Playwright MCP on the Vite dev server (1440×900):
  - The icons and toggle render as intended.
  - Clicking the toggle reveals the password (pointer cursor).
  - Pressing Enter in the revealed field submits and lands `demo.nurse` on Clinic Overview.
  - `demo.pe2` reaches Change Your Password, which shows 2 toggles.
  - No console errors or warnings; test storage was cleared afterwards.
Known Issues: None new.
Next Steps: The requester asked "what else?". Suggestions were offered but not built: a Caps Lock warning, focusing Username on load, and a "Forgot password?" help line. They await the requester's choice.
