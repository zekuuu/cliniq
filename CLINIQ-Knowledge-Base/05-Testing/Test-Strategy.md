# Test Strategy

- **Backend:** Pest (Laravel's modern default test framework).
- **Frontend:** Vitest + React Testing Library.
- Test what applies to the change being made — this isn't a full test-everything mandate at this stage, but new logic (especially the stock-flow decrement/threshold logic, the two-stage incident flow, and Follow-Up status transitions) should get coverage given how easy off-by-one and state-transition bugs are to introduce there.

Bugs found and fixed get logged in `08-Logs/Frontend-Issues-and-TODOs.md` and referenced from the relevant `08-Logs/Agent-Sessions/` entry, not tracked separately.
