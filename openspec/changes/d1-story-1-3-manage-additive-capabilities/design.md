# Design — D1-Story-1.3: Manage Additive Capabilities and Profile Readiness

## Change ID
`d1-story-1-3-manage-additive-capabilities`

## Master Delivery Plan Conformance

---

### 1. Functional Context & Use Cases
- **Actor:** Authenticated Participant (Citizen, Tradesperson, Merchant, Community Agent).
- **Use Case 1 (Additive Capability Activation):** An authenticated member requests activation of a new capability (e.g. `buyer` activates `provider` or `agent`). The server additively attaches the role in `role_assignments` without altering existing roles.
- **Use Case 2 (Monotonic Profile Readiness):** A member submits required profile information (display name, service area, language) and configures their account password. The server monotonically advances profile readiness from `setup_required` to `ready`.
- **Use Case 3 (Purpose-Specific Actions Generation):** The server projects purpose-specific actions tailored to the participant's active capabilities and readiness status (e.g. buyer sees `browse_listings` and `create_request`; ready provider sees `create_listing` and `manage_listings`).
- **Use Case 4 (Operational Prerequisite Gating):** An operational command (such as `POST /listings` or `POST /requests`) verifies prerequisites before execution. A member lacking `provider` capability or with incomplete profile readiness cannot create listing drafts.
- **Use Case 5 (Independent Capability Preservation on Revocation):** When an operational prerequisite is missing or a capability is revoked (e.g. `provider` revoked), dependent operations fail immediately, but independent capabilities (e.g. `buyer`, `agent`) remain active and intact.
- **Use Case 6 (Anti-Hijacking & Client-Supplied Owner Denial):** An incoming mutation with a client-supplied `owner_user_id` differing from the authenticated session is rejected with 403 unless governed by an active Agent consent grant.
- **Use Case 7 (Restricted Capability Defense):** Self-activation attempts for `admin` or unrecognized capability codes are rejected with 422 `UNSUPPORTED_CAPABILITY`.

---

### 2. State & Security Invariants
1. **Additive Invariant:** An account may possess zero or more active roles simultaneously (`buyer`, `provider`, `merchant`, `agent`). Activating a role never deactivates another.
2. **Monotonic Readiness Invariant:** Readiness transitions from `setup_required` to `ready` once display name, service area, and password are set. Incomplete updates fail validation and never regress a completed profile.
3. **Least Privilege & Role Isolation:** Participant self-activation is strictly limited to supported participant roles (`buyer`, `provider`, `merchant`, `agent`). `admin` cannot be self-assigned.
4. **Immediate Revocation Effect:** Role revocation updates `status = 'revoked'`, increments aggregate `version`, and takes effect atomically.
5. **Fail-Closed Operational Gates:** Mutation routes enforce prerequisite role checks and fail closed with 403 `PREREQUISITE_FAILED` or `AUTHORIZATION_DENIED`.

---

### 3. Data Model & Storage

#### `role_assignments` (Canonical Batch 001 Schema)
- `id` (UUIDv7, PK)
- `user_id` (UUID, FK -> users.id)
- `role_code` (TEXT: `'buyer'`, `'provider'`, `'merchant'`, `'agent'`, or legacy `'buy'`, `'provide'`)
- `status` (TEXT: `'active'`, `'revoked'`, `'suspended'`, `'expired'`)
- `granted_by_user_id` (UUID, FK -> users.id)
- `effective_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ, nullable)
- `scope` (JSONB: metadata, e.g. `{'source': 'onboarding'}`)
- `version` (INT)
- `correlation_id` (UUID)

#### `user_profiles` (Canonical Batch 001 Schema)
- `user_id` (UUID, PK, FK -> users.id)
- `display_name` (TEXT)
- `service_area_display` (TEXT)
- `accessibility_preferences` (JSONB)
- `language_preferences` (JSONB)
- `version` (INT)

---

### 4. Public API & Seams

| Method | URI | Middleware | Description |
|---|---|---|---|
| `GET` | `/account/capabilities` | `auth` | Returns active capabilities, readiness state, and purpose-specific actions |
| `POST` | `/account/capabilities` | `auth` | Additively activates a participant capability (`buyer`, `provider`, `merchant`, `agent`) |
| `DELETE` | `/account/capabilities/{role}` | `auth` | Revokes a capability for the authenticated participant |
| `GET` | `/account/readiness` | `auth` | Returns monotonic profile readiness state and blockers |
| `POST` | `/onboarding` | `auth` | Submits profile setup and requested capabilities |
| `POST` | `/listings` | `auth`, throttle | Operational action guarded by `provider`/`merchant` capability & readiness |
| `POST` | `/requests` | `auth` | Operational action guarded by `buyer` capability |

---

### 5. Architectural Alignment & ADR Citations
- **ADR-R-004:** Additive capabilities without persona switching.
- **ADR-R-016:** Degradation tiers are not identities.
- **ADR-R-030:** Hybrid mobile authentication with verified contact identity.
- **PRD-001:** Account identity and least-privilege access for Buyer, Provider, Agent, Admin.
- **PRD-003:** Separation of verified identity evidence from public trust badges.
- **PRD-023:** Separate Owner and acting Agent attribution.
- **UX-DR14:** Explicit denial, validation, and error contracts across connected surfaces.
