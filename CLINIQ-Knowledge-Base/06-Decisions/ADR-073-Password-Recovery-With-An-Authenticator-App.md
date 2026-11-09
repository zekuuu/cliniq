> **Amended Saturday, November 07, 2026 — 13:04 PHT:** Zean asked: "forgot password should validate the username first before asking the 6 digit code". When offered the choice, Zean picked "Check the account first" over keeping one vague message. Forgot password now asks for the username alone and checks it first. It says "No account with that username.", "This account is disabled. Ask the Administrator." or "This account has no authenticator app set up. Ask the Administrator to reset your password." Each failure counts toward the sign-in lockout. Only then does it ask for the code. A wrong code still gets the general message. **Accepted risk:** anyone at the clinic computer can learn which usernames exist and which can recover; the lockout limits guessing. Session: [2026-11-07-forgot-password-code-boxes-modal-hover](../08-Logs/Agent-Sessions/2026-11-07-forgot-password-code-boxes-modal-hover.md)

# ADR-073: Password recovery uses an authenticator app; the email reset of ADR-048 is replaced

**Date:** Saturday, November 07, 2026 — 06:37 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026 — 04:20 PHT: "password recovery by authenticator app ... which works offline. It is not 'Sign in with Google'"). Replaces the email password reset of [ADR-048](ADR-048-Admin-Sign-Out-Acknowledge-Email-Reset-And-Logging-Record-Opens.md). **Built** the same day ([Part 4 session](../08-Logs/Agent-Sessions/2026-11-07-consultation-part-4-authenticator-recovery.md)).

## Context
ADR-048 planned an email reset "when the internet is available". CLINIQ runs on the clinic computer over the school LAN, usually without internet (ADR-029), so an email reset would often not work, and accounts carry no email address. The Admin's reset of a Staff password covers the Staff, but nobody can reset the Admin.

## Decision
1. **Set up (account menu, every role):** "Set up authenticator app" opens a dialog with a QR code (`otpauth://totp/CLINIQ:<username>?secret=…&issuer=CLINIQ`, 30-second, 6-digit codes) and the setup key to type by hand. The first code confirms it; then 8 one-time recovery codes are shown once, with Copy and Print, and the dialog does not close until "I have saved the codes" is ticked. Once set up, the item reads "Authenticator app: set up" and offers Replace and Turn off, each after the current code or a recovery code. The secret is never shown again.
2. **Forgot password (Login):** username, then the 6-digit code or a recovery code (spent on use), then a new password by the Change Password rules (8 characters, not one of the last 5). A wrong username, a wrong code, an account with no authenticator and a disabled account all get one message: "The code did not work, or the account is not set up for recovery. Ask the Administrator to reset your password." Failures count toward the sign-in lockout (5 failures, 5 minutes, ADR-015), with the same lock message. A reset clears a pending forced password change.
3. **Sign-in is unchanged:** username and password, no code at sign-in.
4. **Audit:** "Set up authenticator", "Replaced authenticator", "Turned off authenticator", "Reset password with authenticator", "Used a recovery code" and the usual "Changed password", by action and user only, never a code, secret or password.
5. **Storage:** the real backend stores the secret **encrypted** and the recovery codes hashed with a **slow** password hash. The mock stores the secret plain and the codes as SHA-256, browser-only.
6. The **Admin should set up the authenticator and keep the recovery codes**, because nobody else can reset that account; the dialog says so to the Admin.

## Alternatives Considered
- **Email reset (ADR-048):** needs internet and an email address on every account.
- **Admin reset only:** leaves the Admin with no recovery at all.
- **"Sign in with Google":** needs internet and sends sign-ins to Google.

## Consequences
- No email address is needed on accounts; the "email field" and "email reset" follow-ups are dropped.
- The backend needs the authenticator fields and the recovery endpoints (hand-off note in the Part 4 session log).
- An Admin who never sets it up and forgets the password is locked out of administration; that risk is in the hand-off note and the Team Tasks.
