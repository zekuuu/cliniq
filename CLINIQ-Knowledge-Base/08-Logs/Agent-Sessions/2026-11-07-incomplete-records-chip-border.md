Date/Day/Time: Saturday, November 07, 2026 — 11:51 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Make the Dashboard's "incomplete student records" chip outline visible
Status: Completed
Prompt/Request: Zean, in chat: "border of incomplete record not visible".

Files Modified: `frontend/src/features/dashboard/components/AttentionChips.tsx`, `frontend/src/features/review-round-2.test.tsx`, `CLINIQ-Knowledge-Base/08-Logs/Changelog.md`.

Changes Made: The neutral chip's border was `border-border` (#e0e0e0), nearly invisible on white. It now uses `border-text-muted` (#9e9e9e), so it reads as an outline like the low-stock and expiry chips. The fill, icon and words are unchanged.

Reason: Zean, in chat, Saturday, November 7, 2026.

Testing Performed: The chip-colour test now expects `border-text-muted`. `review-round-2.test.tsx` and `features/dashboard`: 80 passed, 2 failed (82). The 2 failures are the existing R9 calendar tests from commit `1b50a113`.

Known Issues: #9e9e9e on white is about 2.7:1, under the 3:1 non-text contrast guideline. The other chips' tone borders are similar, and the words carry the meaning. Use `border-text-secondary` if a darker outline is wanted.

Next Steps: none.
