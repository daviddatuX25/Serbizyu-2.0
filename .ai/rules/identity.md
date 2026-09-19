# Identity, Roles, and Participation Rules

Guidance for all Identity, User Accounts, Role Assignments, and Community Agent interfaces (`app/Modules/IdentityAccess/**`, `resources/js/Pages/Admin/Users/**`).

## Core Invariants

1. **No Access Tier as Identity:** Do NOT use `L0`–`L4` as citizen identity ranks or primary table badges. Tiers are purely device-level degradation profiles (ADR-016) and notification delivery channel hints.
2. **The 3 Human Dimensions:**
   - **Market Roles**: `Buyer`, `Provider`, `Merchant`, `Agent`, `Admin`.
   - **Participation Mode**: `Direct` vs `Agent-Assisted` (with named acting-for agent and consent grant scope under PRD-007).
   - **Trust & Verification Ladder**: `Level 1: Phone Verified`, `Level 2: Barangay Endorsed`, `Level 3: Formally Verified (Gov ID / Trade License)`.
3. **Agent Delegation Transparency:** Assisted citizens must visibly show their authorized acting-for community agent. Agents must display their assisted client roster and active consent grants.
4. **Channel Preferences in Drawers:** SMS-only, low-data, and kiosk preferences belong inside the inspection drawer or settings, not as primary badges.
