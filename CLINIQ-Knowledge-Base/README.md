# CLINIQ Knowledge Base

Last checked against the code on Sunday, November 22, 2026 — 00:52 PHT for the docs sync of `main` at `b9fd646` (ADR-084, the realistic five-year demo school to February 28, 2027); on Friday, November 20, 2026 — 01:54 PHT for the docs sync of `main` at `533df61` (ADR-082, ADR-083, the emergency-contact check, the demo seeder) and the Overview's frequent-visitor pager; on Thursday, November 19, 2026 for the paged lists and the speed run only (ADR-082); on Wednesday, November 18, 2026 for where the code lives only (the merge into `main`, ADR-081); on Tuesday, November 17, 2026 for the changes of the follow-ups and load run (`feat/connect-frontend` at `759781e`, committed Tuesday, November 17, 2026 — 05:27 PHT; see `08-Logs/Load-Test-Nov16/NOTES.md`); otherwise as on Sunday, November 15, 2026 (the `backend` branch at `397e000`, which has `main` merged in).

**Current state:** the browser app (frontend) is built and runs on sample (mock) data by default; the backend is built and tested, phases B0 to B10 (133 routes, 255 tests passing on Saturday, November 21, 2026), and its 50 migrations (48 create a table, 2 ship product data) run on MariaDB and match the approved database design (ADR-057); the frontend can run on the backend behind a mock/API switch (ADR-080). The backend and the connection are on `main` since Wednesday, November 18, 2026 (ADR-081, [where the code lives](../README.md#where-things-live)). CLINIQ will run on the clinic PC only (ADR-079). The full status list is in the root [README.md](../README.md#current-state).

**Start here:**

- [Start Here for the SRS and Project Plan](00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md): which file to read for each section of the paper.
- [Facts sheet](00-Project-Core/Facts-Sheet.md): every number, computed from the repository (`npm run docs:facts`).
- [ADR index](06-Decisions/ADR-Index.md) (all 85 decisions, one line each) and [what changed since Project Plan revision 2.8](06-Decisions/Changes-Since-Project-Plan-2.8.md).
- [Diagram index](02-Architecture/Database/Diagrams/README.md): every diagram with its source and exports.
- [Frontend Loop Engineering](04-Development/Frontend-Loop-Engineering.md) and [Backend Loop Engineering](04-Development/Backend-Loop-Engineering.md): how each side is built.

## Folders

| Folder | Holds |
|---|---|
| [`00-Project-Core`](00-Project-Core/) | Overview, problem, objectives, scope, team, the Facts sheet, Start Here |
| [`01-Requirements`](01-Requirements/) | Functional and non-functional requirements, roles and permissions, module overview |
| [`02-Architecture`](02-Architecture/) | Tech stack, system architecture, database design and every diagram |
| [`03-Design`](03-Design/) | Design system, screen inventory, reference screens, screenshots |
| [`04-Development`](04-Development/) | Phases, loop manuals, API contract, environment set-up, conventions, `tools/` |
| [`05-Testing`](05-Testing/) | Test strategy and test cases |
| [`06-Decisions`](06-Decisions/) | ADR-001 to ADR-085, their summary and index |
| [`07-AI-Agents`](07-AI-Agents/) | Agent workflow and source-of-truth order |
| [`08-Logs`](08-Logs/) | Changelogs, issue logs, session logs, and the reports of the two overnight backend runs ([`Overnight-Run-Nov9`](08-Logs/Overnight-Run-Nov9/), [`Overnight-Run-Nov10`](08-Logs/Overnight-Run-Nov10/), which built B1 to B10); history, not current truth |
| [`09-References`](09-References/) | The five canonical documents, privacy policy, external references |

This is the operational reference for building CLINIQ, meant to be opened as an Obsidian vault. It complements — not replaces — the five canonical planning documents (see `09-References/Canonical-Documents.md`), which remain the source of truth for *what* the system must do. This vault is where *how it's being built*, day to day, gets recorded: architecture-as-implemented, development conventions, decisions, and the running history of what every AI agent (or human) has done.

**If you're an AI agent starting a task, read `AGENTS.md` first, not this file.**

## How this vault relates to the canonical documents

| | Canonical documents (Project Plan, Modules & Features, Frontend Context Brief, Frontend Design Reference, Related Systems Review) | This vault |
|---|---|---|
| Authoritative for | Requirements, scope, planning-level decisions | Implementation state, conventions, running history |
| Changes when | A genuine requirement/scope decision is made | Routine development progresses |
| Lives | `09-References/Canonical-Documents/` in this repo, and wherever the team keeps them | Inside the Git repo, alongside the code |

When something here needs to diverge from a canonical document — a real requirement change, not an implementation detail — the canonical document gets updated too, through the same process used throughout this project (see `06-Decisions/`).
