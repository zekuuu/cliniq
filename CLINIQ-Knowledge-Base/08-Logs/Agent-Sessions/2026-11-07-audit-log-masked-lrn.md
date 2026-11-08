Date/Day/Time: Saturday, November 07, 2026 — 11:54 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Mask the LRN on the Audit Log screen; keep it full on the printout
Status: Completed
Prompt/Request: Zean, in chat: "also censor LRN in audit log", then "only show in audit log print".

Files Modified: `frontend/src/features/audit-log/AuditLogPage.tsx`, `frontend/src/features/audit-log/AuditLogPage.test.tsx`, `frontend/src/features/print-documents.test.tsx`, `.claude/skills/cliniq-display-privacy/SKILL.md`, notes on ADR-040 and ADR-044, `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`.

Changes Made:
- The Record column on screen shows "LRN" plus the shared masked `<Lrn>` (eight dots and the last four digits). Screen readers hear "LRN ending in 1234". This replaces the full LRN of R33 (November 3).
- The Audit Log printout is unchanged: it shows the full LRN, never the name.
- Skill `cliniq-display-privacy`: the Audit Log entries changed from full LRN on both to masked on screen and full on the printout. Old: "The Audit Log screen and printout show the full LRN". New: "The Audit Log screen shows the masked LRN and its printout the full LRN".

Reason: Zean, in chat, Saturday, November 7, 2026.

Testing Performed: The Audit Log tests now expect the masked LRN on screen and not the full digits. The link's name is "LRN ending in NNNN". The Audit Log print test now checks that a student record's full LRN is printed. Audit Log and printout tests: 22 passed, 1 failed (23). The failure is the existing Student Health Record test from calendar commit `1b50a113`. Typecheck: 0 errors.

Known Issues: none new.

Next Steps: none.
