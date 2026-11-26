# Project Documents

Markdown copies of the groupmate's Project Plan and SRS, one file per section in `Project-Plan/` and `SRS/`; her original files are never edited.
`<!-- p.NN -->` comments mark where each source PDF page starts (PDF page numbers, not the printed ones).
Copy text from the combined files [00-Combined-Project-Plan.md](Project-Plan/00-Combined-Project-Plan.md) and [00-Combined-SRS.md](SRS/00-Combined-SRS.md); figures are in each `assets/` folder.
See [WHAT-CHANGED.md](WHAT-CHANGED.md) for what changed since the last version.
Rebuild after editing a section: `npm run docs:documents` (`-- --diagrams` redraws the Mermaid figures, `-- --check` verifies).

## Source map

The current requirements and implementation pages below supply factual updates to these Markdown copies. Cover pages, templates, assignments, budget, team, and historical drafts retain the groupmate's original wording unless she revises them.

| Copy section | Source pages |
|---|---|
| Project Plan cover, contents, change control, disclaimer and abstract (01–05) | Groupmate's original PDF baseline in [WHAT-CHANGED](WHAT-CHANGED.md); factual CLINIQ overview from [Overview](../00-Project-Core/Overview.md) |
| Project Plan 1, problem, objectives and scope | [Overview](../00-Project-Core/Overview.md), [Scope](../00-Project-Core/Scope.md), [Module Overview](../01-Requirements/Features/Module-Overview.md) |
| Project Plan 2, organization and deliverables | [Team](../00-Project-Core/Team-and-Roles.md), [Development Phases](../04-Development/Development-Phases.md) |
| Project Plan 3, related alternatives | [Related Systems Review](../09-References/Canonical-Documents/CLINIQ_Review_of_Related_Systems.md), [Module Overview](../01-Requirements/Features/Module-Overview.md) |
| Project Plan 4, method and stack | [Tech Stack](../02-Architecture/Tech-Stack.md), [System Architecture](../02-Architecture/System-Architecture.md), [Test Strategy](../05-Testing/Test-Strategy.md) |
| Project Plan 5, requirements, design and resources | [Functional Requirements](../01-Requirements/Functional-Requirements.md), [Module Overview](../01-Requirements/Features/Module-Overview.md), [Screen Inventory](../03-Design/Screen-Inventory.md), [System Architecture](../02-Architecture/System-Architecture.md), [ERD](../02-Architecture/Database/ERD.md), [Facts Sheet](../00-Project-Core/Facts-Sheet.md), [ADR Index](../06-Decisions/ADR-Index.md) |
| Project Plan 6, development timeline | [Development Phases](../04-Development/Development-Phases.md), [Frontend Loop](../04-Development/Frontend-Loop-Engineering.md), [Backend Loop](../04-Development/Backend-Loop-Engineering.md) |
| Project Plan 7 and references (12–13) | Groupmate's original PDF baseline in [WHAT-CHANGED](WHAT-CHANGED.md); [References](../09-References/Canonical-Documents.md) for system facts only |
| SRS templates, assignments and older drafts (01–08) | Groupmate's original PDF baseline in [WHAT-CHANGED](WHAT-CHANGED.md); historical text, not the current requirements |
| SRS current introduction (09) | [Overview](../00-Project-Core/Overview.md), [Scope](../00-Project-Core/Scope.md), [Roles and Permissions](../01-Requirements/User-Roles-and-Permissions.md), [README](../../README.md) |
| SRS current data requirements (10) | [Data Dictionary](../02-Architecture/Database/Data-Dictionary.md), [ERD](../02-Architecture/Database/ERD.md), [API Contract](../04-Development/API-Contract.md), [ADR Index](../06-Decisions/ADR-Index.md) |
| SRS current system features and rules (11) | [Functional Requirements](../01-Requirements/Functional-Requirements.md), [Module Overview](../01-Requirements/Features/Module-Overview.md), [Screen Inventory](../03-Design/Screen-Inventory.md), [Frontend README](../../frontend/README.md), [Backend README](../../backend/README.md) |
| SRS current models and other requirements (12–13) | [Architecture](../02-Architecture/System-Architecture.md), [Diagram Index](../02-Architecture/Database/Diagrams/README.md), [Test Strategy](../05-Testing/Test-Strategy.md), [Facts Sheet](../00-Project-Core/Facts-Sheet.md) |

## Color markers (inline change tracking)

When `/update-docs` edits a section file, it marks the changed words in-place so reviewers can see exactly what moved on GitHub:

| Marker | Meaning | Renders as |
|---|---|---|
| `~~$\textcolor{red}{\text{old wording}}$~~` | Removed text | ~~red strikethrough~~ |
| `**$\textcolor{green}{\text{new wording}}$**` | Added text | **green bold** |

**Section files** carry the markers. **Combined files** (`00-Combined-*.md`) are always marker-free — `docs:documents` strips them automatically before writing.

**Lifespan:** markers accumulate across `/update-docs` runs, so the section files show every change since the groupmate's last review. After she has reviewed them, run `/clear-doc-markers` (or `npm run docs:clear-markers`): it deletes the red words, keeps the green words as plain text and puts padded cells back on one line. `WHAT-CHANGED.md` keeps each run's changes permanently, separated by run.

**HTML table cells:** GitHub only renders inline math if there is a blank line before it. When a changed cell is inside an HTML table, the cell is expanded to multi-line:

```html
<td>

...text with ~~red~~ or **green** markers...

</td>
```

`docs:documents` collapses these back to single-line in the combined file after stripping the markers.

**WHAT-CHANGED.md** also records every edit as a `diff` block with the exact old/new wording, independent of the in-file markers.
