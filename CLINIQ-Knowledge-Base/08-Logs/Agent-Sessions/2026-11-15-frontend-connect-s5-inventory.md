Date/Day/Time: Sunday, November 15, 2026 — 23:23 PHT (phase finished at 18:30 PHT, real clock)
Agent: Claude Code (Opus 5.5)
Task: Connect the frontend to the API, S5 — inventory
Status: Completed
Prompt/Request: Zean pasted `Prompt-Connect-Frontend-To-API-Nov15.md` (Sunday, November 15, 2026): connect the frontend to the real Laravel API module by module, behind a global and per-module mock/API switch, all phases in order (S0 to S8), the mock layer untouched, nothing committed. Then "make it now" (create the branch).
Files Modified: frontend/src/lib/api/http/inventory.ts, inventory.test.ts; lib/data/index.ts
Changes Made: "Commonly used for" labels mapped to complaint-type ids and back; blank tags dropped (the browser check found the form sends `""`); every refusal as `StockRuleError`.
Reason: ADR-080 (Zean's three answers; the switch, its precedence and dependencies; the mock stays).
Testing Performed: browser: list, item form labels, save, a visit with a medicine and its entered-in-error (stock 12, 11, 12); 1234 tests.
Known Issues: See `08-Logs/Connect-Frontend-Nov15/NOTES.md` (FOLLOW-UPS) and `REPORT.md`.
Next Steps: Zean commits in the groups listed in `REPORT.md`.
