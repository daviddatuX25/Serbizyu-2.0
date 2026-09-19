# Agent Intermediary & Capability Delegation Rules

Committed architectural constraints for agent delegation, acting-for contexts, and capability security.

## Authority & Canonical Specification
- Canonical specification: `docs/planning-hardening/35-agent-intermediary-and-capability-delegation-contract.md`
- Subordinate to: `_bmad-output/planning-artifacts/domain-state-contracts-rebuilt.md` (§16.5) and `canonical-schema-rebuilt.md` (§4.6 `consent_grants`).

## Standing Invariants

1. **Strict Attribution (Actor != Principal):**
   - Every mutation, event, and command executed by an agent must carry both `actor_id` (the agent physically operating the UI) and `owner_id` (the principal who legally owns the resource).
   - Never conflate them into a single `user_id`.
   - Never silently substitute an agent for an owner.

2. **Zero Cash Custody:**
   - Agents must never hold, escrow, collect, or settle customer funds.
   - Payouts route exclusively to the owner's verified wallet/bank or dual-confirmed cash between buyer and provider.

3. **Capability-Based Attenuation:**
   - Authorization is strictly evaluated as:
     `Authorization = owner_resource_policy ∩ client_scope ∩ acting_for_consent ∩ capability_activation ∩ exact_approval`
   - A grant can only attenuate (narrow) capabilities, never expand them beyond what the owner possesses.
   - Irreversible actions (changing payout accounts, account deletion, high-value asset transfers) cannot be delegated.

4. **Single Creator Surface (No Form Duplication):**
   - The Product Creator, Service Creator, and Request Builder remain the single source of truth.
   - Agents operate them in an active `ActingContext`, indicated by a persistent pinned banner:
     `[ 👤 Acting on behalf of: [Owner Name] · Switch ▾ ]`.
   - Never create duplicate "agent-only" creation forms.

5. **Zero Telephony Debt:**
   - In Phases 1 and 2, verification uses in-app pairing codes or physical QR handshakes.
   - The database schema (`consent_grants`) and domain policies are completely decoupled from SMS/telephony gateways.
