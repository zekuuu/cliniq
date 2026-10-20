# ADR-005: Student Number Format — YYYY-NNNNN

**Date:** September 17, 2026
**Status:** Superseded by ADR-027 (decided Friday, October 16, 2026 — 18:54). **The Student Number was removed from the app Wednesday, October 21, 2026 — 07:00** ([2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); students carry the LRN (ADR-028). Earlier note: "potentially superseded pending the barcode-scanner proposal". Replacement identifier: the LRN (ADR-028).

## Context
Needed a unique, scalable, memorable student identifier to embed in the QR code and use as the system's primary lookup key.

## Decision
`YYYY-NNNNN` — enrollment year + zero-padded 5-digit sequence, resetting each year, system-generated at record creation.

## Alternatives Considered
A lettered code (e.g. `ABC-123`) — rejected for visually ambiguous characters (0/O, 1/I) that hurt manual entry, and for needing a pre-planned combinatorial scheme to avoid running out, unlike a year-prefixed number which scales by construction.

## Consequences
**Open question as of the barcode-scanner discussion (see Issues-and-TODOs):** MCA may already have an existing student masterlist with its own embedded barcode per student. If a physical scanner proposal is approved, this ADR may need revisiting — either the existing barcode replaces this scheme, or the two coexist. No decision made yet; do not build against an assumption either way.
