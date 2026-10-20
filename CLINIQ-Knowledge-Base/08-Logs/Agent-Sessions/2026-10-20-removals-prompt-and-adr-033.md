Date/Day/Time: Tuesday, October 20, 2026 — 23:25 PHT
Agent: Claude (Sonnet 5.5), chat session, not Claude Code; no application code touched
Task: Write the prompt for the removals (QR, phone screens, PE Instructor), the Student Number to LRN replacement and the move of account management to the Admin/Principal, and record the new decisions
Status: Completed (records and prompt); nothing is built
Prompt/Request: Zean wrote: "make the prompt to implement the removal of qr feature (note it as on hold until confirmed client will not agree with online hosting), then also replace student number with LRN, then the removal of mobile screens and the removal of PE instructor account. Also move the account or user management to account of admin/principal. suggest implicit that I might forget".
Files Modified:
- CLINIQ-Knowledge-Base/06-Decisions/ADR-033-Phone-Screens-Removed-Account-Management-To-Admin.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Issues-Done-Archive.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-20-removals-prompt-and-adr-033.md (new)
Changes Made:
- ADR-033: the phone-only screens are removed; account management moves to the Admin/Principal; the QR removal waits for the client's hosting answer (QR stays dropped in the plan, ADR-027); the last active Admin can never be disabled or demoted.
- New section "Phone-only screens and account management" in the issues file: a note, `FIX` "Remove the phone-only screens", `FIX` "Move account management to the Admin/Principal account", and two `DECIDE`s (Backup for the Admin; whether the phone-screens removal waits too).
- Resolved and moved to the archive: "What happens to the phone pieces that live in the QR hub?" and "Does the phone Emergency button stay?".
- Updates, none resolved: the three older removal `FIX`s (QR now on HOLD with Zean's condition; LRN and Instructor now parts of the prompt), "Show the client both options" (same question as the hosting condition), "Who manages accounts if the admin is absent or has left?".
- Counts: FIX 23, DECIDE 77, Done 188; the group "Depends on the QR, Instructor and LRN decisions" 5 to 3, "Ours to decide" 27 to 29.
- New prompt `Prompt-Build-Removals-QR-LRN-Mobile-Instructor-UserMgmt.md`: five parts, run one per session, in the order Instructor, phone screens, accounts, LRN, QR (HOLD with a gate that stops the agent).
Reason: Zean asked for the removals and replacements as a prompt; the order differs from his list on purpose (removing first leaves fewer references to replace, and QR is on hold).
Testing Performed:
- Checked the code on the live branch (fee746a): the route table (Users, Add User and Backup are Staff-only; the Admin sidebar has only Overview and Reporting), the QR feature (28 QR-related files, `qr-scanner`), `EmergencyMobilePage` (nothing links to it), the `mobileOnly` mechanism (used only by the QR Lookup menu entry), the Instructor references (21 files) and `studentNumber` (74 files).
- Counts rebuilt by the script and checked against the archive (188) and the group lists.
Known Issues:
- Assumed, and said in the prompt: "mobile screens" means the phone-only screens, not responsive layouts or the narrow-window menu; the staff PE referral page stays; Backup stays with Staff; the phone-screens removal is not on HOLD (both logged as `DECIDE`s).
- The prompt's Part 4 defaults (masked LRN, 12 digits, internal id in addresses, and so on) are recommendations, not decisions: the agent must confirm them with Zean first.
- Nobody has yet asked the client about online hosting; that question needs Zean's go-ahead.
- The Instructor's printout and the Admin-absent rule remain undecided; after Part 1 the instructor's need has no replacement.
Next Steps:
- Zean runs the parts one at a time (Part 5 only after the hold is lifted) and commits each.
- Zean decides: who asks the client about online hosting and when; Backup for the Admin; whether the phone-screens removal should wait.
