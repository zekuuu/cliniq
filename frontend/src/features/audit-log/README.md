# Audit Log Viewer

Screen #35 (Module 11, ADR-016): Staff and Admin/Principal can browse a read-only, filterable audit log. The feature API reads through `src/lib/mock-db/` only during the frontend-first phase; opening this screen deliberately creates no audit event.

Print produces an A4 compliance document: the filters in words, the entry count, and every matching entry (ADR-026).
