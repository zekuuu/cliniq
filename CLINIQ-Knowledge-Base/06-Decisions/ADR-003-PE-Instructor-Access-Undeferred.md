# ADR-003: PE/Sports Instructor Read-Only Access — Undeferred

**Date:** September 19, 2026 (team meeting)
**Status:** Superseded by ADR-029 (decided Saturday, October 17, 2026 — 07:52, at the team meeting of Friday, October 16, 2026, 7:00 PM; not built, so the app still has the Instructor role and screen). Earlier: accepted; amended by ADR-027 when QR was dropped.

## Context
ADR-002 had moved all external (non-Staff) QR access to a documented future phase. A team meeting on September 19 confirmed instructors should get real access now, not later.

## Decision
PE/Sports Instructor becomes a real, current-scope role: mobile-only, read-only access to a student's **full profile and visit/incident history** (not just the narrow allergy/emergency-contact subset originally planned), no action buttons, every view logged.

## Alternatives Considered
Keeping it deferred (the pre-meeting state) — rejected by direct team decision at the meeting. A narrower "emergency fields only" view was the original design before this ADR — rejected in favor of the fuller profile+history view per explicit instruction ("everything that could matter to the viewer, e.g. show all recent injuries").

## Consequences
Reintroduced the external-access risk ADR-002 had removed — mitigated by scope (read-only, no operational actions) and the audit trail, not by a separate session-security model. See the Project Plan's risk table (Section 5.4) for the explicit risk/mitigation pairing.
