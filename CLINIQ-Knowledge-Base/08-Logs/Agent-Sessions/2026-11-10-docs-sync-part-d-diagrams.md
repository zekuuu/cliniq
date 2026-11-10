# 2026-11-10 — Docs sync Part D: every diagram current, new ones added, exports

Date/Day/Time: Tuesday, November 10, 2026 — 17:28 PHT
Agent: Claude Opus 5.5 (Claude Code), docs-only run.
Branch: `main` at `8f70297`, uncommitted (Zean commits with `/komit`).
Task: Part D of the pre-SRS / Project Plan documentation sync.
Status: Completed

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): inventory every diagram, correct the out-of-date ones, add the diagrams a Project Plan and SRS need (deployment, context, sequences, states, role matrix, screen flow, backup and recovery), Mermaid source plus SVG and 2x PNG exports, one look, captions, an index.

## Diagram inventory

| File | Shows | Last updated before | Still true before this run |
|---|---|---|---|
| `Database/Use-Case-Diagram.md` | Use cases by role | 2026-11-08 | No: no authenticator, archive, school year, settings, imports, Admin's view-only reports |
| `Database/Data-Flow-Diagram.md` | Levels 0 and 1 | 2026-10-31 | No: registrar fed CLINIQ directly, no PDF to the Principal, no backup drive, "import not built" |
| `Database/Activity-Diagram.md` | Emergency, follow-up | 2026-11-05 | Yes for 2 and 3; sign-in, recovery, visit, import, school year, backup missing |
| `Database/Module-Linkage-Diagram.md` | Module links | 2026-11-09 | Yes |
| `Database/ERD.md` Mermaid 3.1 to 3.6 | Tables by module | 2026-11-07 | Yes (the Mermaid) |
| `Diagrams/ERD-3.2` to `3.6` PNG/SVG | Same, as images | 2026-11-01 | No: `full_name`, `users.email`, missing tables (ERD.md said so) |
| `Diagrams/ERD-Overview.dot`, PNG, SVG | All 48 tables | 2026-11-07 | Yes |
| `Diagrams/Module-Linkage.png/svg` | Module links | 2026-10-31 | Regenerated from the current Mermaid |

## Changes Made

- Updated: Use-Case (Mermaid and both role tables), DFD levels 0 and 1, Activity diagrams 4 to 9 added (sign-in with lockout and idle, authenticator recovery, visit to release, yearly import and archive, school-year end and start, backup run).
- New, each with a caption and sources: `02-Architecture/Deployment-Diagram.md`, `Context-Diagram.md`, `Sequence-Diagrams.md` (sign-in with the SPA cookie, idle keep-alive, recovery, visit with stock and audit; checked against the API Contract), `State-Diagrams.md` (school year, incident, follow-up; checked against the schema's constraints), `Role-Permission-Matrix.md`, `Screen-Flow-Map.md` (from the router), `Backup-And-Recovery-Flow.md`.
- Exports: 31 Mermaid diagrams to SVG and 2x PNG (1200 px wide at scale 2) in `Database/Diagrams/`, Mermaid neutral theme, Arial, white background; the ERD module images are now generated from ERD.md's Mermaid (their source); the overview SVG and PNG regenerated from `ERD-Overview.dot`. Existing file names kept, so links hold.
- New `04-Development/tools/docs-diagrams.mjs` (`npm run docs:diagrams`) and `Database/Diagrams/README.md`, the index.
- ERD.md's image table no longer says "not yet regenerated".

Decisions taken (unattended):
- The Backup screen's "guided recovery checklist" only verifies a backup; no restore procedure is documented. The backup and recovery figure draws only what exists and says the restore procedure is not written yet (backend phase B10), instead of inventing one.
- Login errors in the sign-in sequence follow the contract (401 `invalid_credentials` with `attempts_left`, 423 `account_locked`).

Testing Performed: `npm run docs:check -- --mermaid` renders all 31 Mermaid blocks (Chrome, never Edge). Three sequence diagrams first failed on `;` inside messages (Mermaid's statement separator); fixed. Spot-checked the Deployment and ERD 3.2 PNGs by eye.

Known Issues: the ERD overview PNG needs Graphviz `dot` (not installed here); this run made it from the SVG with `sharp` outside the repository. `docs:diagrams` says so when `dot` is missing.
