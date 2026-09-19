# Serbizyu 2.0 — Agent Intermediary, Capability Delegation, and Acting-for Authorization Contract

**Document Reference:** `docs/planning-hardening/35-agent-intermediary-and-capability-delegation-contract.md`  
**Status:** CANONICAL ARCHITECTURAL SPECIFICATION & DOMAIN GOVERNANCE  
**Date:** 2026-09-19  
**Authority:** Follows Decision Matrix D19, Canonical Schema Rebuilt (§4.6 `consent_grants`), Domain State Contracts (§2.7, §2.16, §9, §16.5), UX Spec Rebuilt (UX-003, UX-004, UX-007, UX-027), and PH Regulatory Report (§7, §8).  
**Subordinate To:** Canonical Domain State Contracts (`domain-state-contracts-rebuilt.md`) and Architecture Spine (`ARCHITECTURE-SPINE.md`).

---

## 1. Context & The "Meesho Analogue" Architectural Thesis

In rural and semi-urban Philippine municipalities such as Tagudin, Ilocos Sur, a primary market failure of traditional digital platforms (Grab, Shopee, TaskRabbit) is the **smartphone and digital-literacy barrier**:
* Micro-merchants, senior sari-sari store owners (e.g. Lola Nena), and veteran trade technicians (e.g. Mang Jose, Kuya Bert) possess decades of community trust, physical inventory, and trade skills.
* However, they often use basic feature phones (Nokia 105), lack smartphone proficiency, or distrust direct app-based administrative interfaces.

Earlier attempts to bridge this either:
1. **Forced full digital adoption** (excluding ~90% of provincial micro-providers), or
2. **Allowed unregulated informal middlemen** (creating gatekeeping, extortion, cash skimming, and customer dispute confusion).

### The Settled Architectural Thesis: The Governed Human Agent Model
Serbizyu adapts the social-commerce reseller model pioneered by **Meesho (India)** and structural delegation modeled after **Facebook Page Access Roles**:
1. **Tech-savvy community field agents** (e.g. Rosa, local cooperative officers, barangay youth leaders) act as authorized digital coordinators for offline owners.
2. **Strict Actor vs. Principal Separation:** The agent is the *operator* (`actor_id`), while the business owner is the legal *principal* (`owner_id`).
3. **No Cash Custody Invariant:** Agents never hold, escrow, or intercept customer funds. Payouts route directly to the principal's verified account or settle via Dual-Confirmed External Cash.
4. **Anti-Gatekeeping Graduation Incentive:** To prevent agents from permanently trapping offline merchants, agents earn a **3× monthly commission graduation bonus** when an owner transitions to self-management.
5. **Zero Telephony Debt in Early Phases:** The system is engineered so that consent, delegation, and listing operations function via in-app pairing codes and verified handshake evidence, without blocking on SMS gateway bills or telco infrastructure. When SMS OTP triggers are added, zero domain or schema rules change.

---

## 2. Authorization Paradigm Evaluation: Capability-Based ReBAC + ABAC

### 2.1 The Mathematical Invariant (§16.5)
From `domain-state-contracts-rebuilt.md` §16.5, authorization for any action on the platform is defined by the strict intersection of non-expanding constraints:

$$\text{Authorization} = P_{\text{owner}} \cap S_{\text{client}} \cap C_{\text{acting-for}} \cap K_{\text{capability}} \cap E_{\text{approval}}$$

Where:
* $P_{\text{owner}}$: The resource ownership and state policy of the underlying principal.
* $S_{\text{client}}$: The authenticated client's identity and active account tier.
* $C_{\text{acting-for}}$: The active, unexpired, unrevoked consent grant slice ($C \subseteq \text{AllowedScopes}$).
* $K_{\text{capability}}$: The system-level activation status of that capability in the municipality.
* $E_{\text{approval}}$: Per-action high-impact confirmation (if required by risk policy).

### 2.2 Paradigm Comparison & Verdict

| Paradigm | Architectural Evaluation | Verdict for Serbizyu Agent Model |
| :--- | :--- | :--- |
| **RBAC** (Role-Based) | Static roles (e.g. `role: agent`, `role: provider`) cannot express *pairwise, scoped delegation* between specific users. Assigning a user the "Agent" role cannot safely restrict them to only Mang Jose's listings while blocking them from Aling Maria's. | ❌ **Rejected.** Fundamentally inadequate for multi-principal delegation. |
| **ABAC** (Attribute-Based) | Powerful attribute matching (`subject.id == grant.agent_id && resource.owner_id == grant.owner_id`), but pure ABAC engines (XACML) introduce immense parsing overhead and maintenance complexity. | ⚠️ **Used as policy guard only.** Standard Laravel Policies handle the attribute boundary. |
| **ReBAC** (Relationship-Based / Zanzibar) | Models relations as tuples: `(User:Rosa, agent_for, Business:MangJoseTricycle)`. Highly accurate for expressing delegation graphs, but running dedicated tuple engines (Ory Keto, SpiceDB) is unjustifiable infrastructure overhead for a modular monolith. | ⚠️ **Concepts adopted, but stored natively in Postgres/MySQL.** |
| **Capability / Object-Capability (Ocap)** | **The Selected Paradigm.** The `ConsentGrant` acts as an unforgeable, time-bounded, scope-attenuated capability token. The agent cannot act without presenting an active grant, and the grant can only *attenuate* (narrow) permissions, never expand them. | ✅ **Selected Architecture.** Capability-based security implemented via Laravel `ActingContext` DTOs and Policy Enforcement Points. |

---

## 3. Canonical Data Schema: `consent_grants` (Table 4.6)

```sql
-- Canonical Consent Grants Table (matches canonical-schema-rebuilt.md §4.6)
CREATE TABLE consent_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    grantee_agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Scopes: Array of allowed permissions
    -- ['listing:create', 'listing:edit', 'deal:coordinate', 'order:verify_handoff', 'quote:respond']
    scope VARCHAR(64)[] NOT NULL,
    
    -- Status lifecycle: pending -> active -> (suspended | revoked | expired)
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    
    -- Verification mechanism: in_app_pin, f2f_qr, sms_otp (phase 3)
    verification_method VARCHAR(32) NOT NULL DEFAULT 'in_app_pin',
    verification_evidence_id UUID REFERENCES evidence_files(id),
    
    -- Commission split agreed between Agent and Owner (Platform takes fixed 15%)
    -- Example: agent_cut_pct = 10 (Owner keeps 75%, Agent gets 10%, Platform takes 15%)
    agent_commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    revocation_reason TEXT NULL,
    
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_grantor_not_grantee CHECK (grantor_user_id <> grantee_agent_user_id),
    CONSTRAINT chk_grant_dates CHECK (expires_at > starts_at)
);

CREATE INDEX idx_consent_grants_active 
ON consent_grants (grantee_agent_user_id, grantor_user_id, status)
WHERE status = 'active';
```

### Invariants of `consent_grants`:
1. **Explicit Scope:** A grant never grants wildcard `*` access.
2. **Immutable History:** Revocation updates `status = 'revoked'` and `revoked_at = NOW()`. Past mutations, orders, and listings authored under that grant retain their historical audit pointers.
3. **High-Risk Action Boundary:** Irreversible actions (payout destination changes, business identity deletion, full account closure) are **strictly ungrantable**; they require primary owner identity credentials.

---

## 4. Engineering Architecture in Laravel 12

### 4.1 Policy Enforcement Point (PEP): `ResolveActingContext` Middleware
The middleware intercepts incoming requests, validates session credentials, extracts acting-for intent, and binds an immutable `ActingContext` into Laravel’s container:

```php
namespace App\Shared\Auth;

use App\Models\User;
use App\Modules\IdentityAccess\Domain\ConsentGrant;

readonly class ActingContext
{
    public function __construct(
        public User $actor,                  // Authenticated user (e.g. Rosa)
        public ?User $principal = null,      // Delegating owner (e.g. Mang Jose)
        public ?ConsentGrant $grant = null,  // Active verified capability grant
    ) {}

    public function isActingOnBehalf(): bool
    {
        return $this->principal !== null && $this->actor->id !== $this->principal->id;
    }

    public function effectiveOwnerId(): string
    {
        return $this->isActingOnBehalf() ? $this->principal->id : $this->actor->id;
    }

    public function hasScope(string $permission): bool
    {
        if (! $this->isActingOnBehalf()) {
            return true; // Self-acting follows standard role policies
        }

        return $this->grant !== null 
            && $this->grant->isActive() 
            && $this->grant->hasScope($permission);
    }
}
```

### 4.2 Policy Decision Point (PDP): Laravel Policies
Domain policies never inspect raw session headers. They evaluate the `ActingContext`:

```php
namespace App\Modules\Listings\Domain\Policies;

use App\Shared\Auth\ActingContext;
use Illuminate\Auth\Access\Response;

class ListingPolicy
{
    public function create(ActingContext $context): Response
    {
        // 1. Self-acting path
        if (! $context->isActingOnBehalf()) {
            return $context->actor->can('provider:create')
                ? Response::allow()
                : Response::deny('Account is not a registered provider.');
        }

        // 2. Delegated Agent path: Strict intersection
        if (! $context->grant || ! $context->grant->isActive()) {
            return Response::deny('No active, valid consent grant found for this owner.');
        }

        if (! $context->hasScope('listing:create')) {
            return Response::deny('Grant does not permit listing creation on behalf of owner.');
        }

        if ($context->principal->isSuspended()) {
            return Response::deny('Owner business account is currently suspended.');
        }

        return Response::allow();
    }
}
```

---

## 5. Canonical Command Envelope

Every mutation executed on behalf of an owner carries full attribution metadata:

```json
{
  "command": "CreateServiceListing",
  "actor_id": "usr_rosa_9912",
  "acting_for_owner_id": "usr_mang_jose_4412",
  "consent_grant_id": "cg_881944",
  "expected_version": 1,
  "idempotency_key": "idemp_550e8400_e29b",
  "correlation_id": "corr_7c9e6679",
  "payload": {
    "title": "Tricycle Point-to-Point Route",
    "base_rate_minor": 5000,
    "deal_chain_combinations": ["doorstep_delivery"]
  }
}
```

### Resulting Entity Schema Storage:
* `owner_user_id`: `"usr_mang_jose_4412"` (Canonical legal owner)
* `created_by_user_id`: `"usr_rosa_9912"` (Physical author)
* `created_under_grant_id`: `"cg_881944"` (Authorization license at execution)

---

## 6. Frontend State Flow & Integration with Creators

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. AGENT TODAY COCKPIT (agent-today.html)                                   │
│    • Lists managed owners (Mang Jose, Lola Nena, Kuya Bert)                 │
│    • Selecting owner sets active context: activePrincipalId                 │
│    • Quick Actions: [➕ Create Service Listing]                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Deep links with ?acting_for=mang-jose
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. CREATOR INTERFACES (Product, Service, Request Builders)                  │
│    • Pinned Non-Intrusive Context Bar:                                      │
│      "👤 Acting on behalf of: Mang Jose's Tricycle (0917-xxx) · [ Switch ▾ ]│
│    • Inherits exact existing minimalist 3-step form (no duplicate forms!)    │
│    • Form submissions include: { acting_for_owner_id: "mang-jose" }         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Regulatory Alignment (Philippine Law)

1. **DOLE Labor Code (Art. 280) — Contractor Shield:**
   * Agents control their own schedules and work locations.
   * Commission-based earnings (outcome-based, never hourly/daily supervision).
   * No exclusivity requirement; agents may work for other platforms or businesses.
2. **BIR RR 16-2023 (Withholding Obligations):**
   * Platform gross remittance withholding (1%) only triggers when an agent exceeds ₱500,000/year gross remittances.
   * Sub-threshold agents are fully compliant default participants without requiring upfront Form 2303 / TIN gates.
3. **Civil Code (Arts. 1868–1932) — Law of Agency:**
   * Explicit, signed/attested electronic consent grant establishes prima facie legal agency under the Electronic Commerce Act (RA 8792).
   * Third-party customers deal with the disclosed principal through the authorized intermediary.

---

## 8. Summary of Non-Negotiable Guardrails

1. **Never conflate actor and principal:** Any database record or API response that collapses `actor_id` and `owner_id` into one field is an immediate architecture violation.
2. **Zero Cash Custody:** Agents cannot receive, hold, or disburse escrow payouts.
3. **No Silent Substitution:** The user interface must continuously display the active acting-for banner during creation, negotiation, and handoff verification.
4. **Attenuated Capabilities Only:** Delegation can only reduce or slice permissions; a grant can never confer an authority the grantor does not possess.
