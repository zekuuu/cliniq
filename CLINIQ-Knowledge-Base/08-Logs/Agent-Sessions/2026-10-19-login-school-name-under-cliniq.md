# Agent Session — Login: school name moved under CLINIQ

Date/Day/Time: Monday, October 19, 2026 — 00:51 PHT (system clock)
Agent: Claude Code (Opus 5.5)
Task: Move "Mendez Christian Academy" from the bottom of the Login panel to under the CLINIQ wordmark.
Status: Completed
Prompt/Request: Zean, with a screenshot of the layout B Login: "I think better if we move MCA below CLINIQ, then what else can we add to the login screen in general".
Files Modified:
- `frontend/src/features/auth/LoginPage.tsx`
- `CLINIQ-Knowledge-Base/03-Design/Design-System.md`
- `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-19-login-school-name-under-cliniq.md` (this file)
Changes Made:
- The lockup is now the logo beside a stacked CLINIQ (28px bold, `brand-green-dark`) and "Mendez Christian Academy" (14px medium, `text-secondary`, 4px below), the same stacking as the sidebar's `BrandLogo`. Both lines start at the same x; the text block (49.5px) sits inside the 56px logo height.
- Removed the separate school line at the bottom of the panel. The form stays vertically centered in the remaining height.
- The suggestions for further Login additions were answered in chat only; nothing else was built.
Reason: Zean's preference: the school name reads as part of the identity, not as a stray line at the bottom.
Testing Performed: `npx vitest run src/features/auth` 6 passed; `tsc -b` clean; Playwright (Chromium 1228, not Edge) at 1366×768, 1920×1080 and 375×667: one line, no page scroll, axe-core 4.13 no violations. School line contrast `#616161` on white 6.19:1.
Known Issues: None new.
Next Steps: Zean picks which of the suggested Login additions to build.
