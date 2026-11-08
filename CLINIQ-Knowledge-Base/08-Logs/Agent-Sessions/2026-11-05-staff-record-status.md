Date/Day/Time: Thursday, November 05, 2026 — 21:19 PHT
Agent: Claude Code (Opus 5.5)
Task: Staff record status and incomplete filter (ADR-067); department suggestions by type; follow-up prompt colour; account and sidebar tidy-ups carried in the same run
Status: Completed
Prompt/Request (in order):
- Pasted user feedback: "much better ata na may button din na ganto sa staff kasi what if kulang info nila ganon" (an Incomplete records button on the Staff List, like the Student List's). The agent found ADR-043 says staff have no incomplete-records status and asked; Zean: "I'll let you decide, but it's mostly similar to students".
- "the options will be dependent on the chosen options of type" (Department or role suggestions on Add/Edit Staff).
- "It's wrapped, just align it to the right" (the Staff List header buttons).
- "Then also the staff table list should also have record status and filter. And in incomplete records, why is it not using the same warning badge student incomplete records use"
- Pasted user feedback: "possible kaya malagyan toh color para mas mapansin?? kasi lagi ko siya tlag di napapansin eh (eh nakita ko rin namn sa ano may color ung kapag resting in clinic)" (the Follow-up prompt box on New Visit is easy to miss; colour it like the chosen disposition).
Files Modified:
- frontend/src/features/staff-records/missingStaffFields.ts (new), StaffListPage.tsx, StaffFormPage.tsx, StaffPages.test.tsx, api/staffApi.ts
- frontend/src/lib/mock-db/selectors.ts, frontend/src/lib/mock-db/api.ts
- frontend/src/components/forms/FollowUpPrompt.tsx, frontend/src/features/clinic-visits/NewVisitEntryPage.tsx
- CLINIQ-Knowledge-Base/06-Decisions/ADR-067-Staff-Record-Status-And-Incomplete-Filter.md (new), Decisions-Summary.md, 01-Requirements/Features/Module-Overview.md, 08-Logs/Frontend-Issues-and-TODOs.md
Changes Made:
- ADR-067 (amends ADR-043): a staff record is Incomplete with no emergency contact, or no sex (old records). Staff List: Record status column (Complete / Incomplete badges, as on the Student List) and Record status filter; "Incomplete records (N)" secondary button sets the filter to Incomplete (aria-pressed), N over all active staff. Filtered to Incomplete, the table shows Missing fields (the student queue's soft warning badges) and Edit Record. Header buttons right-aligned when they wrap.
- Edit Staff marks the missing sex and primary emergency contact fields red ("Missing. Fill this in to complete the record.") until filled, and opens on the first. Saving never blocks.
- Department or role suggestions: only those in use for the chosen type; all of them before a type is picked. `personnelDepartments` now returns a map by type.
- Follow-up prompt (New Visit, and the shared FollowUpPrompt on Visit Details and Stage 2): follow-up purple border and fill (ADR-062 colour for follow-ups), purple legend and checkbox.
Reason: User requests; Zean delegated the staff definition.
Testing Performed: tsc clean; ESLint clean on changed files; new tests (staff incomplete filter and first-gap focus; department options by type); full `npx vitest run src`: 123 files, 1063 tests passed. Not checked in a browser.
Known Issues: The canonical Modules & Features document still needs ADR-067 (DOC entry added).
Next Steps: Update the canonical document.
