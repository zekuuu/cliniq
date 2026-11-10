# Contributing to CLINIQ

Read [AGENTS.md](./AGENTS.md) first (it is the same as `CLAUDE.md`). This page is the short version for people.

## Branches

- `main`: the frontend, the knowledge base and every document. It holds no backend code.
- `backend`: the Laravel backend (`backend/`), built on its own branch and merged with `main` from time to time (ADR-056). Backend issues and changelog rows go in `08-Logs/Backend-Issues-and-TODOs.md` and `08-Logs/Backend-Changelog.md`.
- Work on a short branch from the right one and open a pull request.

## Checks to run

```bash
cd frontend && npm test && npm run lint && npm run build   # frontend
cd backend && composer check                               # backend (on the backend branch)
npm run docs:check                                         # documents, from the repository root
```

When a number, screen, endpoint, table or ADR changes, also run `npm run docs:facts`, `npm run docs:trace`, `npm run docs:adrs` or `npm run docs:diagrams` as [Start Here](./CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md#keeping-the-documents-true) says.

## How a decision becomes an ADR

A change to what the system does, or to how it is built, is a decision. Tell Zean; it is recorded as the next ADR in `CLINIQ-Knowledge-Base/06-Decisions/` (copy `ADR-Template.md`), added to `Decisions-Summary.md`, and the matching canonical document is updated. Never edit an old ADR's decision text: add a dated note at its top.

## Never commit

- Real student, staff or parent data: names, LRNs, birthdates, phone numbers, addresses, health details. Use the sample data.
- `.env` files, passwords, keys (`APP_KEY`), tokens, database dumps, `vendor/`, `node_modules/`.
- Screenshots that show real data.

## Logs

Every change gets a session log in `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/` and a changelog row, with a real timestamp (AGENTS.md, "After you finish").
