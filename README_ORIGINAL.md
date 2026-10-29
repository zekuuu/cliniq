This is the longer overview of CLINIQ. The root [README.md](./README.md) is the short, current one, with the full status list (built, decided, not started). Last checked against the code on Thursday, October 29, 2026 (commit dde64408).

<div align="center">

# CLINIQ

### Intelligent Clinic Tracking and Monitoring System

Built for **Mendez Christian Academy** — Asis III, Mendez, Cavite, Philippines

*A CvSU–CEIT Software Engineering II capstone project*

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=mariadb&logoColor=white)

![Status](https://img.shields.io/badge/status-frontend%20on%20mock%20data%20%C2%B7%20backend%20not%20started-yellow?style=flat-square)
![Deployment](https://img.shields.io/badge/deployment-local%20LAN-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

</div>

<br/>

## 📖 About

**CLINIQ** replaces a Philippine private school clinic's manual, paper-and-Excel workflow with a locally hosted, LAN-deployed system built around one hard constraint: **one nurse, one shared workstation, ~900 students, and effectively no budget for new hardware.**

It exists to solve four problems identified in a weighted SWOT analysis — in order of priority:

| # | Problem |
|---|---|
| 1 | ⏱️ Time-consuming manual processes |
| 2 | 👤 Insufficient manpower |
| 3 | ⚠️ High risk of human error |
| 4 | 💻 Overdependence on a single device/system |

Every feature in this project — down to individual UI decisions like *which screens show a student's name versus just their ID number* — traces back to one of these four.

<br/>

## ✨ Key Features

<table>
<tr>
<td width="50%" valign="top">

**🩺 Core Clinic Operations**
- Student health records with duplicate detection
- Visit logging with an embedded first-aid checklist
- Two-stage emergency response (fast-capture now, complete later)
- Excuse letter generation, review, and print (every printout is a proper A4 document)
- Follow-Up Handling with built-in reminders (no SMS/push required)
- Teachers and other school staff as clinic patients, with their own Staff List (ADR-043)

</td>
<td width="50%" valign="top">

**📊 Operational Tools**
- Medicine & supply inventory with auto-decrementing stock and expiry tracking
- Clinic Overview Dashboard — Overview and Trends views: alerts and complaint trends
- Calendar — a separate screen for school events, national holidays and visit activity (ADR-032)
- Automated backup verification with a guided recovery checklist

</td>
</tr>
</table>

> Every feature above is built and runs on sample (mock) data; the backend is not built. Features decided but not built yet are listed in [README.md](./README.md#decided-not-built).

> 📋 Full breakdown of every module, every operation, and exactly who can access what: [`CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md`](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md)

<br/>

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| 🎨 Frontend | React + TypeScript, built with **Vite** | Modern SPA tooling, static build output — no Node runtime needed in production |
| 💅 Styling | Tailwind CSS | Utility-first, fast to build a consistent design system on |
| ⚙️ Backend | Laravel (PHP), planned | Batteries-included framework, small-team-friendly |
| 🔐 Auth | Laravel Sanctum (planned) | SPA-specific token/cookie auth, not generic session auth |
| 🗄️ Database | MariaDB (XAMPP), MySQL-compatible, planned | XAMPP ships MariaDB; Laravel reaches it through its MySQL driver |
| 📈 Charts | Chart.js + `react-chartjs-2` | Smaller bundle, Canvas rendering — matters on a 4GB RAM workstation |
| 🧪 Testing | Vitest + RTL (frontend) · Pest (backend, planned) | |
| 🏠 Local Dev | XAMPP, standardized across every machine | Matches the client's actual production environment |
| ☁️ Deployment | Local LAN today → remote/cloud is a documented future phase | API-driven architecture supports the move without a rewrite |

Every choice above was researched, not assumed — see [`ADR-007`](./CLINIQ-Knowledge-Base/06-Decisions/ADR-007-Stack-Finalization.md) for the full reasoning.

<br/>

## 📁 Project Structure

```
CLINIQ/
├── 🤖 AGENTS.md                 → start here if you're an AI coding agent
├── 🤖 CLAUDE.md                 → identical to AGENTS.md (Claude Code auto-loads this one)
├── 📄 README.md                 → short SRS-support entry point
├── 📄 README_ORIGINAL.md        → you are here (the fuller historical README)
├── 🛠️ setup-step.md             → first-time Windows setup for the frontend
├── 🔗 URL-Parameters.md         → active query parameters
│
├── 🎨 frontend/                 → React + TypeScript + Vite
│   └── src/features/            → one folder per module, feature-based structure
│
├── ⚙️ backend/                  → Laravel API (not scaffolded yet)
│   └── app/Modules/             → planned: one folder per module, mirroring the frontend directly
│
├── 🧠 .claude/skills/           → bespoke, CLINIQ-specific agent skills (full list: 04-Development/Skills-Setup.md)
│
└── 📚 CLINIQ-Knowledge-Base/    → the full project knowledge base (Obsidian-compatible)
    ├── 00-Project-Core/         → what this is, for whom, and why
    ├── 01-Requirements/         → functional & non-functional requirements
    ├── 02-Architecture/         → tech stack, system design, database
    ├── 03-Design/               → full design system + reference screens
    ├── 04-Development/          → setup, conventions, phases, skills
    ├── 05-Testing/               → test strategy and test cases
    ├── 06-Decisions/             → every ADR, with reasoning
    ├── 07-AI-Agents/             → agent workflow rules
    ├── 08-Logs/                  → changelog, session logs, open issues
    └── 09-References/            → the 5 canonical planning documents, in full
```

One repository, not three — frontend, backend, and the knowledge base travel together so documentation can never quietly drift out of sync with the code.

<br/>

## 🚀 Getting Started

> ⚠️ **Only the frontend exists so far.** It is built and runs on sample (mock) data. The backend is not scaffolded yet, and the database design is a [proposed draft](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md) awaiting team approval. The backend steps are what *will* run, not what already has.

**Prerequisites:** Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later · Git (the backend will also need XAMPP and Composer)

```bash
# 1. Clone the repo
git clone https://github.com/zekuuu/cliniq.git && cd cliniq

# 2. Frontend (runs on mock data; no PHP or database needed)
cd frontend
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

First-time Windows setup, step by step: [`setup-step.md`](./setup-step.md). Sign-in accounts for the mock data: [`frontend/src/lib/mock-db/README.md`](./frontend/src/lib/mock-db/README.md).

The backend (Laravel, Sanctum, MariaDB from XAMPP) is not set up yet; its planned steps, including *why* each choice was made: [`CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md`](./CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md)

<br/>

## 🗺️ Development Roadmap

Frontend and backend are built as two coordinated tracks — frontend leads (per feature) so the client sees and approves a working UI before backend logic is finalized behind it.

| Track | Phases |
|---|---|
| 🎨 **Frontend** | `F0` Setup & design tokens → `F1` 5 reference screens → `F2` every remaining screen, module by module → `F3` polish & accessibility *(screens built on mock data; the F3 demo-ready exit check is still open)* |
| ⚙️ **Backend** | `B0` Scaffold → `B1` Database schema *(a [proposed draft](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md), not final or approved — awaiting team approval)* → `B2` Auth/RBAC → `B3` Audit trail → `B4`–`B10` one phase per module |

Full phase-by-phase detail, dependencies, and the two Phase F0 decisions (now resolved in ADR-012 and ADR-013): [`CLINIQ-Knowledge-Base/04-Development/Development-Phases.md`](./CLINIQ-Knowledge-Base/04-Development/Development-Phases.md)

<br/>

## 👥 Team

**HealWare** is the team behind CLINIQ; its mark is already used as the app's system logo and favicon (see `.claude/skills/cliniq-sidebar-patterns/SKILL.md`).

| | Name | Role |
|---|---|---|
| 🧭 | **Ghenly B. Tinapay** | Project Manager |
| 🔍 | **Christian John C. Lugami** | System Analyst |
| 💻 | **Zean Kurt G. Balboa** | Developer / Tester |

**Client contact:** Ms. Jennesse Baas, School Head Nurse, Mendez Christian Academy (source: [Team and Roles](./CLINIQ-Knowledge-Base/00-Project-Core/Team-and-Roles.md)). In the app her role is named School Clinician.

<br/>

## 📚 Documentation

This project takes documentation seriously — every real decision has a paper trail.

- 📋 **[Project Plan](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Project_Plan.md)** — problem domain, approach, system design, timeline, budget (full revision history included)
- 🧩 **[Modules & Features](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Modules_and_Features.md)** — every module, submodule, and access rule
- 🖥️ **[Frontend Context Brief](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md)** — full spec for an AI coding agent
- 🎨 **[Frontend Design Reference](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md)** — the 5 reference screens, in depth
- 🔬 **[Review of Related Systems](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Review_of_Related_Systems.md)** — 10 existing systems compared, feature by feature
- 🗂️ **[Decision Log (ADRs)](./CLINIQ-Knowledge-Base/06-Decisions/)** — why, not just what
- 📝 **[Changelog](./CLINIQ-Knowledge-Base/08-Logs/Changelog.md)** — everything that's happened, in order
- 🔒 **[Privacy Policy](./CLINIQ-Knowledge-Base/09-References/Privacy-Policy.md)** — how the system handles student health data
- 🗄️ **[Database design (proposed draft)](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md)** — ERD, [data dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md), and [reference schema](./CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql); not final or approved
- 🔗 **[URL Parameters](./URL-Parameters.md)** — active query parameters, examples, and retired `?screen` history

<br/>

## 📄 License

MIT — see [`LICENSE`](./LICENSE). This was decided directly in the repo (not through this chat/vault workflow) — caught and synced here after checking the live GitHub repo, per the standing rule that the vault must be verified against GitHub before edits, not assumed current.

<br/>

## 🙏 Acknowledgments

- **Ms. Jennesse Baas** and Mendez Christian Academy, for the trust and the real-world constraints that shaped every design decision in this project
- **Prof. Kryss Coleen Creus**, Software Engineering II course adviser, CvSU–CEIT

<br/>

<div align="center">

*Built with care for a clinic that runs on one workstation and one very busy nurse.*

</div>
