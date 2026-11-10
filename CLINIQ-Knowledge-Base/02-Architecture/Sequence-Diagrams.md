# Sequence Diagrams

Added Tuesday, November 10, 2026 — 17:27 PHT. Sources: [API Contract](../04-Development/API-Contract.md) ("Sign-in", "Idle sign-out", authentication entries), `backend/app/Shared/Http/KeepAliveController.php` and the `session.fixed` / `session.idle` middleware, [ADR-018](../06-Decisions/ADR-018-Stock-Integrity-For-Items-Given.md), [ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md), [ADR-073](../06-Decisions/ADR-073-Password-Recovery-With-An-Authenticator-App.md), [ADR-078](../06-Decisions/ADR-078-Staff-Idle-Signout-Idle-Times-Are-Settings.md). The keep-alive and the session middleware are built and tested; the other endpoints are contract entries, not yet built. Exports: `Database/Diagrams/Sequence-1-Sign-In` to `Sequence-4-Visit`, `.svg` and `.png`.

## 1. Sign-in with the Sanctum SPA cookie

**Figure:** the browser first fetches a CSRF cookie, then signs in; every later request carries the session cookie and echoes the token. No API token is issued.

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Laravel API
    participant D as MariaDB
    B->>A: GET /sanctum/csrf-cookie
    A-->>B: XSRF-TOKEN cookie
    B->>A: POST /api/auth/login (X-XSRF-TOKEN)
    A->>D: read user, failed count, lock
    alt wrong password
        A->>D: count failure
        A-->>B: 401 invalid_credentials, attempts_left
        Note over A,B: 5th failure: 423 account_locked for 5 minutes, audited
    else correct
        A->>D: reset count, store sign-in time
        A-->>B: 200 user + session cookie
    end
```

## 2. Idle sign-out and keep-alive

**Figure:** every API call counts as activity. The warning dialog's "Stay signed in" sends a keep-alive; once the role's idle minutes pass, the next call is refused and the browser returns to Login.

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as session.idle middleware
    participant A as API
    B->>M: any API call
    M->>M: idle limit for the role (Staff 60, Admin 30)
    M->>A: allowed, last activity = now
    Note over B: 2 minutes before the limit: "Still there?"
    B->>M: POST /api/session/keepalive
    M-->>B: 200 idle seconds left
    Note over B: no answer
    B->>M: next call after the limit
    M-->>B: 401 session_idle, "Signed out (idle)" audited
```

## 3. Password recovery with an authenticator app

**Figure:** recovery works offline: the app on the phone and the server derive the same 6-digit code from a shared secret.

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant A as API
    U->>B: Forgot password? + username
    B->>A: POST /api/auth/recovery/check
    A-->>B: 204 (or 422: ask the Administrator)
    U->>B: 6-digit code from the phone
    B->>A: POST /api/auth/recovery/verify
    A->>A: check code, never reuse a step
    A-->>B: one-time token, 10 minutes
    U->>B: new password (8+ characters, not one of the last 5)
    B->>A: POST /api/auth/recovery/reset
    A-->>B: 204, password changed, audited
```

## 4. Recording a visit with stock deduction and its audit entry

**Figure:** one transaction saves the visit, its medicine lines and the stock movements, earliest-expiring batch first, and writes one audit entry with field names only.

```mermaid
sequenceDiagram
    participant B as Browser
    participant A as Visits API
    participant D as MariaDB
    B->>A: POST /api/visits (symptoms, lines, disposition)
    A->>D: begin transaction
    A->>D: insert visit and treatment_item_lines
    A->>D: dispense from inventory_batches, earliest expiry first
    A->>D: insert inventory_transactions
    A->>D: insert audit_logs (who, action, target, no names)
    A->>D: commit
    A-->>B: 201 visit
```
