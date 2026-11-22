# Main documentation sync notes — Sunday, November 22, 2026 — 14:29 PHT

**Range:** `d4b66ff..9da38fa` on `main` (two commits). The previous row predates ADR-081's merge history only in neither date nor scope: this is a normal post-merge documentation-only run.

| Path / area | What it said | What the repository says | Action | Why |
|---|---|---|---|---|
| Root README and Start Here | Last docs sync named `1c41f73`; the groupmate digest ended at ADR-087. | `bff40a0` and `9da38fa` moved the generated combined Project Plan and SRS copies into their section folders. No code, schema, route, screen, ADR, or factual count changed. | Updated sync metadata and added a digest entry. | The reader-facing entry point must name the current `main` and the new copy locations. |
| Facts sheet | Generated from `1c41f73`. | `npm run docs:facts` reads the working tree at `9da38fa`; all computed counts are unchanged. | Regenerated. | Facts are generated, never hand-edited. |
| Generated requirements traceability note | Said only the health, CSRF, and keep-alive routes were live. | `backend/routes/api.php` and the API Contract show the backend implements the contract through 133 live routes. | Corrected `docs-trace.mjs` and regenerated the table. | The old sentence predated ADR-081 and contradicted the live implementation. |
| README Original, module linkage, and ADR-056 summary | Described the prior sync, mock-only backup behavior, or ADR-056 preparation as present state. | `9da38fa`, the API Contract, ADR-080, and ADR-081 show the current `main` layout and mock/API behavior. | Updated the overview and linkage wording; added a dated current-status note to the decision summary. | Historical statements remain, but must be explicitly marked as such. |
| `10-Project-Documents/README.md` | Links to `Project-Plan/00-Combined-Project-Plan.md` and `SRS/00-Combined-SRS.md`. | The links match the relocated files from `9da38fa`. | Fine. | The relocation commit already changed the reader instructions. |
| Project Plan and SRS section files | No post-baseline system projection. | The two commits changed only combined-file locations and the documentation builder; the source sections are unchanged. | Fine; rebuilt combined copies and recorded no content edits. | No evidence supports changing groupmate-authored section text. |
| Documentation builder | Builds combined copies in the two section folders. | `CLINIQ-Knowledge-Base/04-Development/tools/docs-documents-build.mjs` at `9da38fa` does the same. | Fine. | The current script and README agree. |
| Diagrams / ERD | Existing sources and exports. | Neither commit changes a schema or Mermaid source. | No regeneration needed. | No touched diagram or schema evidence. |
| Open canonical-document `DOC` issues | Four items remain for ADR-083 through ADR-087. | The prior sync records that the proposed pointer lines were not approved. | Not edited; listed under Needs your call in this run's log. | The sync workflow requires Zean's approval before canonical-document edits. |

## Numbers checked

- Facts sheet regenerated from the working tree at `9da38fa`; no computed number changed.
- No database command was run.

## Remote branches

Every remote branch was zero commits ahead of `origin/main` at the start of this run. No active branch held documentation that `main` lacks.

## Needs your call

~~The unapproved canonical-document pointers for ADR-083 through ADR-087 remain open; this run did not edit them.~~ Resolved in the follow-up pass (Sunday, November 22, 2026 — 15:01 PHT): all four pointer lines were applied to the Design Reference, Modules & Features, and Context Brief. See [session](Agent-Sessions/2026-11-22-docs-canonical-doc-pointers.md).

- ~~The duplicated Modules & Features statement that disabling an account ends sessions is still marked "Not built yet".~~ Resolved Sunday, November 22, 2026 (Zean approved): the canonical Modules & Features line was already correct; the vault twin `Module-Overview.md` now cites `backend/app/Shared/Http/Middleware/EnsureActiveAccount.php` instead of "Not built yet".
