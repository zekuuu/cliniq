Date/Day/Time: Friday, September 25, 2026 — actual time not available (no system clock access in this environment)
Agent: Claude (chat session)
Task: Revert the ERD to TBA — correcting the previous session's assumption that a schema could be reasonably inferred
Status: Completed
Prompt/Request: "make ERD TBA, since we dont have database design yet"
Files Modified: CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md (reverted), AGENTS.md, CLAUDE.md, README.md, CLINIQ-Knowledge-Base/04-Development/{Development-Phases,Skills-Setup}.md, CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md, cliniq-backend/README.md
Changes Made:
- ERD.md reverted from a full normalized schema back to a TBA status note, keeping only the already-documented entity list (from Frontend Context Brief §5) as reference material — explicitly labeled as frontend-facing shapes, not a schema, so it can't be mistaken for settled database design.
- Deliberately did NOT revert DFD.md, Use-Case-Diagram.md, or Activity-Diagram.md — none of those commit to a database schema; they describe processes, actors, and flows that are already well-documented elsewhere, so the same objection doesn't apply to them.
- Updated every file that had asserted the schema was "no longer blocked" or "built": AGENTS.md/CLAUDE.md's phase-prerequisite note, README's roadmap table, Development-Phases.md's Phase B1 description, Skills-Setup.md's two migration-tool references, Frontend-Issues-and-TODOs.md (split the previously-merged "SRS diagrams resolved" entry — DFD/Use-Case/Activity stay resolved, ERD moved back to Known Gaps), and cliniq-backend/README.md's migrations note.
- Left the historical Changelog and Agent-Session entries describing the original ERD build untouched — they accurately describe what happened at the time; this session adds a new entry documenting the correction rather than rewriting history, same pattern as the earlier display-privacy rule correction (ADR-004).
- Did not touch CLINIQ_Conversation_Summary.md, per an explicit standing instruction from an earlier turn to stop updating that file.
Reason: The team wants database design to be a deliberate decision made when they're ready, not something inferred from frontend requirements and presented as settled.
Testing Performed: N/A — documentation only.
Known Issues: None new. Phase B1 is genuinely blocked again, correctly reflected everywhere now.
Next Steps: Design the actual database schema when the team is ready, using the entity list in ERD.md as a starting reference, not a template to copy.
