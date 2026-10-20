# CLINIQ

CLINIQ is an intelligent clinic tracking and monitoring system for Mendez Christian Academy. The Project Plan and related documents in this repository were prepared as working reference material during planning, not as the team's official deliverable. The formal Software Requirements Specification is being written separately; this repository supports that work. Current state: the browser app (frontend) is built and runs on sample (mock) data, the server side (backend) is not built yet, and the database design is a proposed draft awaiting team approval.

For the fuller historical README, see [README_ORIGINAL.md](./README_ORIGINAL.md), which retains the former repository overview, feature list, team information, and implementation-oriented reference links.

## Project Context

This area explains why CLINIQ exists for a 900-plus-student school clinic with one nurse, one shared workstation, limited budget, and LAN-only operation. It brings together the problem evidence, intended outcomes, scope limits, and the people responsible for the project.

- [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md) — the clinic setting, hardware and staffing constraints, team, client contact, and background rationale for digitizing the current paper-and-Excel process.
- [Problem Statement](./CLINIQ-Knowledge-Base/00-Project-Core/Problem-Statement.md) — the four priority problems from the weighted SWOT analysis: slow manual work, insufficient staff, human error, and dependence on one device.
- [Objectives](./CLINIQ-Knowledge-Base/00-Project-Core/Objectives.md) — the measurable aims, including faster visit documentation, automated reports, verified backups, and the project budget target.
- [Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md) — the baseline and enhancement modules in this release, plus clear exclusions such as remote access, parent portals, automated messaging, billing, and extra scanning hardware.
- [Team and Roles](./CLINIQ-Knowledge-Base/00-Project-Core/Team-and-Roles.md) — the client, school partners, course adviser, three team members' responsibilities, planned deliverables, and target milestones.

## Requirements

This area turns the project scope into required system behavior, quality limits, access rules, and detailed module operations. It is the place to confirm what the system must do, who may do it, and the limits imposed by the school's equipment and privacy responsibilities.

- [Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Functional-Requirements.md) — the required clinic functions, from role-based sign-in and student records to visits, two-stage emergencies, follow-ups, reports, inventory, dashboard alerts, backups, and audit entries.
- [Non-Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Non-Functional-Requirements.md) — performance on the 4 GB workstation, LAN-only availability, privacy and session safeguards, usability for non-technical staff, maintainability, and modular growth expectations.
- [User Roles and Permissions](./CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md) — the Staff and Admin or Principal access boundaries (PE/Sports Instructors have no account), including the privacy rule for names on multi-student screens and the deferred Canteen Staff role.
- [Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md) — the complete operations and access rules for all clinic modules, including follow-up status handling, inventory stock flow, dashboard content, the audit trail, open questions, and deferred future work.

## Screens & UI Reference

The design area contains the full screen list alongside the design system, reference-screen patterns, a visual audit, and source mockup assets. It explains both which screens exist and the presentation rules that keep their behavior and appearance consistent.

- [Screen Inventory](./CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md) — the approximately 37 screens and views, organized by module, with each screen's purpose, role access, major behavior, privacy treatment, and print-layout needs.
- [Design System](./CLINIQ-Knowledge-Base/03-Design/Design-System.md) — the shared visual and interaction rules every screen follows, including privacy display, forms, navigation, Back, and printouts.
- [Reference Screens](./CLINIQ-Knowledge-Base/03-Design/Reference-Screens.md) — the five reference screens whose patterns the remaining screens reuse.

## Architecture & Tech Stack

The architecture area explains how the browser app, clinic service, and database fit together, and also contains process and data diagrams, the data-retention policy, and the current ERD status. It is useful when the SRS needs to describe system boundaries, information flow, or the intended local-LAN deployment.

- [Plain-language technology summary](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack-Summary.md) — a short explanation of the browser app, server, database, local network, charts, routing, and shared data-loading approach.
- [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md) — the confirmed technology choices and the specific compatibility, maintenance, and low-spec-workstation reasons for each.
- [System Architecture](./CLINIQ-Knowledge-Base/02-Architecture/System-Architecture.md) — the three-tier React, Laravel, and MySQL arrangement, local deployment path, future cloud path, and matching frontend and backend module organization.
- [Entity-Relationship Diagram](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md) — the proposed 34-table design for student records, visits, emergency response, inventory, access, and operations; it is a draft, not final or approved, and its 18 open decisions must be settled before migrations can begin.
- [Data Dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md) — the column-by-column reference for the same proposed database-design draft.
- [Reference Schema](./CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql) — the review-only reference DDL for the draft, not a migration; migrations stay blocked until the team approves the design.
- [Development Methodology](./CLINIQ-Knowledge-Base/02-Architecture/Development-Methodology.md) — the iterative, phase-gated approach and the decision to show interface prototypes to the client before completing supporting system work.

## Key Decisions

The decisions area holds the accepted records for choices that change system behavior or project direction, from privacy and roles to sessions, navigation, data handling, the audit-log screen, and the newer interface rules. Each full record explains the reason for the decision and any follow-on effects that the SRS may need to reflect.

- [Plain-language decisions summary](./CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md) — 26 short explanations of the accepted decisions (ADR-001 to ADR-026), including the session-lifetime rule (ADR-015), Back navigation, the Dashboard's separate views, A4 printouts, the unsaved-changes confirmation, and the phone navigation menu.

For the full records and their reasoning, see the CLINIQ-Knowledge-Base/06-Decisions/ folder.

## The Actual Reference Documents

The references area preserves the five authoritative planning documents in full, together with their technical index, external research sources, and the project privacy policy. Use it when an SRS statement needs the original evidence or wording instead of a knowledge-base summary.

- [Plain-language guide to the canonical documents](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents-Summary.md) — explains what each authoritative document covers and when an SRS writer should open its full version.

For the complete source documents, see the CLINIQ-Knowledge-Base/09-References/Canonical-Documents/ folder.
