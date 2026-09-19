# ADR-031: Deconstruction of Access Tiers into Market Roles, Participation Mode, and Trust Ladder

## Context & Problem Statement
In earlier architecture documents and database migrations, the concept of "Access Tiers" (`L0` Feature Phone, `L1` Kiosk Tablet, `L2` Low-Data Smartphone, `L3` Online Smartphone, `L4` Desktop Admin) was conceived as a device-level degradation matrix (ADR-016). However, this technical device categorization leaked into the domain schema (`users.primary_access_tier`) and user-facing admin interfaces, treating citizens as if they held an immutable "L0–L4" social rank.

In real-world operations in Tagudin, an operator does not think of residents as "L0 humans" or "L2 humans". A resident's device is a channel preference, while their commercial rights, community delegation, and safety clearances are separate, human-centered operational dimensions.

## Decision
Definitively deprecate the use of "Access Tier" as a citizen identity classification across all domain documentation, UI screens, and operator workflows.

Replace it with three distinct, orthogonal dimensions:

```text
DIMENSION 1: MARKET ROLES (What can they do commercially?)
  • Buyer: Can browse, request services, and enter contracts.
  • Provider: Can publish service offerings and execute Work.
  • Merchant: Can supply parts and materials for Deal Chains.
  • Agent: Accredited community liaison acting for consenting owners/elders.
  • Admin: Operational investigation, hold management, and platform governance.

DIMENSION 2: PARTICIPATION & AUTONOMY (How do they interact?)
  • Direct: Citizen manages their own account and transactions directly.
  • Agent-Assisted: Citizen delegates account actions to an accredited Community
    Agent under a legally registered consent_grant (PRD-007).

DIMENSION 3: TRUST & VERIFICATION LADDER (What risk gates have they cleared?)
  • Level 1: Phone Verified (SMS OTP confirmed; browse & basic cash orders).
  • Level 2: Barangay Endorsed (Clearance / residency affidavit; local neighborhood trades).
  • Level 3: Formally Verified (Government ID, PRC License, or TESDA NC2 for high-risk technical trades).

CHANNEL MODALITY (Device & Accessibility Preferences):
  • SMS Keypad Phone (GSM Gateway)
  • Barangay Kiosk / Station Terminal
  • Low-Data Mobile (IndexedDB Offline Cache)
  • Full Web Smartphone / Desktop
  • Note: Channel preferences live strictly in communication settings and inspection drawers,
    NEVER as the citizen's primary identity badge.
```

## Consequences
1. **Admin Directory (`/admin/users`)**: The table displays Citizen Name, Barangay, Market Roles, Participation Mode (Direct vs Assisted), and Trust Level. The `Access Tier` column is removed.
2. **Community Agent Visibility**: Assisted accounts prominently state their authorized Community Agent (e.g. *"Assisted by Kuya Danny Bataller"*), and Community Agents display their active assisted citizen rosters.
3. **Database Schema Compatibility**: The existing `primary_access_tier` column in the database is retained strictly as an internal channel dispatch hint for notification workers (e.g. determining whether to send SMS or push notifications) until migration refactoring.
4. **Consistency Across Docs**: Stale documents defining `L0–L4` as user personas are updated to distinguish device capability from human roles, participation, and trust.
