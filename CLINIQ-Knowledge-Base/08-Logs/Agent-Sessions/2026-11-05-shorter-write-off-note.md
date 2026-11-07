Date/Day/Time: Thursday, November 05, 2026 — 21:36 PHT
Agent: Claude Code (Opus 5.5)
Task: Make the large write-off note less of a chore (ADR-068)
Status: Completed
Prompt/Request: Screenshot of Adjust Stock (25 expired sachets, reason "Expired - disposed", Note "n/a" refused): "also here naka important ung note (ang hirap niya kasi need pa na iexplain then 20 character eh magdispose lng nmn ako ng gamot which is nakaindicate na ung dispose or expired)." ADR-061 named this case, so the agent asked; Zean chose "Optional note, shorter" (keep a note for every large write-off, lower the minimum).
Files Modified:
- frontend/src/lib/mock-db/api.ts (LARGE_WRITE_OFF_NOTE_MIN 20 → 5), frontend/src/features/inventory/StockActions.test.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-068-Shorter-Large-Write-Off-Note.md (new), ADR-061 (amended note), Decisions-Summary.md, 01-Requirements/Features/Module-Overview.md, 08-Logs/Issues-and-TODOs.md
Changes Made:
- A large write-off note needs at least 5 characters (was 20). The screen's hint and error read the constant, so they now say 5. Everything else in ADR-061 is unchanged.
Reason: User request; Zean's choice.
Testing Performed: `npx vitest run src/features/inventory src/lib`: 229 passed. Not checked in a browser.
Known Issues: Canonical document and backend docs still say 20 (DOC entry).
Next Steps: None.
