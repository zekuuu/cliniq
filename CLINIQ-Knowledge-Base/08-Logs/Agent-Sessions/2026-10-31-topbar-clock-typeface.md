# Top-bar clock typeface

Date/Day/Time: Saturday, October 31, 2026 — 12:30 PHT
Agent: Codex
Task: Refine the type styling of the top-bar date and time.
Status: Completed
Prompt/Request: "for date and time in topbar, change its font into professional font and a bit tall it looks like a date and time font"
Files Modified: `frontend/src/layouts/AppShell.tsx`, `frontend/src/layouts/AppShell.test.tsx`, `CLINIQ-Knowledge-Base/03-Design/Design-System.md`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`, this session log.
Changes Made: Set the shared live clock to a monospaced, tabular-numeral treatment at 16px, stepping to 18px at `lg`; kept its date/time format, once-per-second updates, contrast color, and responsive visibility unchanged. Documented the focused top-bar typography exception and added a regression assertion.
Reason: A monospaced face makes a changing operational timestamp easier to scan and gives it the requested professional clock-like character without adding a font dependency or altering the shell layout rules.
Testing Performed: Targeted `AppShell` unit test to verify the clock typography classes; frontend typecheck and production build pending at the time this entry was written.
Known Issues: None found. No existing reusable top-bar-clock component skill applies; this is a single application-shell element, not a cross-page reusable component pattern.
Next Steps: None.
