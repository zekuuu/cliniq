# Agent Session — Login: Caps Lock warning, authorized-use notice, privacy link, attribution and version, lockout time

Date/Day/Time: Monday, October 19, 2026 — 00:58 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Add the five Login additions suggested in the previous turn.
Status: Completed
Prompt/Request: Zean: "Add all, now what can we add on the right screen? Wont it look flat or what". "All" means the five suggestions: (1) a Caps Lock warning, (2) a privacy notice link, (3) an authorized-use line, (4) "Powered by HealWare" and the app version, (5) the unlock time in the lockout message. The right-side question was answered in chat with options; nothing was built for it.
Files Modified:
- `frontend/src/features/auth/LoginPage.tsx`
- `frontend/src/features/auth/LoginPage.test.tsx`
- `frontend/src/features/legal/PrivacyPolicyPage.tsx`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/routes/AppRoutes.test.tsx`
- `CLINIQ-Knowledge-Base/03-Design/Design-System.md`
- `CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-19-login-notices-caps-lock-privacy.md` (this file)
Changes Made:
- **Caps Lock:** the Password field reads `getModifierState('CapsLock')` on key down and key up and shows the shared `Input` hint "Caps Lock is on." (linked by `aria-describedby`); it clears on blur. A field error replaces the hint, as for every `Input`.
- **Lockout:** one alert, "This account is temporarily locked after repeated failed attempts. Try again at 6:55 PM." (falls back to "in 30 minutes" without a time). The separate "Locked until …" line and its state were removed. The lockout rule itself (5 attempts, 30 minutes) is unchanged.
- **Bottom of the panel** (12px `text-secondary`, on the shared left edge): "Authorized clinic personnel only. Sign-ins are recorded." (successful sign-ins are audit-logged by the mock, `lib/mock-db/api.ts`), then "Privacy Policy · Powered by HealWare™ · v0.1.0" (`APP_VERSION`, the same source as the sidebar).
- **Privacy Policy signed out (security-relevant routing change):** `/privacy-policy` was behind Login, so a Login link would only bounce back. Signed out, that one path now renders the static policy without the shell, inside a `main`, with "Back to Sign In" (`BackButton` `to`, prominent). Every other route still redirects to Login (new test). The page holds no student data and makes no data calls; signed in, it is unchanged.
Reason: Zean asked for all five.
Testing Performed:
- `npx vitest run src/features/auth src/routes/AppRoutes.test.tsx src/features/legal`: 25 passed (new: Caps Lock hint, lockout time in one message, the bottom notices, Privacy Policy signed out, other routes still gated).
- `tsc -b` and `eslint` on the changed folders: clean.
- Playwright on Chromium 1228 (not Edge) at 1366×768, 1920×1080, 390×844 and 375×667: axe-core 4.13 no violations on Login and on the signed-out Privacy Policy; the privacy link is 0 px from the heading's left edge; no page scroll at 1366×768, 1920×1080 and 390×844; 375×667 now scrolls a little (phones may scroll). Privacy link → `/privacy-policy` → Back to Sign In → `/login`. Headless Chromium cannot switch a real Caps Lock on, so the warning is verified by the unit test only.
Known Issues: The policy text is still the unapproved draft (its own banner says so). The version shows `v0.1.0` from `package.json`.
Next Steps: Zean chooses a direction for the photo side (options given in chat).
