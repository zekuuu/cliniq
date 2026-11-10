# Diagram index

Every CLINIQ diagram, its Mermaid or Graphviz source, and its exports for Word or Google Docs. GitHub renders the Mermaid in each source file; the SVG (zoomable) and PNG (2x, readable at A4 width) files here are copies for pasting. All verified against the code at `b51166a` and the ADRs up to ADR-079 on Tuesday, November 10, 2026. Nothing shows real names or data.

**Regenerate the exports** from the repository root:

```bash
npm run docs:diagrams
```

It needs Chrome or Chromium for Mermaid (`PUPPETEER_EXECUTABLE_PATH`, never Microsoft Edge) and Graphviz `dot` for the ERD overview (or `GRAPHVIZ_WASM`; see the top of [`docs-diagrams.mjs`](../../../04-Development/tools/docs-diagrams.mjs)). `npm run docs:check -- --mermaid` proves every Mermaid block renders. One look throughout: Mermaid's neutral theme, Arial, white background; Staff green and Admin blue where roles are coloured.

| Diagram | Shows | Source | Exports | Supports |
|---|---|---|---|---|
| Context | CLINIQ and everything around it | [Context-Diagram.md](../../Context-Diagram.md) | `Context.svg`, `.png` | SRS 2.1, Plan scope |
| Deployment | Clinic PC, Apache, API, MariaDB, scheduler, backup drive, PDF | [Deployment-Diagram.md](../../Deployment-Diagram.md) | `Deployment.svg`, `.png` | SRS 2.1, 3.3; Plan deployment |
| Use cases | Both roles' use cases | [Use-Case-Diagram.md](../Use-Case-Diagram.md) | `Use-Case.svg`, `.png` | SRS 2.2, 3.1 |
| Role matrix | What each role may do | [Role-Permission-Matrix.md](../../Role-Permission-Matrix.md) | `Role-Permissions.svg`, `.png` | SRS 2.3 |
| Screen flow | Navigation by role, from the router | [Screen-Flow-Map.md](../../Screen-Flow-Map.md) | `Screen-Flow-Staff`, `Screen-Flow-Admin` | SRS 3.2 |
| Data flow, levels 0 and 1 | External entities; processes and stores | [Data-Flow-Diagram.md](../Data-Flow-Diagram.md) | `DFD-Level-0`, `DFD-Level-1` | SRS 2.1, 3.1 |
| Module linkage | Which module feeds which | [Module-Linkage-Diagram.md](../Module-Linkage-Diagram.md) | `Module-Linkage` | SRS 2.2, Plan design |
| Activities 2 to 9 | Emergency, follow-up, sign-in, recovery, visit, import, school year, backup | [Activity-Diagram.md](../Activity-Diagram.md) | `Activity-2-Emergency` to `Activity-9-Backup` | SRS 3.1 |
| Sequences 1 to 4 | Sign-in, idle keep-alive, recovery, visit with stock and audit | [Sequence-Diagrams.md](../../Sequence-Diagrams.md) | `Sequence-1-Sign-In` to `Sequence-4-Visit` | SRS 3.3 |
| States 1 to 3 | School year, incident, follow-up | [State-Diagrams.md](../../State-Diagrams.md) | `State-1-School-Year` to `State-3-Follow-Up` | SRS 3.1 |
| Backup and recovery | Backup, warning and verification | [Backup-And-Recovery-Flow.md](../../Backup-And-Recovery-Flow.md) | `Backup-Recovery` | SRS 3.4, Plan maintenance |
| ERD overview | All 48 tables by module | [`ERD-Overview.dot`](ERD-Overview.dot) | `ERD-Overview.svg`, `.png` | SRS 3.5 (data) |
| ERD by module | Students, visits, emergency, inventory, access and operations | [ERD.md](../ERD.md) sections 3.2 to 3.6 | `ERD-3.2-Students` to `ERD-3.6-Access-and-Operations` | SRS 3.5 |

Each export name means the pair `<name>.svg` and `<name>.png`. Every source file has a title, a one-paragraph caption and the documents it was drawn from; quote the caption with the image.
