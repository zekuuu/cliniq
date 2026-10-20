Date/Day/Time: Tuesday, October 20, 2026 — 15:16 PHT
Agent: Claude (Sonnet 5.5), chat session, not Claude Code; no application code touched
Task: Settle the open DECIDE entries that have an obvious answer, open the builds as FIX entries, and write the prompt for the repo agent
Status: Completed (records and prompt); the builds are not done
Prompt/Request: Zean wrote: "Now for those DECIDE that has obvious answers and don't need me or any other people to answer it, fix them already. For example the 'several emergency contacts per student (the Grade 11 case showed one contact can fail)' then the simplest solution will be is to be able to add multiple emergency contact for students not just one."
Files Modified:
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-20-obvious-decisions-resolved.md (new)
Changes Made:
- I read all 32 entries in the group "Ours to decide" and picked the ones whose answer follows from the entry itself, the code or Zean's own words and needs no one else. Four were resolved and moved, unchanged apart from the added Resolved text, to the archive under their original headings: "Several emergency contacts per student" (a list of contacts, first is primary, at least one required, no stored maximum), "Should printing or saving a PDF be audit-logged?" (yes, one entry per print from the beforeprint handling), "Student search isn't audit-logged" (no: checked in searchStudents, it returns only id, Student Number, name and grade), and "Same analytics on the Dashboard and in Reports" (the split the entry proposed; nothing removed; "View full report" links).
- Three FIX entries opened in the new section "Settled without waiting for an answer": "Allow several emergency contacts per student", "Audit-log every print and Save as PDF", "Add 'View full report' links from the Dashboard to Reports". Each lists the files and the steps.
- "Two contact numbers on a student record" got an Update: its first question is answered by the contact list; what "Student contact information" means is still open. Not resolved.
- Their four lines were removed from "Open decisions by who must answer" (Ours to decide 32 to 28; the section note says 78 open). The summary block was rebuilt: FIX 19, DECIDE 78, Done 184.
- New prompt for the coding agent: Prompt-Build-Settled-Decisions-Oct20.md.
Reason: Zean asked for the obvious decisions to be settled instead of waiting; the code is built by the repo agent, so the work here is the decision, the FIX entries and the prompt.
Testing Performed:
- Checked in the code on the live branch (fee746a) what each decision touches: the emergencyContact type, form fields, screens and the 52 mock-data records; the places that call window.print and the beforeprint hook; AuditActionType; the student search matcher; the Dashboard and Reports pages.
- The moved lines equal the originals plus the added Resolved text; the open counts were rebuilt by the script and read FIX 19 · AUDIT 10 · DOC 29 · DECIDE 78 · LATER 17.
Known Issues:
- Left open on purpose, so Zean can veto: "Login touch targets: 40px or 44px on phones?" (changing the shared Input and Button touches every screen; the entry says Zean decides); "Show the LRN in full, or partly hidden" and "LRN rules" (privacy and school-format choices, the school confirms the LRN format); "How does the Principal's sign-in work" (timeouts and a shared computer); "Set a minimum demographic group size" (needs a number the team picks); "Forgot password" (on HOLD); "Incomplete record that can't be completed", the Stage-1 sign-off rule, editing incident notes and medicines, draft letters, the three-state allergy model, the visit vitals and notification log (the clinician), the free-text complaint pool, and the school-facing questions (computer, administrator demo, substitute clinician, next meeting).
- "Same analytics" is the closest call: if Zean wants the Dashboard to lose its charts instead of gaining links, reopen it.
- The notification log does not yet record which emergency contact was tried; that stays an open question.
Next Steps:
- Zean runs Prompt-Build-Settled-Decisions-Oct20.md in the repo agent; the agent resolves the three FIX entries and moves them to the archive.
- Zean says which of the left-open entries he also considers obvious.
