# Architectural Verdict

The model is sound, but one invariant must be clarified:

> “Exactly one proposal is ACTIVE” cannot mean one active proposal per request, because Request `REQ-882` legitimately has three simultaneous offers.

It must mean:

1. **Exactly one active version per proposal lineage.**
2. **Multiple proposal lineages may be active under one request.**
3. **At most one proposal lineage may be accepted into a contract for a request.**

Thus, the three offers coexist as:

- `PROP-001`: Kuya Ben turnkey chain
- `PROP-002`: Juan labor only
- `PROP-003`: Tagudin Hardware supply only

Each has one current active version. Only one can eventually create the request’s contract.

---

# 1. Recommended Domain Model

## Core aggregates

```text
Request
 ├── Proposal lineage 1
 │    ├── Proposal version 1
 │    │    └── Proposal nodes
 │    └── Proposal version 2, counter
 ├── Proposal lineage 2
 └── Proposal lineage 3

Accepted Proposal
 └── Contract
      ├── Independent Order 1
      │    └── Payment obligation 1
      ├── Independent Order 2
      │    └── Payment obligation 2
      └── ...
```

## Important distinction

A proposal is not an order.

A proposal is:

- negotiable,
- mutable through immutable versions,
- potentially speculative,
- not yet contractually binding on partner providers.

An order is:

- created only after citizen acceptance and contract finalization,
- independently fulfillable,
- separately payable,
- independently cancellable or disputable.

---

# 2. Proposal Archetypes

All three proposal types should use the same normalized structure.

## Proposal 1: Turnkey chain

```text
Proposal PROP-001
Lead provider: Kuya Ben Electrical
Version: V1
Total: ₱400

Node 1:
  Provider: Tagudin Hardware
  Type: PRODUCT
  Price to citizen: ₱160

Node 2:
  Provider: Kuya Ben Electrical
  Type: LABOR
  Price to citizen: ₱240
```

On acceptance:

```text
ORD-101 → Tagudin Hardware → ₱160
ORD-102 → Kuya Ben Electrical → ₱240
```

Two payment obligations exist. There is no pooled escrow.

## Proposal 2: Standalone labor

```text
Proposal PROP-002
Lead provider: Electrician Juan
Version: V1
Total: ₱300

Node 1:
  Provider: Electrician Juan
  Type: LABOR
  Price: ₱300
```

On acceptance:

```text
ORD-103 → Electrician Juan → ₱300
```

## Proposal 3: Direct merchant supply

```text
Proposal PROP-003
Lead provider: Tagudin Hardware
Version: V1
Total: ₱160

Node 1:
  Provider: Tagudin Hardware
  Type: PRODUCT
  Price: ₱160
  Customer action: pickup or arrange courier
```

On acceptance:

```text
ORD-104 → Tagudin Hardware → ₱160
```

The proposal comparison API should normalize every proposal into a common representation:

```json
{
  "proposal_id": "PROP-001",
  "version": 1,
  "kind": "TURNKEY_CHAIN",
  "total_amount": 40000,
  "currency": "PHP",
  "nodes": [
    {
      "type": "PRODUCT",
      "provider_name": "Tagudin Hardware",
      "amount": 16000,
      "requires_customer_action": false
    },
    {
      "type": "LABOR",
      "provider_name": "Kuya Ben Electrical",
      "amount": 24000,
      "requires_customer_action": false
    }
  ],
  "partner_confirmation": "NOT_REQUIRED",
  "valid_until": "..."
}
```

The frontend should not infer proposal kind from node count alone. Store a classification, but derive and validate it from the nodes.

---

# 3. Pre-Authorized Listing Extension

## 3.1 Standard catalog reference

A provider may attach another provider’s listing without notifying that provider only if all conditions hold:

1. The listing is published.
2. The listing owner has explicitly enabled chain participation.
3. The listing’s policy is `STANDARD_AUTO_BIND`.
4. Price is unchanged.
5. Quantity and unit are unchanged.
6. Schedule constraints are unchanged.
7. Delivery/service conditions are unchanged.
8. The proposal references an immutable listing version.
9. The listing’s pre-authorization has not expired.

The fact that a listing is public is not, by itself, sufficient authorization.

Recommended listing policy:

```text
NONE
STANDARD_AUTO_BIND
INVITE_REQUIRED
```

### Notification behavior

When Provider X submits a speculative proposal using a valid standard reference:

- Do not notify Provider Y.
- Do not create a partner invitation.
- Do not send chat messages to Y.
- Do not expose the citizen’s identity to Y.
- Do not reserve inventory.

The only immediate notifications are normally:

- requester,
- lead provider,
- possibly platform audit systems.

Provider Y is notified only when the citizen accepts and the contract is finalized.

### When Y becomes bound

Provider Y becomes contractually bound at:

```text
Citizen acceptance
+ successful final validation
+ contract finalization
+ order creation
```

The contract and Y’s independent order should be created in one database transaction.

### Stale inventory or pricing

The proposal must store a snapshot:

```text
listing_id
listing_version_id
quoted_price
quoted_schedule
quoted_terms_hash
quote_expires_at
```

At citizen acceptance, the system must revalidate:

- listing policy,
- listing version validity,
- quote expiry,
- stock/capacity,
- service schedule,
- provider account status,
- fulfillment area.

The system must never silently replace ₱160 with a new price.

Recommended behavior:

| Situation | Result |
|---|---|
| Same listing version, sufficient stock | Accept and reserve |
| Same listing version, no stock | Reject acceptance with `CAPACITY_UNAVAILABLE` |
| Listing closed, quote not valid after closure | Reject with `LISTING_NO_LONGER_AVAILABLE` |
| Listing price changed but old quote still valid | Honor the immutable quoted version |
| Quote expired | Reject with `QUOTE_EXPIRED` |
| Schedule no longer available | Reject with `SCHEDULE_UNAVAILABLE` |
| Terms changed | Require proposal refresh or new proposal version |

The citizen should receive a clear `409 Conflict` response rather than an apparently accepted deal that later changes price.

## 3.2 Modified terms or custom discount

If X proposes:

```text
Y’s normal fee: ₱60
Proposed fee: ₱40
```

or changes:

- delivery hours,
- location restrictions,
- quantity,
- service scope,
- payment timing,
- fulfillment obligations,

then the proposal node must use:

```text
pricing_mode = CUSTOM_TERMS
partner_confirmation = PENDING
```

### Custom invitation state machine

```text
PENDING_PARTNER_CONFIRMATION
 ├── ACCEPTED
 ├── DECLINED
 ├── COUNTERED
 ├── EXPIRED
 └── CANCELLED
```

Detailed behavior:

| Event | Result |
|---|---|
| Lead submits custom node | Create invitation as `PENDING` |
| Partner accepts exact terms | Invitation becomes `ACCEPTED` |
| Partner declines | Proposal becomes unaccept-able |
| Partner counters | New proposal version is required |
| Invitation expires | Proposal is blocked or expires |
| Lead edits terms | Old consent is invalidated; new invitation required |
| Citizen tries to accept while pending | Reject with `PARTNER_CONFIRMATION_REQUIRED` |
| Partner accepts, but listing later loses capacity | Final acceptance still revalidates live capacity |

Partner acceptance is a consent to the proposed terms. It is not yet the final customer contract. The customer contract is created only after the citizen accepts.

### Discounts must distinguish customer price from partner payout

Do not represent all commercial values with one `price` column.

A discounted node could mean either:

```text
Customer pays ₱40
Partner receives ₱40
```

or:

```text
Customer pays ₱40
Partner receives ₱60
Lead provider subsidizes ₱20
```

Therefore store at least:

```text
customer_amount
provider_payout_amount
discount_amount
discount_funder
```

If Y is to receive ₱60 while the citizen pays ₱40, Y must explicitly consent to that exact arrangement, and the ₱20 subsidy must be represented as a separate obligation.

---

# 4. PostgreSQL Schema

The following is a concrete foundation. Some cross-table rules require triggers or stored commands rather than ordinary `CHECK` constraints.

## 4.1 Enumerations

```sql
CREATE TYPE request_visibility AS ENUM (
    'SEALED',
    'OPEN_TENDER',
    'DIRECT_INVITE'
);

CREATE TYPE request_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'PAUSED',
    'CONTRACTED',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE listing_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'PAUSED',
    'CLOSED'
);

CREATE TYPE chain_policy AS ENUM (
    'NONE',
    'STANDARD_AUTO_BIND',
    'INVITE_REQUIRED'
);

CREATE TYPE proposal_status AS ENUM (
    'DRAFT',
    'PROPOSED',
    'COUNTERED',
    'SUPERSEDED',
    'ACCEPTED',
    'LOCKED',
    'WITHDRAWN',
    'EXPIRED',
    'REJECTED'
);

CREATE TYPE proposal_gate_status AS ENUM (
    'NOT_REQUIRED',
    'PENDING_PARTNER_CONFIRMATION',
    'READY',
    'BLOCKED',
    'EXPIRED'
);

CREATE TYPE node_type AS ENUM (
    'PRODUCT',
    'LABOR',
    'DELIVERY',
    'SERVICE',
    'FEE',
    'OTHER'
);

CREATE TYPE pricing_mode AS ENUM (
    'OWN_QUOTE',
    'CATALOG_REFERENCE',
    'CUSTOM_TERMS'
);

CREATE TYPE partner_confirmation_status AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'COUNTERED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE contract_status AS ENUM (
    'FINALIZED',
    'ACTIVE',
    'PARTIALLY_FULFILLED',
    'COMPLETED',
    'CANCELLED',
    'DISPUTED',
    'FAILED'
);

CREATE TYPE order_status AS ENUM (
    'CREATED',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'IN_PROGRESS',
    'READY_FOR_COLLECTION',
    'COLLECTED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'FAILED',
    'DISPUTED'
);

CREATE TYPE payment_obligation_status AS ENUM (
    'UNPAID',
    'AUTHORIZED',
    'PAID',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'FAILED',
    'CANCELLED'
);
```

## 4.2 Requests and listings

```sql
CREATE TABLE requests (
    id                  uuid PRIMARY KEY,
    owner_user_id       uuid NOT NULL REFERENCES users(id),
    visibility          request_visibility NOT NULL,
    status              request_status NOT NULL DEFAULT 'DRAFT',
    title               text NOT NULL,
    description         text NOT NULL,
    requirements        jsonb NOT NULL DEFAULT '{}'::jsonb,
    location            geography(Point, 4326),
    requirements_hash   bytea NOT NULL,
    published_at        timestamptz,
    expires_at          timestamptz,
    lock_version        bigint NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listings (
    id                  uuid PRIMARY KEY,
    provider_id         uuid NOT NULL REFERENCES providers(id),
    status              listing_status NOT NULL DEFAULT 'DRAFT',
    title               text NOT NULL,
    listing_type        node_type NOT NULL,
    chain_policy        chain_policy NOT NULL DEFAULT 'NONE',
    location            geography(Point, 4326),
    lock_version        bigint NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listing_versions (
    id                       uuid PRIMARY KEY,
    listing_id               uuid NOT NULL REFERENCES listings(id),
    version_no               integer NOT NULL,
    unit_price_minor         bigint NOT NULL CHECK (unit_price_minor >= 0),
    currency                 char(3) NOT NULL DEFAULT 'PHP',
    unit                    text NOT NULL,
    schedule_constraints     jsonb NOT NULL DEFAULT '{}'::jsonb,
    fulfillment_terms        jsonb NOT NULL DEFAULT '{}'::jsonb,
    capacity_policy          jsonb NOT NULL DEFAULT '{}'::jsonb,
    terms_hash               bytea NOT NULL,
    valid_from               timestamptz NOT NULL,
    valid_until              timestamptz,
    created_at               timestamptz NOT NULL DEFAULT now(),

    UNIQUE (listing_id, version_no),
    UNIQUE (id, listing_id)
);
```

Listing versions should be immutable after publication. Editing price or schedule creates a new version.

## 4.3 Proposals and immutable versions

```sql
CREATE TABLE proposals (
    id                  uuid PRIMARY KEY,
    request_id          uuid NOT NULL REFERENCES requests(id),
    lead_provider_id    uuid NOT NULL REFERENCES providers(id),
    proposal_kind       text NOT NULL,
    status              proposal_status NOT NULL DEFAULT 'DRAFT',
    current_version_id  uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (id, request_id)
);

CREATE TABLE proposal_versions (
    id                  uuid PRIMARY KEY,
    proposal_id         uuid NOT NULL REFERENCES proposals(id),
    version_no          integer NOT NULL,
    based_on_version_id uuid REFERENCES proposal_versions(id),
    authored_by_user_id uuid NOT NULL REFERENCES users(id),
    status              proposal_status NOT NULL,
    gate_status          proposal_gate_status NOT NULL DEFAULT 'NOT_REQUIRED',

    currency            char(3) NOT NULL DEFAULT 'PHP',
    total_customer_minor bigint NOT NULL CHECK (total_customer_minor >= 0),
    total_provider_minor bigint NOT NULL CHECK (total_provider_minor >= 0),
    terms_snapshot      jsonb NOT NULL,
    terms_hash          bytea NOT NULL,
    valid_until         timestamptz,
    lock_version        bigint NOT NULL DEFAULT 0,

    proposed_at         timestamptz NOT NULL DEFAULT now(),
    accepted_at         timestamptz,
    locked_at           timestamptz,

    UNIQUE (proposal_id, version_no),
    UNIQUE (id, proposal_id)
);

ALTER TABLE proposals
ADD CONSTRAINT proposals_current_version_fk
FOREIGN KEY (current_version_id)
REFERENCES proposal_versions(id)
DEFERRABLE INITIALLY DEFERRED;
```

Exactly one active version per proposal lineage:

```sql
CREATE UNIQUE INDEX one_active_proposal_version
ON proposal_versions (proposal_id)
WHERE status IN ('PROPOSED', 'COUNTERED', 'ACCEPTED');
```

The application must update the old version to `SUPERSEDED` before inserting the new active version, or use a controlled stored procedure.

## 4.4 Proposal nodes

```sql
CREATE TABLE proposal_nodes (
    id                       uuid PRIMARY KEY,
    proposal_version_id      uuid NOT NULL
        REFERENCES proposal_versions(id),

    node_key                 text NOT NULL,
    node_type                node_type NOT NULL,
    provider_id              uuid NOT NULL REFERENCES providers(id),

    source_listing_id        uuid REFERENCES listings(id),
    source_listing_version_id uuid REFERENCES listing_versions(id),

    pricing_mode             pricing_mode NOT NULL,
    quantity                 numeric(18,6) NOT NULL CHECK (quantity > 0),
    unit                     text NOT NULL,

    customer_unit_minor     bigint NOT NULL CHECK (customer_unit_minor >= 0),
    customer_total_minor    bigint NOT NULL CHECK (customer_total_minor >= 0),
    provider_payout_minor   bigint NOT NULL CHECK (provider_payout_minor >= 0),
    discount_minor          bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
    discount_funder_provider_id uuid REFERENCES providers(id),

    schedule_constraints    jsonb NOT NULL DEFAULT '{}'::jsonb,
    fulfillment_terms       jsonb NOT NULL DEFAULT '{}'::jsonb,
    terms_snapshot          jsonb NOT NULL,
    terms_hash              bytea NOT NULL,

    UNIQUE (proposal_version_id, node_key)
);
```

Cross-table validations required:

- `source_listing_version_id` must belong to `source_listing_id`.
- Source listing owner must equal `provider_id`.
- `CATALOG_REFERENCE` requires `source_listing_version_id`.
- `OWN_QUOTE` normally has no source listing.
- `CATALOG_REFERENCE` terms must match the referenced listing version.
- A lead provider may not attach a listing without permission.
- Total values must match node totals.
- A custom discount cannot use `CATALOG_REFERENCE`.

These belong in a command function or deferred constraint trigger.

## 4.5 Node dependencies

```sql
CREATE TABLE proposal_node_edges (
    from_node_id       uuid NOT NULL REFERENCES proposal_nodes(id),
    to_node_id         uuid NOT NULL REFERENCES proposal_nodes(id),
    relationship_type   text NOT NULL,
    PRIMARY KEY (from_node_id, to_node_id),
    CHECK (from_node_id <> to_node_id)
);
```

A deferred trigger must reject cycles. Deal chains must be directed acyclic graphs.

## 4.6 Partner invitations

```sql
CREATE TABLE partner_invitations (
    id                    uuid PRIMARY KEY,
    proposal_version_id   uuid NOT NULL
        REFERENCES proposal_versions(id),
    proposal_node_id      uuid NOT NULL
        REFERENCES proposal_nodes(id),
    invited_provider_id   uuid NOT NULL REFERENCES providers(id),

    status                partner_confirmation_status NOT NULL,
    customer_amount_minor bigint NOT NULL CHECK (customer_amount_minor >= 0),
    provider_payout_minor bigint NOT NULL CHECK (provider_payout_minor >= 0),
    schedule_constraints  jsonb NOT NULL DEFAULT '{}'::jsonb,
    terms_snapshot        jsonb NOT NULL,
    terms_hash            bytea NOT NULL,

    expires_at            timestamptz,
    responded_at          timestamptz,
    response_note         text,

    UNIQUE (proposal_version_id, proposal_node_id),
    UNIQUE (id, proposal_node_id)
);
```

Only custom terms require an invitation. Standard catalog references do not create this row.

## 4.7 Contracts, orders, and payment obligations

```sql
CREATE TABLE contracts (
    id                    uuid PRIMARY KEY,
    request_id            uuid NOT NULL REFERENCES requests(id),
    proposal_id           uuid NOT NULL REFERENCES proposals(id),
    proposal_version_id   uuid NOT NULL REFERENCES proposal_versions(id),
    requester_user_id     uuid NOT NULL REFERENCES users(id),
    status                contract_status NOT NULL DEFAULT 'FINALIZED',
    expected_order_count  integer NOT NULL CHECK (expected_order_count > 0),
    terms_hash            bytea NOT NULL,
    finalized_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (request_id),
    UNIQUE (proposal_version_id)
);

CREATE TABLE orders (
    id                    uuid PRIMARY KEY,
    contract_id           uuid NOT NULL REFERENCES contracts(id),
    proposal_node_id      uuid NOT NULL REFERENCES proposal_nodes(id),
    buyer_user_id         uuid NOT NULL REFERENCES users(id),
    seller_provider_id    uuid NOT NULL REFERENCES providers(id),
    status                order_status NOT NULL DEFAULT 'CREATED',

    customer_amount_minor bigint NOT NULL CHECK (customer_amount_minor >= 0),
    provider_payout_minor bigint NOT NULL CHECK (provider_payout_minor >= 0),
    currency              char(3) NOT NULL DEFAULT 'PHP',
    terms_snapshot        jsonb NOT NULL,
    terms_hash            bytea NOT NULL,

    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    UNIQUE (proposal_node_id),
    UNIQUE (contract_id, proposal_node_id)
);

CREATE TABLE payment_obligations (
    order_id              uuid PRIMARY KEY REFERENCES orders(id),
    amount_due_minor      bigint NOT NULL CHECK (amount_due_minor >= 0),
    currency              char(3) NOT NULL DEFAULT 'PHP',
    status                payment_obligation_status NOT NULL DEFAULT 'UNPAID',
    payment_reference     text,
    created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_attempts (
    id                    uuid PRIMARY KEY,
    order_id              uuid NOT NULL REFERENCES orders(id),
    provider_reference    text,
    amount_minor          bigint NOT NULL CHECK (amount_minor >= 0),
    status                text NOT NULL,
    idempotency_key       text NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),

    UNIQUE (order_id, idempotency_key)
);
```

The contract finalization procedure must create:

```text
one order per billable proposal node
one payment obligation per order
```

A deferred constraint trigger should verify:

```sql
SELECT COUNT(*)
FROM orders
WHERE contract_id = NEW.id
```

equals `expected_order_count`, and that every accepted node has exactly one order and obligation.

Do not allow arbitrary application code to finalize a contract by inserting only some orders.

---

# 5. Proposal Versioning and Chat Negotiation

Messages should be immutable. A chat message may refer to a proposal version, but the message itself must not be the source of truth for terms.

```sql
CREATE TABLE chat_threads (
    id                  uuid PRIMARY KEY,
    request_id          uuid NOT NULL REFERENCES requests(id),
    proposal_id         uuid REFERENCES proposals(id),
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
    id                  uuid PRIMARY KEY,
    thread_id           uuid NOT NULL REFERENCES chat_threads(id),
    author_user_id      uuid NOT NULL REFERENCES users(id),
    proposal_version_id uuid REFERENCES proposal_versions(id),
    message_type        text NOT NULL,
    body                text NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);
```

A “counteroffer” is a command that creates a new proposal version. It is not merely a chat message.

## Proposal version transitions

| Current state | Allowed next state | Trigger |
|---|---|---|
| `DRAFT` | `PROPOSED` | Lead submits proposal |
| `PROPOSED` | `SUPERSEDED` | Counteroffer or replacement |
| `PROPOSED` | `ACCEPTED` | Citizen accepts |
| `PROPOSED` | `WITHDRAWN` | Lead withdraws |
| `PROPOSED` | `EXPIRED` | Validity expires |
| `COUNTERED` | `SUPERSEDED` | New counteroffer |
| `COUNTERED` | `ACCEPTED` | Citizen accepts |
| `COUNTERED` | `WITHDRAWN` | Lead withdraws |
| `COUNTERED` | `EXPIRED` | Validity expires |
| `ACCEPTED` | `LOCKED` | Contract/order rows finalized |
| `LOCKED` | none | Immutable terminal state |
| `SUPERSEDED` | none | Immutable historical state |

When a counteroffer is created:

1. Lock the proposal lineage.
2. Verify the current version and `If-Match`.
3. Mark the old active version `SUPERSEDED`.
4. Copy the desired terms into a new immutable version.
5. Apply node mutations.
6. Recalculate totals server-side.
7. Recreate or revalidate partner invitations.
8. Set the new version to `COUNTERED`.
9. Set `proposals.current_version_id` to the new version.

## Dynamic node mutation

Example: “I already have a spare breaker. Remove the part.”

Never update the old node in place.

Instead:

```text
V1:
  Breaker ₱160
  Labor ₱240
  Total ₱400

V2:
  Labor ₱240
  Total ₱240
```

The old version remains historically intact.

If a custom partner node is modified:

- old partner confirmation is invalidated;
- the new version gets `PENDING_PARTNER_CONFIRMATION`;
- citizen acceptance is blocked until the new terms are accepted.

If the node is unchanged, the platform may reuse partner confirmation only when:

```text
node terms_hash is identical
provider is identical
listing version is identical
quantity is identical
schedule is identical
```

The safer default is to require re-confirmation for every materially new version.

After a contract is locked, node mutation is prohibited. Any later change requires:

- an order amendment flow,
- a cancellation and replacement flow,
- or a new proposal/request.

Do not mutate the accepted contract snapshot.

---

# 6. Acceptance and Contract Finalization

The acceptance operation must be a single controlled backend command, for example:

```text
POST /requests/{request_id}/proposals/{proposal_id}/versions/{version}/accept
```

The command must:

1. Authenticate the requester.
2. Verify the requester owns the request.
3. Lock the request row.
4. Lock the proposal lineage.
5. Verify the requested version is current.
6. Verify `If-Match` / `lock_version`.
7. Verify version is `PROPOSED` or `COUNTERED`.
8. Verify it is not expired.
9. Verify no partner invitation is pending.
10. Verify all custom partner invitations are accepted.
11. Revalidate every catalog listing.
12. Reserve stock or service capacity.
13. Create one contract.
14. Create one order per node.
15. Create one payment obligation per order.
16. Mark the accepted version `ACCEPTED`, then `LOCKED`.
17. Mark the request `CONTRACTED`.
18. Mark competing proposal lineages as no longer selectable.
19. Insert outbox events.
20. Commit.

If any validation fails, the entire transaction rolls back.

## Concurrency order

Use a consistent lock order:

```text
request
→ proposal lineage
→ proposal version
→ listing/capacity resource
```

Two citizens cannot accept two proposals concurrently because `contracts.request_id` is unique and the request row is locked first.

Recommended isolation:

- `READ COMMITTED` plus explicit locks is usually sufficient.
- Use `SERIALIZABLE` for inventory or complex capacity allocation if needed.
- Retry serialization failures.
- Never use `SKIP LOCKED` for final acceptance because that can incorrectly report capacity unavailable.

---

# 7. Partner Confirmation Gate

The proposal’s gate status should be derived from invitation states.

```text
NOT_REQUIRED
    ↓
PENDING_PARTNER_CONFIRMATION
    ├── all invitations ACCEPTED → READY
    ├── any invitation DECLINED → BLOCKED
    ├── any invitation EXPIRED → EXPIRED
    └── terms changed → PENDING_PARTNER_CONFIRMATION
```

A citizen can view a proposal with a pending gate, but cannot accept it.

Example API response:

```json
{
  "proposal_id": "PROP-001",
  "version": 2,
  "acceptance": {
    "allowed": false,
    "reason": "PARTNER_CONFIRMATION_REQUIRED",
    "pending_partners": [
      {
        "provider_id": "PROV-DANNY",
        "node_type": "DELIVERY"
      }
    ]
  }
}
```

The citizen should not see private partner negotiation messages unless the business rules explicitly permit it.

---

# 8. Bidding Privacy Modes

## Mode A: Sealed bidding

Rules:

- Requester sees all proposals for the request.
- Lead provider sees its own proposal and versions.
- Competitors cannot see other providers’ proposal existence, price, totals, or line items.
- Partner providers see only their own invitation terms.
- Public search must not expose bid count if that count creates competitive leakage.
- Notifications must not reveal competing proposal information.

## Mode B: Open tender

Rules:

- Any authorized town viewer can see submitted proposals.
- Prices, line items, breakdowns, and provider identity may be visible.
- Private negotiation chat remains private unless explicitly published.
- Drafts and withdrawn proposals should normally remain private or be shown as withdrawn without sensitive terms.

## Mode C: Direct invite

Rules:

- Requester sees the request and all invited-provider responses.
- Invited providers see the request scope necessary to respond.
- A provider sees its own proposal.
- An invited partner sees only the node invitation relevant to it.
- Non-invited providers cannot discover the request through normal APIs or search.

## RLS approach

Use application identity in a transaction-local setting:

```sql
SET LOCAL app.user_id = '...';
SET LOCAL app.provider_id = '...';
```

Example helper:

```sql
CREATE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT current_setting('app.user_id', true)::uuid
$$;
```

Enable and force RLS:

```sql
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests FORCE ROW LEVEL SECURITY;

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;

ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_versions FORCE ROW LEVEL SECURITY;
```

Representative policy:

```sql
CREATE POLICY request_visibility_policy
ON requests
FOR SELECT
USING (
    owner_user_id = app_user_id()
    OR (
        visibility IN ('SEALED', 'OPEN_TENDER')
        AND status = 'PUBLISHED'
    )
    OR EXISTS (
        SELECT 1
        FROM request_invites ri
        JOIN providers p ON p.id = ri.provider_id
        WHERE ri.request_id = requests.id
          AND p.user_id = app_user_id()
          AND ri.active = true
    )
);
```

Proposal policy:

```sql
CREATE POLICY proposal_visibility_policy
ON proposals
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM requests r
        WHERE r.id = proposals.request_id
          AND r.owner_user_id = app_user_id()
    )
    OR EXISTS (
        SELECT 1
        FROM providers p
        WHERE p.id = proposals.lead_provider_id
          AND p.user_id = app_user_id()
    )
    OR EXISTS (
        SELECT 1
        FROM requests r
        WHERE r.id = proposals.request_id
          AND r.visibility = 'OPEN_TENDER'
          AND r.status IN ('PUBLISHED', 'CONTRACTED')
    )
);
```

For sealed and direct-invite modes, do not grant a partner access to the entire proposal version merely because it has an invitation. Expose a separate secure invitation projection containing only:

- requested node,
- amount,
- payout,
- quantity,
- schedule,
- fulfillment terms,
- expiry,
- requester location if necessary.

Do not grant the partner access to a row containing the proposal’s total unless that is intentional.

## Additional privacy controls

RLS alone is insufficient if the API leaks information through:

- bid counts,
- notification payloads,
- search indexes,
- websocket subscriptions,
- cache keys,
- analytics endpoints,
- audit logs,
- error messages.

All of these must apply the same visibility policy.

---

# 9. Orders, Independent Payment, and Fault Isolation

## No pooled escrow

For a two-node proposal:

```text
Order 1 → Hardware
Payment obligation 1 → ₱160

Order 2 → Electrician
Payment obligation 2 → ₱240
```

A combined checkout experience may exist, but the ledger must preserve separate obligations. A single payment authorization must be allocated to individual obligations, not treated as one pooled escrow balance.

## Readiness is not completion

Create an append-only readiness event table:

```sql
CREATE TABLE order_fulfillment_events (
    id                  uuid PRIMARY KEY,
    order_id            uuid NOT NULL REFERENCES orders(id),
    event_type          text NOT NULL,
    actor_user_id       uuid REFERENCES users(id),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_event_id     text,
    occurred_at         timestamptz NOT NULL DEFAULT now(),

    UNIQUE (order_id, event_type, source_event_id)
);
```

`ready_for_collection` means:

```text
The item is physically ready for the next fulfillment step.
```

It does not mean:

```text
The order is delivered or completed.
```

Typical flow:

```text
CREATED
→ PAYMENT_PENDING
→ CONFIRMED
→ IN_PROGRESS
→ READY_FOR_COLLECTION
→ COLLECTED
→ OUT_FOR_DELIVERY
→ DELIVERED
→ COMPLETED
```

For labor, the relevant terminal evidence may be:

```text
service_started
service_delivered
requester_confirmed
```

Do not force every order type into a collection workflow.

## Fault isolation

Each child order has independent:

- status,
- seller,
- price,
- payment obligation,
- cancellation,
- dispute,
- refund,
- fulfillment events.

Examples:

### Courier breaks down

- Courier order becomes `FAILED` or `DISPUTED`.
- Hardware order remains `COMPLETED` or `IN_PROGRESS`.
- Labor order is not automatically reversed.
- A replacement courier requires a new order or authorized amendment.
- Any refund applies only to the courier obligation unless the contract explicitly provides broader remedies.

### Resident cancels labor after receiving the breaker

- Hardware order remains payable and can complete.
- Labor order moves to `CANCELLED`, subject to its cancellation terms.
- The contract becomes `PARTIALLY_FULFILLED` or `DISPUTED`.
- No automatic reversal of the completed hardware order.

### Partner fails after customer acceptance

Because standard catalog participation is pre-authorized, Y may be in breach of the order terms. The system should not silently substitute a new provider or price. Use:

- cancellation,
- refund of that order,
- dispute,
- replacement proposal/order,
- provider penalty according to marketplace policy.

---

# 10. State Transition Tables

## Request

| Current | Next | Rule |
|---|---|---|
| `DRAFT` | `PUBLISHED` | Required fields and location valid |
| `PUBLISHED` | `PAUSED` | Owner or moderation |
| `PAUSED` | `PUBLISHED` | Still within validity period |
| `PUBLISHED` | `CONTRACTED` | Contract successfully finalized |
| `PUBLISHED` | `CLOSED` | Owner closes without acceptance |
| `PUBLISHED` | `CANCELLED` | Moderation or exceptional cancellation |
| `CONTRACTED` | `COMPLETED` | All relevant orders complete |
| `CONTRACTED` | `PARTIALLY_FULFILLED` | At least one order fails or is cancelled |

## Listing

| Current | Next | Rule |
|---|---|---|
| `DRAFT` | `PUBLISHED` | Valid published version exists |
| `PUBLISHED` | `PAUSED` | Temporarily unavailable |
| `PAUSED` | `PUBLISHED` | Provider reopens |
| `PUBLISHED` | `CLOSED` | Provider permanently closes |
| `CLOSED` | none | Existing accepted orders remain historical |

Closing a listing must not mutate historical proposal or order snapshots.

## Partner invitation

| Current | Next | Rule |
|---|---|---|
| `PENDING` | `ACCEPTED` | Exact terms accepted |
| `PENDING` | `DECLINED` | Partner rejects |
| `PENDING` | `COUNTERED` | Partner proposes changed terms |
| `PENDING` | `EXPIRED` | Expiry reached |
| `PENDING` | `CANCELLED` | Proposal version superseded |
| `ACCEPTED` | `CANCELLED` | New proposal version changes terms |

## Contract

| Current | Next | Rule |
|---|---|---|
| `FINALIZED` | `ACTIVE` | Orders are active |
| `ACTIVE` | `PARTIALLY_FULFILLED` | Some orders finish or fail |
| `ACTIVE` | `COMPLETED` | All required orders complete |
| `ACTIVE` | `CANCELLED` | Contract-level cancellation |
| Any active state | `DISPUTED` | Formal dispute |
| `FINALIZED` | `FAILED` | Finalization rollback or exceptional failure |

## Order

| Current | Next | Rule |
|---|---|---|
| `CREATED` | `PAYMENT_PENDING` | Payment requested |
| `PAYMENT_PENDING` | `CONFIRMED` | Payment authorized or business rule permits credit |
| `CONFIRMED` | `IN_PROGRESS` | Seller begins fulfillment |
| `IN_PROGRESS` | `READY_FOR_COLLECTION` | Readiness fact recorded |
| `READY_FOR_COLLECTION` | `COLLECTED` | Collection confirmed |
| `COLLECTED` | `OUT_FOR_DELIVERY` | Courier dispatches |
| `OUT_FOR_DELIVERY` | `DELIVERED` | Delivery evidence recorded |
| `DELIVERED` | `COMPLETED` | Completion evidence/acceptance |
| Any non-terminal state | `CANCELLED` | Valid cancellation |
| Any active state | `FAILED` | Fulfillment failure |
| Any active state | `DISPUTED` | Formal dispute |

Every transition should be validated by a transition function, not by accepting arbitrary status values from the frontend.

---

# 11. Outbox Events

The outbox row must be inserted in the same transaction as the state change.

```sql
CREATE TABLE outbox_events (
    id                  uuid PRIMARY KEY,
    aggregate_type      text NOT NULL,
    aggregate_id        uuid NOT NULL,
    event_type          text NOT NULL,
    event_version       integer NOT NULL DEFAULT 1,
    payload             jsonb NOT NULL,
    occurred_at         timestamptz NOT NULL DEFAULT now(),
    available_at        timestamptz NOT NULL DEFAULT now(),
    attempts            integer NOT NULL DEFAULT 0,
    processed_at        timestamptz,
    last_error          text,

    UNIQUE (aggregate_type, aggregate_id, event_type, event_version)
);
```

Recommended events:

```text
request.published
request.paused
request.contracted
request.closed

listing.published
listing.paused
listing.closed

proposal.submitted
proposal.version.created
proposal.version.superseded
proposal.withdrawn
proposal.expired

partner.confirmation.requested
partner.confirmation.accepted
partner.confirmation.declined
partner.confirmation.expired

proposal.accepted
proposal.locked
contract.finalized

order.created
payment.obligation.created
payment.authorized
payment.failed

inventory.reserved
inventory.reservation.released

order.ready_for_collection
order.collected
order.delivered
order.completed
order.cancelled
order.failed
order.disputed
```

## Notification rule

For a standard catalog reference:

```text
proposal.submitted
```

must not generate:

```text
partner.confirmation.requested
```

At finalization, generate:

```text
contract.finalized
order.created
```

Those events notify the partner provider.

For custom terms:

```text
proposal.version.created
→ partner.confirmation.requested
```

Only the affected partner should be notified, with the minimum necessary information.

Outbox consumers must be idempotent. A notification retry must not send duplicate push notifications or duplicate SMS messages.

---

# 12. Optimistic Locking and API Rules

Every mutable aggregate should have `lock_version`.

Example:

```http
If-Match: "proposal-version-7"
```

Update:

```sql
UPDATE proposal_versions
SET lock_version = lock_version + 1,
    ...
WHERE id = :id
  AND lock_version = :expected_version;
```

If zero rows are updated:

```text
409 CONFLICT
STALE_VERSION
```

For critical commands, use both:

- optimistic `If-Match`,
- pessimistic row locking inside the transaction.

Required idempotency keys:

```text
POST request
POST proposal
POST counteroffer
POST partner decision
POST accept proposal
POST payment attempt
POST fulfillment event
```

Store:

```sql
CREATE TABLE idempotency_keys (
    actor_user_id       uuid NOT NULL REFERENCES users(id),
    endpoint            text NOT NULL,
    idempotency_key     text NOT NULL,
    request_hash        bytea NOT NULL,
    response_snapshot   jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (actor_user_id, endpoint, idempotency_key)
);
```

A repeated accept request must return the existing contract rather than create another one.

---

# 13. Unified Creation Flow

The user experience may have one “Post” button, but the backend should use separate domain commands.

## Demand creation

```http
POST /v1/requests
```

Creates:

```text
requests
request_media
request_invites, if applicable
request.published event
```

A request expresses:

```text
I need something.
```

## Supply creation

```http
POST /v1/listings
```

Creates:

```text
listings
listing_versions
listing media
listing.published event
```

A listing expresses:

```text
I provide or sell something.
```

Do not use one overloaded table with nullable columns such as:

```text
request_description
listing_price
provider_id
requester_id
```

That produces invalid states and confusing constraints.

A shared `posts` read model may be used for search:

```text
post_type = REQUEST | LISTING
source_id
visibility
location
search_document
```

However, `posts` should be a projection, not the authoritative business table.

The backend should never infer demand versus supply from free-form text. The command discriminator must be explicit.

---

# 14. Important Edge Cases

## Proposal and request races

- Two providers submit simultaneously: allowed.
- Two citizens accept different proposals: request row lock plus `UNIQUE(request_id)` on contracts prevents double acceptance.
- Lead submits a counter while citizen accepts old version: lock proposal and verify `current_version_id`; stale acceptance gets `409`.
- Request closes while a proposal is being submitted: lock request and reject the submission if no longer publishable.

## Listing races

- Listing price changes after proposal submission: use the referenced listing version; never silently change the proposal.
- Listing goes out of stock between display and acceptance: final reservation fails atomically.
- Two citizens accept the last unit: capacity lock or atomic inventory decrement allows only one.
- Provider closes listing after standard reference but before acceptance: reject unless the quoted listing version explicitly remains valid.
- Provider account is suspended: final acceptance fails or sends the proposal into revalidation.

## Partner races

- Partner accepts an invitation, then lead edits the proposal: previous acceptance is invalid.
- Partner accepts, then inventory disappears: final acceptance still revalidates.
- Partner declines after the citizen opens the proposal: citizen sees the proposal as blocked.
- Partner does not respond: invitation expires; the citizen cannot accept.
- Partner is not yet registered: use an invitation/onboarding record, but do not create a provider order until identity and payout eligibility are complete.

## Negotiation

- Chat messages arrive out of order: server timestamps and sequence numbers are authoritative.
- Duplicate counteroffer command: idempotency key returns the original version.
- A proposal is edited after acceptance: reject; use amendment flow.
- A proposal contains a cyclic chain: reject at graph validation.
- Same provider appears in several nodes: allowed only if each node is independently meaningful and separately payable.
- A provider attaches another provider’s private listing: reject unless authorized by listing policy or invitation.

## Money

- Store Philippine peso values as integer centavos.
- Never use floating point.
- Calculate totals server-side.
- Store the currency even if only PHP is currently supported.
- Snapshot tax, platform fee, discount, payout, and customer amount at order creation.
- Do not recompute historical orders from current listing prices.

## Fulfillment

- `ready_for_collection` is not `completed`.
- A courier cannot mark a hardware order completed without valid collection/delivery evidence.
- A labor provider cannot complete a product order.
- Completed upstream orders are not automatically cancelled when downstream orders fail.
- Refunds and disputes operate per payment obligation.

## Privacy

- Do not expose sealed bid counts, totals, ranking, or “someone bid lower” hints.
- Do not place private amounts in broad outbox payloads.
- Do not use a public websocket channel for sealed proposals.
- Ensure search indexes and cache keys include visibility scope.
- Prevent provider-side error messages from revealing whether another competitor submitted a bid.

## Operational reliability

- Outbox workers retry safely.
- Payment webhooks are idempotent.
- Inventory reservations have expiration and release jobs.
- Every state transition is recorded in an append-only history table.
- Administrative corrections require explicit reason, actor, and audit record.
- Background jobs must recheck current state before acting.

---

# 15. Recommended Implementation Boundary

The following operations should be implemented as backend commands or stored procedures rather than generic CRUD:

```text
publish_request()
publish_listing()
submit_proposal()
create_counteroffer()
invite_partner()
respond_to_partner_invitation()
accept_proposal()
reserve_capacity()
finalize_contract()
transition_order()
record_readiness_event()
cancel_order()
```

The frontend should submit intent plus `If-Match` and idempotency keys. It should not submit:

- final totals,
- arbitrary statuses,
- provider payout calculations,
- contract IDs,
- order counts,
- partner confirmation overrides.

---

# Final Recommendation

Proceed with:

1. Immutable listing versions.
2. Immutable proposal versions.
3. Explicit `STANDARD_AUTO_BIND` listing authorization.
4. Custom-term partner invitations.
5. One active version per proposal lineage.
6. Multiple concurrent proposal lineages per request.
7. One accepted contract per request.
8. One independent order and one payment obligation per proposal node.
9. Transactional contract finalization with live capacity revalidation.
10. PostgreSQL RLS plus privacy-safe projections.
11. Outbox-driven notifications and integrations.
12. Strict command-based state transitions with optimistic locking.

The most important conceptual rule is:

> Speculation belongs to the proposal. Commitment begins at contract finalization. Fulfillment and payment remain independent at the order level.

That separation gives Serbizyu the flexibility to support turnkey chains, standalone labor, direct merchant supply, negotiation, and partner participation without introducing hidden obligations, pooled-payment ambiguity, stale-price surprises, or privacy leaks.