Date/Day/Time: Sunday, November 1, 2026 — 12:09 PHT
Agent: Claude Code (Opus 5.5)
Task: Remove the Principal's on-screen acknowledgement of reports
Status: Completed
Prompt/Request: "remove the acknowledge or approval of principal to reports, since it will only happen when the clinician printed the report so it happens iin physical"
Files Modified: `frontend/src/features/emergency-response/IncidentReportPage.tsx`, `incidentRecordApi.ts`, `lib/mock-db/api.ts`, `types/entities.ts`, `AdminAuditDashboardDecisions.test.tsx`, two frontend READMEs; ADR-060 (new), ADR-038, ADR-048, `Decisions-Summary.md`; `Reference-Schema.sql`, `constraint-tests.sql`, `Data-Dictionary.md`, `ERD-Review.md`, `Use-Case-Diagram.md`, `Module-Linkage-Diagram.md` and its SVG and PNG; `API-Contract.md`, `Audit-Coverage.md`; requirements, design and team documents; the Markdown copies of the canonical documents.
Changes Made: Removed the Admin's Acknowledge button, dialog, "Acknowledged" field and printout row, `acknowledgeIncidentReport`, `AcknowledgeError`, `Incident.acknowledged` and the trail's `acknowledged`. Removed the endpoint, the `acknowledge` rule, the two columns, their check and their foreign key. Replaced the two Acknowledge tests with one test that the Admin has no such button. The clinician's Approve Report and all printed signature lines are unchanged.
Reason: The Principal acknowledges on paper, after the clinician prints, so a button would record the same act twice (ADR-060).
Testing Performed: `npx vitest run`: 890 of 890 passed in 112 files. `npm run lint` clean; `tsc -b --noEmit` clean. `Reference-Schema.sql` and `constraint-tests.sql` were not run against a database. The Module-Linkage PNG was re-rendered from its SVG in headless Chrome, at the same size.
Known Issues: `api.ts` line references in `API-Contract.md` below the removed code are off by about 24 lines; they had already drifted by 3. Any Word or PDF master of the canonical documents still needs this change.
Next Steps: None for this change.
