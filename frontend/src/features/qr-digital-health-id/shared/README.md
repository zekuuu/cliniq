# Shared — QR Scanning Logic

The actual camera-scanning implementation, used by both mobile contexts (Staff scan, Instructor scan). One implementation, not two. Since ADR-023 the computer does not scan, so `../desktop/` does not use it.

Built on `qr-scanner` (nimiq), not a React-native QR library — see `CLINIQ-Knowledge-Base/06-Decisions/ADR-007-Stack-Finalization.md` for why: it falls back to its own decoder on browsers without the Barcode Detection API (i.e., every iPhone), where a purely-native-API library would silently fail to scan at all.

`useQrScanner` (wraps the library, exposes scan results/errors/loading state) and `QrScannerView` (the actual camera viewfinder UI) live here, consumed by `../mobile/`.
