# Non-Functional Requirements — Full Detail

Kept in sync with the canonical Project Plan, Section 5.1. If you edit one, edit both.

---

**Non-Functional Requirements:**
- **Performance:** must run acceptably on the existing minimum-spec workstation (Intel Core i3 or equivalent, 4GB RAM) with no perceptible lag during data entry. The React frontend is compiled into optimized static assets at build time, so the workstation only ever serves and renders a finished bundle — it does not need to run the heavier Node.js build tooling in production, only during development
- **Security & Privacy:** Laravel Sanctum (bcrypt password hashing, session/token handling), a 1-week session lifetime for Staff (the token expires after 7 days; there is no idle timeout, so urgent work is never interrupted, ADR-015), a 30-minute idle sign-out for the Admin/Principal (ADR-048), account lockout for 30 minutes after 5 failed logins, passwords reset by the Admin with a temporary password and, when the computer is online, by an email link (ADR-048), and handling aligned with RA 10173 (legitimate purpose, consent, purpose limitation, and a defined data retention policy — see Section 5.3)
- **Lockouts are audit-logged:** five wrong passwords in a row (at sign-in) lock the account for 30 minutes and write an audit entry against the account, never the passwords; a single wrong password is not logged (Zean, Friday, October 23, 2026)
- **Audit-log retention:** the audit log is kept **10 years** (ADR-037, Zean's answer of Thursday, October 22, 2026; **not yet confirmed by the school or its privacy officer**, see the open `DECIDE`). The backend must not delete audit rows earlier; no purge job exists in the frontend phase, and the public Privacy Policy does not state the period until the school confirms
- **Availability:** must function fully offline from the public internet, hosted on the clinic computer and served over the local network (LAN) only (ADR-029). In an emergency the nurse helps the student first, uses paper, and enters the record afterwards
- **Usability:** must be learnable by non-technical clinic staff within a single training session
- **Maintainability:** codebase and database schema documented clearly enough for the school's outsourced IT provider to support after the team's academic involvement ends
- **Modularity & Scalability:** each of the system's modules must be a loosely-coupled, independently developable and testable unit in the actual code, not just at the planning level — reduces cross-module breakage with 3 developers (and AI agents) working concurrently, and lets the system grow without a structural rewrite. Full architectural detail: Obsidian vault, `06-Decisions/ADR-008` (frontend) and `ADR-009` (backend)
