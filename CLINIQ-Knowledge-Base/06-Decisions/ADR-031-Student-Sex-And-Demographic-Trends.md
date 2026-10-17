# ADR-031: Student sex is a required school-record field; Trends uses aggregates only

**Date:** Saturday, October 17, 2026 — 12:37 PHT
**Status:** Accepted

## Context

The professor asked for demographic Trends, including a Sex chart and grade-level analysis. The Student record did not hold this attribute, so no accountable aggregate could be produced.

## Decision

1. The Student record stores required **Sex**, using only `female` or `male` as recorded by the school. It is required on Add and Edit Student and is shown on the deliberate single-student profile and Student Health Record.
2. The frontend mock migrates older persisted records with deterministic, explicitly synthetic values solely so the demo remains usable. It does not infer a real student's sex. A production import must supply the school-recorded value.
3. A Sex change is an audited student update. Its audit summary names the field only and never stores either value.
4. Trends shows aggregate counts only: a Sex donut and grade-level bars. Selecting a Sex or grade updates only Trends statistics through reloadable `?sex=` and `?grade=` state; Overview totals remain unfiltered. The charts, controls, payloads, and accessible labels contain no student names.
5. Neutral categorical colors, textual labels, counts, and percentages make each segment understandable without color alone.

## Consequences

- The ERD draft and data dictionary record the proposed constrained column, but backend migrations remain blocked until the draft is approved.
- The team still needs to choose a minimum group size before treating demographic output as safe for reports or production use; the frontend currently shows its synthetic demo aggregates.
- The canonical Modules & Features document now needs this accepted requirement kept in sync with its forthcoming QR/LRN scope revision.
