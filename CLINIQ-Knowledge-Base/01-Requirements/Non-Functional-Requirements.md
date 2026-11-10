# Non-Functional Requirements — Full Detail

> Updated Tuesday, November 10, 2026 — 17:27 PHT for ADR-056 to ADR-079 and the code at `b51166a`: requirement IDs added (NFR-01 to NFR-08 are the existing bullets in order; new ones are appended), the session and recovery line corrected (ADR-073, ADR-078), deployment and backup rules added.

Kept in sync with the canonical Project Plan, Section 5.1. If you edit one, edit both.

---

**Non-Functional Requirements:**
- **NFR-01** **Performance:** must run acceptably on the existing minimum-spec workstation (Intel Core i3 or equivalent, 4GB RAM) with no perceptible lag during data entry. The React frontend is compiled into optimized static assets at build time, so the workstation only ever serves and renders a finished bundle — it does not need to run the heavier Node.js build tooling in production, only during development
- **NFR-02** **Security & Privacy:** Laravel Sanctum (bcrypt password hashing, session/token handling), a session that ends 7 days after sign-in however active the user is (ADR-015, 057), an idle sign-out per role (Staff 60 and Admin 30 minutes by default, each a setting of 10 to 240, with a 2-minute warning, ADR-048, 078), account lockout for 5 minutes after 5 failed logins, and password recovery with an authenticator app or the Admin's temporary-password reset, with no email address on any account (ADR-073), and handling aligned with RA 10173 (legitimate purpose, consent, purpose limitation, and a defined data retention policy — see Section 5.3)
- **NFR-03** **Lockouts are audit-logged:** five wrong passwords in a row (at sign-in) lock the account for 5 minutes and write an audit entry against the account, never the passwords; a single wrong password is not logged (Zean, Friday, October 23, 2026)
- **NFR-04** **Audit-log retention:** the audit log is kept **10 years** (ADR-037, ADR-051; settled in ADR-057, Sunday, November 1, 2026). The backend must not delete audit rows earlier; no purge job exists yet
- **NFR-05** **Availability:** must function fully offline from the public internet, hosted on the clinic computer and used only there at `http://localhost`; no other computer reaches it (ADR-029, ADR-079). In an emergency the nurse helps the student first, uses paper, and enters the record afterwards
- **NFR-06** **Usability:** must be learnable by non-technical clinic staff within a single training session
- **NFR-07** **Maintainability:** codebase and database schema documented clearly enough for the school's outsourced IT provider to support after the team's academic involvement ends
- **NFR-08** **Modularity & Scalability:** each of the system's modules must be a loosely-coupled, independently developable and testable unit in the actual code, not just at the planning level — reduces cross-module breakage with 3 developers (and AI agents) working concurrently, and lets the system grow without a structural rewrite. Full architectural detail: Obsidian vault, `06-Decisions/ADR-008` (frontend) and `ADR-009` (backend)
- **NFR-09** **Deployment:** the clinic PC only, at `http://localhost`; no LAN access, no hostname, no HTTPS; Windows Firewall blocks inbound connections; a Windows password and screen lock, BitLocker on Windows Pro, and one Staff account per person, because the room is shared and unlocked (ADR-079)
- **NFR-10** **Backup and recovery:** a daily automatic backup to the chosen locations, the latest 60 kept per location, a warning after 48 hours without a good backup, a guided recovery checklist; no cloud copy, and not only on the clinic PC's own disk (ADR-037, 039, 052, 079)
- **NFR-11** **Retention:** student and staff-patient records are kept 5 years from their archive date; the audit log 10 years and append-only (the application account cannot update or delete it) (ADR-051, 057)
- **NFR-12** **Data integrity:** the approved schema enforces its rules in the database (CHECK, UNIQUE and foreign-key constraints, tested by the constraint tests; counts in the Facts sheet) (ADR-057)
