# Project Documents

Markdown copies of the groupmate's Project Plan and SRS, one file per section in `Project-Plan/` and `SRS/`; her original files are never edited.
`<!-- p.NN -->` comments mark where each source PDF page starts (PDF page numbers, not the printed ones).
Copy text from the combined files [00-Combined-Project-Plan.md](Project-Plan/00-Combined-Project-Plan.md) and [00-Combined-SRS.md](SRS/00-Combined-SRS.md); figures are in each `assets/` folder.
See [WHAT-CHANGED.md](WHAT-CHANGED.md) for what changed since the last version.
Rebuild after editing a section: `npm run docs:documents` (`-- --diagrams` redraws the Mermaid figures, `-- --check` verifies).

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
