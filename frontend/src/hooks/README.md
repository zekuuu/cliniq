Generic shared hooks not tied to one feature (e.g. auth state, session handling). Feature-specific hooks live inside their feature folder.

- `usePrefersReducedMotion` keeps chart motion aligned with the operating system accessibility preference.
- `useFocusFirstInvalid` moves focus to the first invalid field after a failed submit and announces how many need attention (`cliniq-input-patterns`).
- `useCancelNavigation` is the shared form Cancel; it asks before discarding unsaved input (`cliniq-modal-patterns`, ADR-021).
