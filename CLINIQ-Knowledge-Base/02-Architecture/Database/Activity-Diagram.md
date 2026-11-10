# Activity Diagrams

**Status: first draft, built from already-documented requirements.** These flows (two remain) were identified (in this same file, before this draft existed) as the highest-priority candidates — the ones with the most non-obvious branching logic already written out in prose across the Frontend Context Brief, Frontend Design Reference, and Modules & Features. Built directly from that prose, not invented.

## 1. (Removed)

This flow described the QR scan and its quick actions, which were removed from the app (ADR-027). The section number is kept so the other flows keep theirs.

## 2. Two-Stage Emergency Response Flow

The clearest case of a genuine state machine in the whole system — modeled as one, not a linear flowchart.

```mermaid
stateDiagram-v2
    [*] --> Stage1_InProgress: Staff opens Incident Entry

    Stage1_InProgress --> Stage1_Saved: Save (complaint only,<br/>readings as needed —<br/>nothing else required)

    Stage1_Saved --> NeedsCompletion: Status badge shows<br/>"Needs Completion"

    NeedsCompletion --> Stage2_InProgress: Staff reopens the record<br/>once the immediate<br/>situation is handled

    Stage2_InProgress --> Stage2_InProgress: Add readings as needed,<br/>treatment notes,<br/>hospital referral,<br/>parent notification attempts

    Stage2_InProgress --> Complete: Stage 2 saved<br/>(everything optional, ADR-065)

    NeedsCompletion --> [*]: (record remains open<br/>indefinitely until completed —<br/>no forced deadline)
    Complete --> [*]

    note right of Stage1_Saved
        Every save at every stage
        writes to the Audit Trail
        (login/submit/approve —
        Stage 1 save counts as a
        submit event, logged
        independently of Stage 2)
    end note
```

**Why this matters as its own diagram:** the entire design rationale for the two-stage flow is "speed over completeness in the first moment" — a flowchart that treated this as one linear "fill out the incident form" process would misrepresent the actual requirement. The state diagram makes explicit that `NeedsCompletion` is a real, potentially long-lived state, not a transient step.

## 3. Follow-Up Handling Flow

Shared between Clinic Visit Monitoring and Emergency Response — same feature, two entry points, converging on one flow.

```mermaid
flowchart TD
    VISITEND([Staff finishes<br/>Record Visit]) --> PROMPT
    INCIDENTEND([Staff finishes<br/>Log Emergency]) --> PROMPT

    PROMPT{"Does this student<br/>need a follow-up?"}
    PROMPT -->|No| SAVENORMAL[Save visit/incident<br/>as normal] --> DONE1([End])

    PROMPT -->|Yes| CAPTURE[Capture inline:<br/>follow-up date,<br/>reason/instruction,<br/>optional notes]
    CAPTURE --> SAVEBOTH[Save visit/incident<br/>AND Follow-Up together —<br/>one flow, not two separate steps]
    SAVEBOTH --> PENDING[Follow-Up status: Pending]

    PENDING --> DASHBOARD[/Surfaces on Clinic Overview<br/>Dashboard's due/upcoming list —<br/>computed fresh on page load,<br/>NOT a push notification/]

    DASHBOARD --> STAFFCHECK{Staff reviews<br/>due follow-ups}
    STAFFCHECK -->|Student returned,<br/>monitored| COMPLETED[Mark: Completed]
    STAFFCHECK -->|Student never<br/>returned| MISSED[Mark: Missed]
    STAFFCHECK -->|No longer<br/>needed| CANCELLED[Mark: Cancelled]
    DASHBOARD -->|7 days past the date,<br/>still Pending| MISSED

    COMPLETED --> DONE2([End])
    MISSED --> DONE2
    CANCELLED --> DONE2
```

**The one design constraint this diagram exists to make visible:** the "surfaces on Dashboard" step is explicitly a *pull* mechanism (Staff has to look), not a *push* one — there's no background job or notification service anywhere in this architecture (Project Plan §1.4, SMS/push explicitly out of scope). Any implementation that tries to add a scheduled reminder job would be solving a problem this flow was deliberately designed not to need.

## 4. Sign-In with Lock-Out, Forced Change and Idle Sign-Out

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-015, ADR-057, ADR-078). Exports: `Diagrams/Activity-4-Sign-In.svg` and `.png`.

```mermaid
flowchart TD
    A([Open http://localhost]) --> B[Enter username and password]
    B --> C{Account locked?}
    C -- Yes --> D[Show: try again in 5 minutes] --> B
    C -- No --> E{Password correct?}
    E -- No --> F[Count failure; say attempts left]
    F --> G{5 failures in a row?}
    G -- Yes --> H[Lock for 5 minutes; audit the lock-out] --> B
    G -- No --> B
    E -- Yes --> I{Must change password?}
    I -- Yes --> J[Force Password Change] --> K
    I -- No --> K[Dashboard]
    K --> L{Idle for the role's minutes<br/>Staff 60, Admin 30?}
    L -- 2 minutes before --> M[Still there? countdown]
    M -- Stay signed in --> K
    M -- No answer --> N[Signed out idle; audited] --> A
    K --> O{7 days since sign-in?}
    O -- Yes --> P[Session ends] --> A
```

## 5. Password Recovery with an Authenticator App

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-073; no email). Exports: `Diagrams/Activity-5-Recovery.svg` and `.png`.

```mermaid
flowchart TD
    A([Forgot password? on Login]) --> B[Enter username]
    B --> C{Authenticator set up?}
    C -- No --> D[Ask the Admin to reset it] --> Z([End])
    C -- Yes --> E[Enter 6-digit code or a recovery code]
    E --> F{Code valid and unused?}
    F -- No --> G[One shared error; counts toward the lock-out] --> E
    F -- Yes --> H[Choose a new password]
    H --> I{8+ characters, not one of the last 5?}
    I -- No --> H
    I -- Yes --> J[Password changed; audited; sign in] --> Z
```

## 6. Visit, from Arrival to Release

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-018, ADR-036, ADR-049, ADR-070, ADR-071). Exports: `Diagrams/Activity-6-Visit.svg` and `.png`.

```mermaid
flowchart TD
    A([Patient arrives]) --> B[Find student by LRN or name, or a staff member]
    B --> C[Choose symptoms; first-aid checklist appears]
    C --> D{Emergency?}
    D -- Yes --> E[Escalate to an incident] --> Z([End])
    D -- No --> F[Treatment notes; pick medicines, suggested first]
    F --> G[Disposition: back to class or work, resting,<br/>sent home with Released to, or hospital]
    G --> H[Save: stock deducted, earliest expiry first; audited]
    H --> I{Follow-up needed?}
    I -- Yes --> J[Create follow-up]
    I -- No --> K{Excuse letter?}
    J --> K
    K -- Yes --> L[Draft, approve, print]
    K -- No --> Z
    L --> Z
```

## 7. Yearly Student List Import and Archive

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-047, ADR-051, ADR-072). Exports: `Diagrams/Activity-7-Import.svg` and `.png`.

```mermaid
flowchart TD
    A([Registrar's list file]) --> B[Staff choose the CSV]
    B --> C[Match the columns]
    C --> D[Preview: new, updated, missing, problems]
    D --> E{Apply?}
    E -- No --> Z([End])
    E -- Yes --> F[Add and update students; grade and section set]
    F --> G[Students missing from the list shown for review]
    G --> H[Archived with the school year; kept 5 years]
    H --> I[Incomplete records queued for review; audited] --> Z
```

## 8. Ending and Starting a School Year

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-072, ADR-075). Exports: `Diagrams/Activity-8-School-Year.svg` and `.png`.

```mermaid
flowchart TD
    A([Dashboard banner 7 days before a due day]) --> B{Which is due?}
    B -- End, around April 14 --> C[Staff press End school year]
    C --> D[Break: records stay in the ended year]
    D --> E([Banner before the next start])
    B -- Start, around June 15 --> F[Staff press Start school year]
    E --> F
    F --> G[New year stored and audited]
    G --> H[Import the new student list] --> Z([End])
    B -- Overdue --> I[Banner turns to a warning] --> B
```

## 9. Backup Run

Added Tuesday, November 10, 2026 — 17:27 PHT (ADR-037, ADR-039, ADR-052, ADR-079). Exports: `Diagrams/Activity-9-Backup.svg` and `.png`.

```mermaid
flowchart TD
    A([Daily schedule or Back up now]) --> B[For each enabled location]
    B --> C{Location found and writable?}
    C -- No --> D[Record failure for that location]
    C -- Yes --> E[Write zip to .cliniq/backups/YYYY/MM]
    E --> F[Keep the latest 60; log the result]
    D --> G
    F --> G{All locations done?}
    G -- No --> B
    G -- Yes --> H[Update backup status; audited]
    H --> I{Last good backup older than 48 hours?}
    I -- Yes --> J[Warning chip on the Dashboard]
    I -- No --> Z([End])
    J --> Z
```

## Notes

- These two aren't the *only* flows in the system — they're the ones worth diagramming first because they're the ones with real branching/state logic. Most other flows (a standard CRUD form, a report generation) are straightforward enough that a diagram would just restate the obvious.
- If a new flow gets added later with comparable complexity (the barcode-scanner proposal, if it's ever approved, likely qualifies), add it here rather than leaving it undiagrammed.
