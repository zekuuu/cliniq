Generic shared hooks not tied to one feature (e.g. auth state, session handling). Feature-specific hooks live inside their feature folder.

- `usePrefersReducedMotion` keeps chart motion aligned with the operating system accessibility preference.
- `useFocusFirstInvalid` moves focus to the first invalid field after a failed submit and announces how many need attention (`cliniq-input-patterns`).
- `useCancelNavigation` is the shared form Cancel; it asks before discarding unsaved input (`cliniq-modal-patterns`, ADR-021).
- `useGoBack` is the history-back-or-fallback logic shared by `BackButton` and `useCancelNavigation`; `DRILL_THROUGH_STATE` and `useIsDrillThrough` mark a list opened by a drill-through link (`cliniq-back-navigation-patterns`, ADR-024).
- `useAsyncData` loads a screen's data with loading, error, and refetch states (ADR-013).
- `useIdentifiedStudent` holds which student an entry form is about (picked on the form, or a reopened incident's student).
- `useDateRangeEntryParams` reads a one-time `from`/`to` entry filter from the URL.
- `usePatientFilter` keeps the Everyone / Students / Staff filter in `?patient=` (ADR-043).
- `usePageSize` holds the shared `Pagination`'s rows-per-page choice (10 or 20) for the browser session.
- `useCapsLock` warns when Caps Lock is on in a password field.
- `usePrinting` reports when the browser is printing, so print-only documents mount only then (ADR-026, `cliniq-print-patterns`).
