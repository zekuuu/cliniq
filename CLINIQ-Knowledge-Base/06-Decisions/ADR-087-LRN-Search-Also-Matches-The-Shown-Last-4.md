# ADR-087: A student search by LRN also matches the shown last 4 digits

**Date:** Sunday, November 22, 2026 — 02:15 PHT
**Status:** Accepted (Zean, Sunday, November 22, 2026: "also when searching for LRN it should check the masked start numbers and also the visible 4 last number")
**Amends:** [ADR-028](ADR-028-LRN-As-Student-Identifier.md) item "search by name or LRN prefix" for the student and patient searches. Lines up with the logs' last-4 match (ADR-080 item 7, `lrnMatchesSearch`).

## Context
- Lists, pickers and printouts show the LRN masked to its last 4 digits (ADR-040). The student search (StudentPicker, PatientPicker, the top-bar search, the Student List) matched only the start of the full LRN, so typing the 4 digits a person can see on screen found nothing.

## Decision
1. Typed digits (spaces and dashes ignored) find a student when they match **the start of the full LRN**, or, for **up to 4 digits**, appear **in its last 4**.
2. Five digits or more match only the start, so a long entry stays exact.
3. One rule on both sides: frontend `fullLrnMatchesSearch` (`frontend/src/lib/lrn.ts`, used by the mock's `searchStudents`) and backend `Lrn::searchMatches` (used by `StudentService::matches`, behind `POST /api/students/search`, `POST /api/patients/search` and the Student List's search).
4. LRN matches still come before name matches; the cap of 8 results stays.

## Consequences
- A short entry such as "01" matches more students than before; the cap and the LRN-first order keep the list short.
- No API shape change.

## Canonical documents to update
Modules & Features (Module 1: student search by LRN).
