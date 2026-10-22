# ADR-023: QR Lookup Is Mobile-Only

**Date:** Wednesday, October 14, 2026 — 22:25
**Status:** Superseded by ADR-027 (decided Friday, October 16, 2026 — 18:54). **QR removal built Wednesday, October 21, 2026 — 01:09** ([2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); restore from git tag `pre-qr-removal` if the client later agrees to online hosting. Earlier: accepted (requested by Zean, project team).

## Context
The clinic workstation has no QR scanner hardware. The desktop sidebar's "QR Lookup" entry and the
Alt + Q shortcut opened the camera-based mobile hub on the workstation, and a separate desktop hub
(`/qr/desktop`, screen #23) offered webcam scanning. Zean: "the desktop view shouldn't have the qr
lookup since we wont have qr scanner hardware, only for mobile to use camera."

## Decision
- QR scanning is a phone-camera flow only. "QR Lookup" shows in the phone navigation menu (below `lg`),
  not in the desktop sidebar (`mobileOnly` flag in `layouts/navigation.ts`).
- The Alt + Q shortcut is removed.
- The desktop hub (`/qr/desktop`, `QrDesktopHubPage`) is deleted. On the workstation Staff identify a
  student through Students search and the StudentPicker on each entry form.
- Unchanged: `/qr/scan` (Staff and Instructor, on phones), the Emergency button, and QR printing
  (`/qr/print`), which the workstation still needs to produce the stickers.

## Consequences
- Narrows ADR-022: the phone menu is no longer an exact copy of the sidebar; it adds mobile-only entries.
- Module 6's "computer system" path no longer includes a scan/lookup hub. The canonical Modules &
  Features document needs the same update.
