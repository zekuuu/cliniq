# Project Documents

Markdown copies of the groupmate's Project Plan and SRS, one file per section in `Project-Plan/` and `SRS/`; her original files are never edited.
`<!-- p.NN -->` comments mark where each source PDF page starts (PDF page numbers, not the printed ones).
Copy text from the combined files [00-Combined-Project-Plan.md](Project-Plan/00-Combined-Project-Plan.md) and [00-Combined-SRS.md](SRS/00-Combined-SRS.md); figures are in each `assets/` folder.
See [WHAT-CHANGED.md](WHAT-CHANGED.md) for what changed since the last version.
Rebuild after editing a section: `npm run docs:documents` (`-- --diagrams` redraws the Mermaid figures, `-- --check` verifies).
