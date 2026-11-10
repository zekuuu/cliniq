# Screen-Flow and Navigation Map

Added Tuesday, November 10, 2026 — 17:27 PHT, built from the router (`frontend/src/routes/AppRoutes.tsx` and `paths.ts`; the full list with roles is in the [Facts sheet](../00-Project-Core/Facts-Sheet.md#signed-in-routes-by-role)). Exports: `Database/Diagrams/Screen-Flow-Staff` and `Screen-Flow-Admin`, `.svg` and `.png`.

**Figure 1: Staff (School Clinician).** After sign-in, the sidebar reaches every group; arrows show the main drill-downs.

```mermaid
flowchart LR
    L["/login"] --> D["Dashboard /"]
    L --> FPC["/force-password-change"] --> D
    D --> CAL["Activity calendar"]
    D --> ST["Students"] --> SP["Student Profile"] --> SE["Edit Student"]
    ST --> SN["Add Student"]
    ST --> SI["Import Student List"]
    ST --> SQ["Incomplete Records"]
    D --> SF["Staff"] --> SFP["Staff Profile"] --> SFE["Edit Staff"]
    SF --> SFI["Import Staff List"]
    SF --> SFQ["Incomplete Staff Records"]
    D --> V["Visit Log"] --> VD["Visit Details"] --> EL["Excuse Letter"]
    V --> VN["New Visit"]
    V --> PE["PE/Sports Referrals"]
    D --> I["Incident Log"] --> IR["Incident Report"]
    I --> IN["Report Incident"] --> IC["Complete Incident"]
    I --> PN["Parent Notifications"]
    D --> FU["Follow-Ups"]
    D --> INV["Inventory"] --> IA["Add Item"]
    INV --> DI["Dispense"]
    INV --> IH["Usage History"]
    D --> RP["Reports"] --> SR["Sports Reports"]
    D --> AL["Audit Log"]
    D --> AR["Archive"]
    D --> BK["Backup"]
    D --> SET["Settings"]
```

**Figure 2: Admin (Principal).** Read-only screens, Accounts, and the month list of reports. A Staff-only route sends the Admin to the Dashboard, or to Reports for a Sports Report link.

```mermaid
flowchart LR
    L["/login"] --> D["Dashboard /"]
    D --> CAL["Activity calendar"]
    D --> ST["Students"] --> SP["Student Profile (read)"]
    D --> I["Incident Log"] --> IR["Incident Report (read)"]
    D --> RP["Reports: month list"] --> RV["Report sheet, view only"]
    D --> AL["Audit Log"]
    D --> U["Accounts"] --> UN["Add User"]
    U --> UE["Edit User"]
    D --> BK["Backup"]
    D --> AR["Archive (read)"]
    D --> SET["Settings (read)"]
```

Both roles reach Change Password, Privacy Policy, Edit profile, the authenticator app, Keyboard shortcuts and Report an issue from the account menu in the header.
