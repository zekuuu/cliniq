Date/Day/Time: Sunday, November 8, 2026 — 22:06 PHT
Agent: Claude Code (Opus 5.5)
Task: Lower the account lockout and warn before it happens
Status: Completed
Prompt/Request: "for account lock-out, make it lower and since it doesnt need highest security. Then add like your account will be lock out after 3 more attempts, 2, 1". Asked which part to lower; Zean chose a 5-minute lock, keeping 5 attempts.
Files Modified:
- frontend/src/lib/mock-db/api.ts — `LOCKOUT_ATTEMPTS` (5) and `LOCKOUT_MINUTES` (5); one `recordFailure` shared by sign-in and password recovery; `MockAuthError` and `RecoveryError` carry `remaining`.
- frontend/src/features/auth/lockMessage.ts — `withAttemptsLeft`; the fallback lock text uses `LOCKOUT_MINUTES`.
- frontend/src/features/auth/LoginPage.tsx, ForgotPasswordDialog.tsx — append the attempts-left sentence.
- frontend/src/features/legal/PrivacyPolicyPage.tsx — "5 minutes".
- frontend/src/lib/mock-db/auth.test.ts, frontend/src/features/backup/AccessAndBackup.test.tsx
- ADR-015 (amended), ADR-073, Non-Functional-Requirements, Module-Overview, Audit-Coverage, Backend-Readiness-Checklist, Frontend-Loop-Engineering, ERD, Data-Dictionary, Reference-Schema.sql
Changes Made: The lock lasts 5 minutes instead of 30, still after 5 failures in a row. With 3, 2 or 1 attempts left, the error adds "Your account will be locked after N more failed attempts." (singular for 1). This shows at sign-in and at every Forgot password step that counts toward the lockout. The audit summary reads "Account locked for 5 minutes after 5 wrong passwords (…)".
Reason: One nurse on one LAN-only workstation; a 30-minute lock cost more clinic time than it bought in security.
Testing Performed: `tsc --noEmit` clean. Full suite 1176 of 1177 under load; the one failure (LettersAndVisitsDecisions, a 5 s timeout, unrelated) passed 15 of 15 on rerun. auth.test.ts now checks `remaining` 4→1 and the 5-minute lock.
Known Issues: The canonical CLINIQ_Project_Plan.md and CLINIQ_Modules_and_Features.md still say "30-minute lock"; they need updating by the team.
Next Steps: Update the canonical documents. The backend's `lockout_minutes` setting should default to 5 and return the attempts left.
