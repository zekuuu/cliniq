---
description: Docs-only sync. Make what `main` says match what `main` is (READMEs, knowledge base, Facts-Sheet, diagrams, screenshots index, groupmate digest). No commits.
---

# /update-docs — bring `main`'s documents up to date with the code on `main`

Run from the repo root after a batch of commits. **Documentation only.** Work directly on `main`. Commit nothing: Zean reviews, commits and pushes.

**Why.** Zean's groupmate writes the Project Plan and SRS and reads only GitHub's `main`. Since ADR-081, `main` holds the whole system. The job: keep what `main` says equal to what `main` is. Each run starts from the last row of `CLINIQ-Knowledge-Base/08-Logs/Main-Sync-Log.md`.

**When unclear, ask** with the question pop-up (`AskUserQuestion`, or your agent's equivalent): one to four short questions, recommendation first, marked "(Recommended)". Never guess. Grounds, in order: code and schema (what exists), ADRs (later dated note wins), canonical documents (original intent). Unanswered → skip the item, list it under "Needs your call".

## Rules

- Start with one sentence on what you will do. **No commit, push, merge, new branch or tag.** If later asked to commit: no Claude/AI attribution lines (Zean's rule).
- **Allowed paths only:** `CLINIQ-Knowledge-Base/**`, `README.md`, `README_ORIGINAL.md`, `COMMANDS.md`, `URL-Parameters.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CLAUDE.md`, `backend/README.md`, `backend/tools/load/README.md`, `frontend/README.md`, README files under `frontend/src/**`, `screenshots/INDEX.md`, `screenshots/README.md`, docs tools in `CLINIQ-Knowledge-Base/04-Development/tools/`. Everything else under `backend/`, `frontend/`, `screenshots/`, `.github` is forbidden.
- Never open `.env*`. **Never touch a database:** no `composer test`/`check`, `artisan migrate`, Pest, `checks.php`, `bench.php` (`cliniq_testing` holds the demo school Pest would wipe). DB-derived numbers come from the newest run report or log ("from <file>, <date>, not re-run"), or are left for Zean with one command per line.
- Never edit an ADR's decision text (dated notes at the top only). Don't renumber anything the SRS cites. Keep each file's voice and layout. Don't touch `frontend/src/lib/mock-db/`.
- LF endings, no normalising; `git diff --stat` shows only real changes.
- Real timestamps (PowerShell `Get-Date`; Git Bash `TZ=Asia/Manila date` may print UTC). Minimal new Issues entries; closed ones move to `Issues-Done-Archive.md`.

## Steps

1. **Set up.** `git fetch origin '+refs/heads/*:refs/remotes/origin/*' --prune --tags`, `git switch main`, `git status`, `git pull --ff-only origin main`. Foreign uncommitted changes or a non-fast-forward → **stop and tell Zean**. Read `AGENTS.md`, the last `Main-Sync-Log.md` row ("since"; if it predates ADR-081, say this is the first post-merge run), newest ADRs, `git log --oneline <since>..main`. Show `git rev-list --count origin/main..origin/<branch>` for every remote branch in one table; if an active branch (commit in last 14 days) holds docs `main` lacks, ask whether to copy them byte for byte. Never merge code.
2. **Drift table.** For each area in `git diff --stat <since>..main`, find the docs describing it (API-Contract, Backend-Readiness-Checklist, ERD pages, Facts-Sheet, `frontend/README.md`, `URL-Parameters.md`, Development-Phases, load README, `COMMANDS.md`, `screenshots/INDEX.md`, ADR index, `AGENTS.md`/`CLAUDE.md`, and others you find). Mark each fine / stale / missing. Write the table to `08-Logs/Main-Sync-<date>/NOTES.md`: path, what it says, what the code says (file + commit), action, why.
3. **Rewrite stale text.** State the present with a date; history stays in logs. Relative links to files on `main`; old-branch files via `https://github.com/zekuuu/cliniq/blob/<sha>/<path>` or the checkpoint tag. Keep one "Where things live" table near the top of `README.md` and `Start-Here-For-SRS-And-Project-Plan.md`, and a "Last synced" line (PHT time + `main` commit) atop `README.md`. Add the groupmate digest "Changes since the last sync (<date>)" in Start-Here, newest first: ADRs added/amended, numbers changed (before, after, Facts-Sheet line), features added/removed, renamed terms, Plan/SRS statements now wrong (only if listed in `08-Logs/`).
4. **Canonical-document items.** For each open `DOC` issue titled "Canonical documents: …", propose the exact one-line ADR pointer per file in one pop-up; edit only what Zean approves. Never edit the Project Plan or SRS; list their needed changes in the digest.
5. **Numbers.** `npm run docs:facts` (never `--tests`). It must read the working tree, not a branch ref; if it still uses `BE_REF`, fix the tool. Hand-check routes (`routes/api.php`), tables (migrations), screens (router) against the last log row; every change must trace to a commit. Unreadable → say so, never type a number.
6. **Diagrams.** Update the Mermaid source of any diagram the changes touched, then `npm run docs:diagrams` and look at each output. Redo ERD exports only if the schema changed. Lucid link only on Zean's say-so.
7. **Checks.** `npm run docs:check` (zero broken links in your files); `npm run docs:adrs`; `npm run docs:trace` if DB-free. Search non-log Markdown for stale phrases (`not connected`, `mock only`, `not on main`, `not started`, `not built`, old counts, old Facts-Sheet values). Recount Issues headers and the ADR count. Check `COMMANDS.md` against `package.json`/`composer.json`. Check every `screenshots/INDEX.md` entry exists and every picture is listed. Run `git diff --name-status` against the allowed list; undo anything outside it and say so. Read the top of `README.md` and Start-Here as a stranger would.
8. **Log.** Finish `NOTES.md`; add a `Main-Sync-Log.md` row (time, `main` commit, commits covered, files rewritten, numbers changed, checks, leftovers); one session log with `-docs-main-sync-` in its name and a changelog row, per `AGENTS.md`.

## Finish

Report briefly: commits covered, files rewritten, numbers changed (before → after), diagrams regenerated, checks and leftovers, anything unverified and why, "Needs your call". Group files to commit as `docs(logs)`, `docs(readme)`, `docs(facts)`, `docs(dev)`, `docs(diagrams)`. Remind Zean that review, commit and push are theirs. Do not run them.
