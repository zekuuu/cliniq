Generic shared hooks not tied to one feature (e.g. auth state, session handling). Feature-specific hooks live inside their feature folder.

- `usePrefersReducedMotion` keeps chart motion aligned with the operating system accessibility preference.
- `useFocusFirstInvalid` moves focus to the first invalid field after a failed submit and announces how many need attention (`cliniq-input-patterns`).
- `useCancelNavigation` is the shared form Cancel; it asks before discarding unsaved input (`cliniq-modal-patterns`, ADR-021).
- `useGoBack` is the history-back-or-fallback logic shared by `BackButton` and `useCancelNavigation`; `DRILL_THROUGH_STATE` and `useIsDrillThrough` mark a list opened by a drill-through link (`cliniq-back-navigation-patterns`, ADR-024).
