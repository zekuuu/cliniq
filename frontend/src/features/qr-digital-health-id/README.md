# QR Digital Health ID

This feature has a real split inside it, matching how the module itself is designed (see `CLINIQ-Knowledge-Base/06-Decisions/ADR-002` and the Modules & Features canonical document): **one QR code, printed on the computer and scanned only on a phone, with two very different experiences depending on who scanned it.**

```
qr-digital-health-id/
├── desktop/    → QR printing only; the desktop scan hub was removed (ADR-023: no scanner hardware on the workstation)
├── mobile/     → the only scan/lookup flow: Staff's scan/lookup hub with its quick actions, plus the separate Emergency button, plus PE/Sports Instructor's read-only lookup
├── shared/     → the actual camera-scanning logic (`useQrScanner` + `QrScannerView`), used by `mobile/` — this is where the `qr-scanner` (nimiq) wrapper lives (ADR-007), kept apart from the page so the camera handling stays in one place
└── api/        → API calls specific to this feature (lookup by Student Number, which logs the lookup for the audit trail; student search; the student list for sticker printing)
```

**Why scanning is phone-only, and what `desktop/` still holds:** the clinic workstation has no QR scanner hardware, so the computer prints QR stickers but never scans them (ADR-023); the former desktop scan/lookup hub was removed. `desktop/` keeps only the sticker printing. `mobile/` has three real variants layered together: Staff's version (four quick actions, touch-sized), a standalone Emergency button that skips the hub entirely for speed, and Instructor's version (read-only, no actions, different data shown per the display-privacy rule).

**Why this isn't a separate frontend project:** it's still the same React app, same router, same auth, same Laravel API underneath — just a different layout/component tree for a subset of routes. Splitting it into its own deployable app would mean maintaining two builds and two deployment targets for what is, underneath, one system. See `CLINIQ-Knowledge-Base/02-Architecture/System-Architecture.md`.

**Reference for what each screen actually needs to contain:** `CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Frontend_Design_Reference.md`, Reference Screen 4.
