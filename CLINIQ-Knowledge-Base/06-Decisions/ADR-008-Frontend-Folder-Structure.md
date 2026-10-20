# ADR-008: Feature-Based Frontend Structure, with QR Desktop/Mobile/Shared Split

**Date:** September 25, 2026
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.

**Update (Monday, September 28, 2026 — 19:19):** the top-level folder is `frontend/`. Paths in this record use that name; the decision itself is unchanged.

## Context
Needed to decide how `frontend/src/` is organized before any component code is written, and specifically where QR scanning code belongs — it's the one feature with a real desktop/mobile split, and it wasn't obvious whether that warranted its own frontend project.

## Decision
**Feature-based folder structure** (`src/features/<module>/`), one folder per module from the Modules & Features canonical document, rather than organizing by file type (`src/components/`, `src/pages/`, `src/hooks/` all flat). Generic, truly cross-feature code still gets its own top-level folders (`components/`, `layouts/`, `hooks/`, `lib/`, `types/`), but feature-specific code lives inside that feature's folder, not scattered across the generic ones.

**Within `features/qr-digital-health-id/`, a further split into `desktop/`, `mobile/`, `shared/`, `api/`.** The desktop and mobile experiences aren't responsive variants of one component — they have different information architecture (desktop: one hub, four actions; mobile: three separate experiences — Staff hub, standalone Emergency button, Instructor read-only lookup). `shared/` holds the actual camera-scanning implementation (the `qr-scanner` wrapper, ADR-007) once, since every context uses the same underlying scan mechanism and only the post-scan behavior differs.

**Not a separate frontend project for mobile.** Same React app, same router, same Sanctum auth, same Laravel API — splitting into two deployable apps would mean two builds and two deployment targets for what is one system underneath. The desktop/mobile split is organizational (where the code lives), not architectural (how it's built or shipped).

## Alternatives Considered
- **Flat/type-based structure** (`components/`, `pages/`, `hooks/` at the top level, everything mixed in together) — the more common default for small React apps, but doesn't scale cleanly to ~37 screens across 10 modules; finding "everything related to Inventory" would mean searching across half a dozen folders instead of opening one.
- **A separate `cliniq-mobile/` project** for the QR mobile flows — rejected; no technical driver for it (not a different backend, not a different auth model, not a different deployment target), and it would have doubled the build/deploy surface for a single feature's two contexts.

## Consequences
- Every feature folder got a short `README.md` explaining what belongs there — cheap to write now, before code exists, and keeps the "where does X go" question answered for whoever (human or agent) adds the first component.
- `AGENTS.md` and `CLAUDE.md` moved from inside the vault to the true repo root, since the repo root — not the vault — is what any agent or person actually finds first when opening this repository. The vault's own copies were removed rather than kept as a second version that could drift.
