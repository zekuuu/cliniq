# Desktop — QR Digital Health ID

QR sticker printing (`QrPrintPage`). The desktop scan/lookup hub was removed (ADR-023): the workstation has no QR scanner hardware, so scanning happens only in `mobile/` with the phone camera.

Full behavior spec: Frontend Context Brief, screen #22.

Print produces an A4 sheet with one sticker in a dashed cut box (QR and Student Number), no footer (ADR-026). The QR itself is still a placeholder pattern (`FIX` in Issues-and-TODOs).
