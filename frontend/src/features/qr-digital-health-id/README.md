# QR Digital Health ID

This feature has a real split inside it, matching how the module itself is designed (see `CLINIQ-Knowledge-Base/06-Decisions/ADR-002` and the Modules & Features canonical document): **one QR code, two very different experiences depending on who scanned it and from where.**

```
qr-digital-health-id/
├── desktop/    → QR printing only; the desktop scan hub was removed (ADR-023: no scanner hardware on the workstation)
├── mobile/     → the mobile-first experience — Staff's mobile version of the same hub, plus the separate Emergency button, plus PE/Sports Instructor's read-only lookup
├── shared/     → the actual camera-scanning logic, used by BOTH desktop and mobile (yes, desktop can scan too, e.g. a webcam) — this is where the `qr-scanner` (nimiq) wrapper lives (ADR-007), as one hook/component, not duplicated per context
└── api/        → API calls specific to this feature (lookup by Student Number, log a scan for the audit trail)
```

**Why `desktop/` and `mobile/` are separate folders, not just responsive CSS on one component:** the two aren't just resized versions of each other — they have different information architecture entirely. Desktop's quick-action hub assumes Staff, full access, all four actions. Mobile has three real variants layered together: Staff's version (same four actions, touch-sized), a standalone Emergency button that skips the hub entirely for speed, and Instructor's version (read-only, no actions, different data shown per the display-privacy rule). Trying to force all of that into one responsive component would fight the actual design more than it would save code.

**Why this isn't a separate frontend project:** it's still the same React app, same router, same auth, same Laravel API underneath — just a different layout/component tree for a subset of routes. Splitting it into its own deployable app would mean maintaining two builds and two deployment targets for what is, underneath, one system. See `CLINIQ-Knowledge-Base/02-Architecture/System-Architecture.md`.

**Reference for what each screen actually needs to contain:** `CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md`, Reference Screen 4.
