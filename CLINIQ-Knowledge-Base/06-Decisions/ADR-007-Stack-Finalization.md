# ADR-007: Tech Stack Finalization

**Date:** September 25, 2026
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.

## Context
Several stack items had been proposed but left unconfirmed: authentication package, build tool, QR generation/scanning libraries, dev environment standardization, and a charting library. Rather than confirm the first plausible-looking option for each, current maintenance status and compatibility were actually researched.

## Decisions

**Vite (build tool).** Confirmed as the 2026 default for new React SPAs. Create React App is deprecated; Vite is described as "the safest choice for most teams" in current sourcing. No serious alternative (Rspack, Turbopack) fit better than the default for a project this size.

**Laravel Sanctum (auth).** "Laravel Authentication" was too generic for a React SPA — Sanctum is the specific package built for exactly this pairing (SPA-mode cookie/token auth).

**XAMPP, standardized across all dev machines.** Matches the client's production environment exactly, avoiding a "works on my machine" gap between development and the actual deployed system.

**`endroid/qr-code` (backend QR generation), not `simplesoftwareio/simple-qrcode`.** The original candidate has had no real release since 2021, with maintainers themselves noting outdated documentation and no active development. `endroid/qr-code` is actively maintained and is the base multiple newer Laravel QR packages build on.

**`qr-scanner` (nimiq), not `@yudiel/react-qr-scanner` (frontend QR scanning) — the one finding worth flagging clearly.** `@yudiel/react-qr-scanner` looks like the obviously modern pick: React hooks, full TypeScript support, built on the browser's native Barcode Detection API. That last part is the problem. **Safari on iOS has never implemented the Barcode Detection API — not partially, not behind a flag, just not at all — and it still doesn't as of mid-2026 sourcing** (WebKit bug tracking it has been open since 2024 with no resolution). A library built purely on that API doesn't gracefully degrade; scanning would silently fail on every iPhone. Since CLINIQ's QR scanning is used by Staff and PE/Sports Instructors on personal phones over the school Wi-Fi — a mixed Android/iOS population in any realistic Philippine school setting — this isn't a hypothetical edge case. `qr-scanner` uses the native API when present (smaller bundle, better performance) and falls back to its own WebWorker-based decoder when it isn't, working identically on both platforms. Trade-off: it isn't React-specific out of the box, so it needs a small custom hook/component wrapper — a few lines of low-risk code, versus a feature that silently doesn't work for a large share of real users.

**Chart.js (via `react-chartjs-2`), not Recharts.** Current sourcing puts Chart.js's gzipped bundle at roughly a third to half of Recharts', and it renders via Canvas rather than SVG DOM nodes — both favor the 4GB RAM target over Recharts' nicer JSX composability. Recharts remains the more ergonomic choice for teams building many complex, highly custom charts; CLINIQ's dashboard needs (trend lines, a calendar heatmap, a handful of stat visualizations) don't need that flexibility badly enough to justify the extra weight on this hardware.

## Alternatives Considered
Covered inline above per decision — each one had a real, currently-popular alternative that was deliberately not chosen for a stated reason, not just defaulted to habit.

## Consequences
- The Project Plan's Section 4.3 tech stack table has been updated to name these specifically rather than leaving "e.g." placeholders (Revision 2.2).
- `qr-scanner`'s lack of a built-in React wrapper is a small, known, accepted cost — whoever builds the QR scanning screens should budget a little extra time for that wrapper, not treat it as a blocker or reason to reconsider.
- If a future browser update changes Safari's Barcode Detection API support, this decision is still safe either way — `qr-scanner` will simply start using the faster native path automatically, with no code change needed.
