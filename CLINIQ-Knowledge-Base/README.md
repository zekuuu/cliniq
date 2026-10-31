# CLINIQ Knowledge Base

Last checked against the code on Saturday, October 31, 2026 (commit 9b4861db).

**Current state:** the browser app (frontend) is built and runs on sample (mock) data, the server side (backend) is not built, and the database design is a proposed draft awaiting team approval. The full status list is in the root [README.md](../README.md#current-state).

This is the operational reference for building CLINIQ, meant to be opened as an Obsidian vault. It complements — not replaces — the five canonical planning documents (see `09-References/Canonical-Documents.md`), which remain the source of truth for *what* the system must do. This vault is where *how it's being built*, day to day, gets recorded: architecture-as-implemented, development conventions, decisions, and the running history of what every AI agent (or human) has done.

**If you're an AI agent starting a task, read `AGENTS.md` first, not this file.**

## How this vault relates to the canonical documents

| | Canonical documents (Project Plan, Modules & Features, Frontend Context Brief, Frontend Design Reference, Related Systems Review) | This vault |
|---|---|---|
| Authoritative for | Requirements, scope, planning-level decisions | Implementation state, conventions, running history |
| Changes when | A genuine requirement/scope decision is made | Routine development progresses |
| Lives | `09-References/Canonical-Documents/` in this repo, and wherever the team keeps them | Inside the Git repo, alongside the code |

When something here needs to diverge from a canonical document — a real requirement change, not an implementation detail — the canonical document gets updated too, through the same process used throughout this project (see `06-Decisions/`).
