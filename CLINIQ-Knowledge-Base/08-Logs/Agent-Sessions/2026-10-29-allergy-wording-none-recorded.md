Date/Day/Time: Thursday, October 29, 2026 — 15:13 PHT
Agent: Claude (Sonnet 5.5), Claude Code
Task: Change the allergy and condition wording from "None" / "Not recorded" to "None recorded"
Status: Completed (records and prompt; nothing built)
Prompt/Request: Zean: "change None to None recorded instead not warning alert".
Files Modified:
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-29-allergy-wording-none-recorded.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-049-Clinical-Record-Rules-Letters-Allergies-Notes.md (amended)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-051-Starting-Values-Follow-Up-Closing-Vitals-Ranges-Automatic-Archive-And-Required-Marks.md (item 9 revised)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- Outside the repository: Prompt-Build-Decisions-Sheet-Answers-Oct29.md (D1, Part 2)
Changes Made:
- The allergy and condition suggestion "None" becomes "None recorded", and an empty field shows the same words in plain text. The warning style on the alert card is dropped.
- The open `FIX` was retitled "Allergies and conditions: say "None recorded" instead of "None", also when empty" with the old title in its update line.
Reason: Zean wanted one neutral wording and no warning alert. Claude read the instruction as: the word "None" is replaced by "None recorded" everywhere it was typed or suggested, and an empty field uses that wording too.
Testing Performed: No code changed. Issues counts unchanged (FIX 46, AUDIT 10, DOC 39, DECIDE 21, LATER 26); no live title still uses "Not recorded".
Known Issues:
- An empty field and a field saying "None recorded" now look the same, so the clinic can no longer tell "nobody asked" from "asked, none". Zean chose this to keep the form simple.
- The build must find every place that tests for the typed value "None" (alert card, profile, printouts, seed).
Next Steps:
- Zean runs Part 2 of the build prompt.
