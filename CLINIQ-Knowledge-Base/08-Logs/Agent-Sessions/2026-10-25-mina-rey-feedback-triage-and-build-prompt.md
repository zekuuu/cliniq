Date/Day/Time: Sunday, October 25, 2026 — 16:58 PHT
Agent: Claude (Sonnet 5.5), Claude Code
Task: Review the Sir Mina and Sir Rey feedback, record the decisions, and write the build prompt
Status: Completed (records and prompt; nothing built)
Prompt/Request: Zean shared `SIR_MINA_AND_SIR_REY_merged_feedback.md` and asked what Claude thought. After the assessment he answered: "Okay add all worth doing, then exclude the stress test for now." Admin read-only access to incidents and profiles: "Yes then I think also report or disable printing in reports page" (clarified as no printing at all for the Admin, "since clinician will be the one submitting and printing it"). Local only with a copy held by the Principal: "Yeah"; then, at 16:57: "no encrypted copy for the principal, we have no plan for copies yet, just a internal and external drive backup". Frequent-visitor panel: "I'm not sure, I let you decide what's best".
Files Modified:
- CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-25-mina-rey-feedback-triage-and-build-prompt.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-038-Admin-Read-Only-Access-No-Printing-And-No-Printing-Of-Draft-Letters.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-039-Backup-Stays-Local-No-Cloud-No-Extra-Copy-Planned.md (new)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-029-Local-Deployment-Roles.md (note: the Principal does not print)
- CLINIQ-Knowledge-Base/06-Decisions/ADR-026-Purpose-Built-A4-Printouts.md (note: draft letters cannot be printed)
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md
- Outside the repository: Prompt-Build-Professor-Feedback-Mina-Rey-Oct25.md
Changes Made:
- Checked each point of the feedback against the live branch `feat/removals-qr-phone-instructor-oct21` at commit `2164a26` (Saturday, October 24, 2026 — 19:12 PHT). Already built: the low-stock alert on the Dashboard, guardian notification outcomes, the role label in the top bar, paging, allergies beside the medicine picker, the date filter. Not built: a manufactured date, a generic/branded tag, a rows-per-page choice, an Assisted by pick-list, a prefilled guardian, a locked LRN, Admin access to profiles and incidents.
- New section "Feedback from Sir Mina and Sir Rey" in Issues-and-TODOs: 3 NOTE, 12 FIX, 2 DOC, 2 DECIDE, 1 LATER. 15 existing entries got an "Update Sunday, October 25, 2026 — 16:58 PHT:", including the open `DECIDE` "Additional backup layer beyond local + external drive", which stays open (only the cloud is ruled out).
- ADR-038 and ADR-039 record Zean's answers; ADR-029 and ADR-026 carry a note; Decisions-Summary updated.
- Wrote `Prompt-Build-Professor-Feedback-Mina-Rey-Oct25.md`: five parts, a Step 0 table of defaults, and the logging rules. The stress test is not in it.
Reason: Zean asked for the worthwhile points to be applied and gave his answers. Claude advised against a Super Admin, against giving the Admin every clinician feature and against a cloud backup, and Zean accepted that advice. A first draft recorded a second encrypted copy held by the Principal; Zean withdrew it, and every mention was removed before anything was applied. The Frequent-visitor panel was left to Claude: hidden behind a config switch until the nurse gives the number, because its default (3 visits in 30 days) flags too many students and both reviewers called the Dashboard crowded.
Testing Performed: No code changed. The Issues counts were recomputed by script with the usual rule (FIX 30, AUDIT 10, DOC 32, DECIDE 94, LATER 22, NOTE 60, VERIFY 21) and the group headers checked against their lists (36, 18, 7, 3, 2, 28 = 94).
Known Issues:
- Defaults of mine that Zean has not confirmed: the Admin's views are audit-logged; visits on a profile are text, not links, for the Admin; a name correction needs a reason; Time out stays time-only.
- The Principal has not been told that he will not print.
- A Google Sheet of the open decisions was edited during this session; Claude overwrote three Answer cells there (#34, #66, #68) and the text written for #66 ("a second encrypted copy held by the Principal") is now wrong.
- Sir Mina's recording is about 70% recoverable and Sir Rey's about 65%; attribution is partly inferred.
Next Steps:
- Zean runs the build prompt part by part and checks its Step 0 table first.
- Ask the nurse the two new questions (stay-home rule, manufactured date) and the frequent-visitor number.
