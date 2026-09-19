# Architectural Position

Serbizyu should distinguish three different concepts:

1. **A provider quote**  
   One provider’s commercial offer for one or more line items.

2. **A quote package**  
   A buyer-facing proposal that composes multiple provider quotes into one proposed solution.

3. **A Deal Chain**  
   The execution graph of required outcomes and dependencies after the proposal is accepted.

A quote package is not a payment account, pooled wallet, composite listing, or parent order. It is only a coordination and selection structure.

The recommended relationship is:

```text
Request
  ├── Standalone Quote
  │     └── Quote Line Item
  │           └── DealNeed
  │                 └── Child Order
  │
  └── Quote Package
        ├── Provider Quote: Electrician
        ├── Provider Quote: Hardware Merchant
        └── Draft DealChain
              ├── DealNeed: source breaker
              │     └── Hardware Order
              └── DealNeed: inspect and repair
                    └── Electrician Order
```

The package total may be displayed as ₱400, but Serbizyu must not create a `package_payment` or pooled settlement record. There are two distinct payment obligations:

```text
Hardware child order: ₱160
Electrician child order: ₱240
```

---

# 1. Use Case 1: Standalone Quote Versus Deal-Chained Quote

## 1.1 Standalone electrician quote

Electrician A offers:

```text
Labor-only repair: ₱300
Parts: excluded
```

This can remain a normal `quotes` record.

The quote should represent one provider’s obligation:

```text
quotes
  id: Q-A
  request_id: R-1
  provider_user_id: electrician-a
  amount_minor: 30000
  currency: PHP
  status: submitted
```

Add normalized quote lines rather than relying exclusively on `amount_components` JSON.

```text
quote_line_items
  id
  quote_id
  line_no
  kind                 -- service, product, delivery, fee
  description
  quantity
  unit_amount_minor
  amount_minor
  currency
  deal_need_id         -- nullable while quote is still being evaluated
  source_listing_id    -- nullable
  fulfillment_role     -- perform, supply, transport, etc.
  is_optional
  terms_snapshot       JSONB
```

For a standalone quote, there will usually be one line:

```json
{
  "kind": "service",
  "description": "Diagnose and repair kitchen breaker fault",
  "quantity": 1,
  "unit_amount_minor": 30000,
  "amount_minor": 30000,
  "currency": "PHP",
  "fulfillment_role": "perform"
}
```

The existing `quotes.amount_components` can be retained for backward compatibility, but the normalized `quote_line_items` should become canonical for order and DealNeed generation.

---

## 1.2 Turnkey quote

Electrician B proposes:

```text
Breaker: ₱160 from Tagudin Hardware
Labor: ₱240 from Electrician B
Total displayed proposal: ₱400
```

There are two valid commercial models.

### Model A: Separate buyer obligations — recommended for this use case

The buyer is directly purchasing:

1. A breaker from Tagudin Hardware.
2. Repair labor from Electrician B.

This requires a quote package containing multiple provider quotes.

```text
Quote Package
  ├── Hardware quote: ₱160
  └── Electrician quote: ₱240
```

The package creates a draft graph:

```text
source breaker
  └── blocks transition of ──> perform repair
```

Each DealNeed produces its own child order.

### Model B: Electrician assumes all buyer-facing responsibility

If Electrician B actually owns or resells the breaker and is contractually responsible for sourcing it, then the buyer may have only one order to Electrician B:

```text
Electrician B order:
  - breaker material: ₱160
  - repair labor: ₱240
  - total: ₱400
```

That is acceptable only if Electrician B is genuinely the provider of both obligations. It must not be represented as a fake Tagudin Hardware listing or as a hidden pooled purchase.

If Tagudin Hardware remains the actual seller and beneficiary, use Model A.

---

# 2. Recommended Quote Package Schema

## 2.1 `quote_packages`

```text
quote_packages
-------------------------------
id UUID PRIMARY KEY
request_id UUID NOT NULL REFERENCES requests(id)
coordinator_user_id UUID NOT NULL REFERENCES users(id)
deal_chain_id UUID NULL REFERENCES deal_chains(id)

status VARCHAR NOT NULL
  CHECK status IN (
    'draft',
    'submitted',
    'pending_participant_confirmation',
    'partially_accepted',
    'accepted',
    'declined',
    'expired',
    'superseded',
    'cancelled'
  )

acceptance_mode VARCHAR NOT NULL DEFAULT 'atomic'
  CHECK acceptance_mode IN ('atomic', 'independent')

currency CHAR(3) NOT NULL
display_total_minor BIGINT NULL
expires_at TIMESTAMPTZ NULL

version INTEGER NOT NULL DEFAULT 1
correlation_id UUID NOT NULL
created_at TIMESTAMPTZ NOT NULL
updated_at TIMESTAMPTZ NOT NULL
```

`display_total_minor` is a convenience amount. It must be derived from package items and must not be used as the basis for settlement.

Recommended constraint:

```text
display_total_minor =
SUM(mandatory package item amounts in the same currency)
```

This can be enforced by application logic plus a database trigger.

## 2.2 `quote_package_items`

```text
quote_package_items
-------------------------------
id UUID PRIMARY KEY
quote_package_id UUID NOT NULL REFERENCES quote_packages(id)
quote_id UUID NULL REFERENCES quotes(id)
quote_line_item_id UUID NULL REFERENCES quote_line_items(id)

client_need_key VARCHAR NOT NULL
kind VARCHAR NOT NULL
  CHECK kind IN ('service', 'product', 'delivery', 'fee')

provider_user_id UUID NOT NULL REFERENCES users(id)
listing_id UUID NULL REFERENCES listings(id)

description TEXT NOT NULL
quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0)

amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0)
currency CHAR(3) NOT NULL

required BOOLEAN NOT NULL DEFAULT TRUE
optional_group_code VARCHAR NULL
fulfillment_role VARCHAR NOT NULL

requires_provider_confirmation BOOLEAN NOT NULL DEFAULT TRUE
source_version INTEGER NULL
terms_snapshot JSONB NOT NULL

created_at TIMESTAMPTZ NOT NULL
```

Important rules:

- `provider_user_id` must be the party responsible for the resulting child order.
- A coordinator cannot assign a provider’s listing or capacity without permission.
- The quoted amount and terms are copied into `terms_snapshot` when the package is submitted.
- A later quote revision must not silently change an already-submitted package.
- A package can contain alternatives using `optional_group_code`.

For example:

```text
optional_group_code = 'repair_solution'
```

would allow the buyer to select either:

```text
Labor-only quote
```

or:

```text
Turnkey quote package
```

but not accidentally accept both.

## 2.3 `quote_package_dependencies`

```text
quote_package_dependencies
-------------------------------
id UUID PRIMARY KEY
quote_package_id UUID NOT NULL REFERENCES quote_packages(id)
predecessor_item_id UUID NOT NULL REFERENCES quote_package_items(id)
successor_item_id UUID NOT NULL REFERENCES quote_package_items(id)

blocks_transition BOOLEAN NOT NULL DEFAULT TRUE
condition_code VARCHAR NOT NULL

UNIQUE (
  quote_package_id,
  predecessor_item_id,
  successor_item_id,
  condition_code
)
```

The final Deal Chain dependency should be copied into the existing `deal_dependencies` table.

---

# 3. Should the Coordinating Provider Assemble the Deal Chain?

Yes, but only as a **draft proposal**.

The recommended flow is:

```text
1. Provider submits one or more quotes.
2. Coordinator assembles a quote package.
3. Serbizyu creates a draft DealChain.
4. Draft DealNeeds and dependencies are generated.
5. External providers confirm their participation.
6. Buyer accepts the package.
7. The graph is frozen.
8. Independent child orders are created.
```

The draft DealChain must not create payment obligations or orders.

Add the following fields to `deal_chains`:

```text
deal_chains
-------------------------------
id UUID PRIMARY KEY
request_id UUID NULL REFERENCES requests(id)
coordinator_user_id UUID NULL REFERENCES users(id)
origin_quote_package_id UUID NULL REFERENCES quote_packages(id)

status
version
currency
terms_hash
created_at
updated_at
```

Recommended fields on `deal_needs`:

```text
deal_needs
-------------------------------
id UUID PRIMARY KEY
deal_chain_id UUID NOT NULL REFERENCES deal_chains(id)

kind                  -- service or product
role_code             -- prepare, supply, inspect, repair, transport, install
title
description

responsible_provider_user_id UUID NOT NULL REFERENCES users(id)
source_quote_id UUID NULL REFERENCES quotes(id)
source_quote_line_item_id UUID NULL REFERENCES quote_line_items(id)

status
readiness_state
required BOOLEAN NOT NULL DEFAULT TRUE
sequence_no INTEGER NULL
terms_snapshot JSONB NOT NULL

version
created_at
updated_at
```

A `DealNeed` is the required outcome. It is not the quote, listing, user, message thread, or order.

For the electrician example:

```text
DealNeed 1:
  kind: product
  role_code: supply
  title: Source compatible kitchen breaker
  provider: Tagudin Hardware

DealNeed 2:
  kind: service
  role_code: inspect_and_repair
  title: Diagnose and repair breaker fault
  provider: Electrician B
```

Dependency:

```text
DealNeed 1 --blocks repair readiness--> DealNeed 2
```

---

# 4. Quote Package API Payloads

## 4.1 Standalone quote submission

```http
POST /api/requests/{requestId}/quotes
Idempotency-Key: 74c6...
If-Match: "request-version-7"
```

```json
{
  "currency": "PHP",
  "amount_minor": 30000,
  "expires_at": "2026-06-10T10:00:00+08:00",
  "scope": "Diagnose and repair the kitchen breaker fault.",
  "inclusions": [
    "Inspection",
    "Labor for repair"
  ],
  "exclusions": [
    "Replacement breaker",
    "Additional rewiring outside the described fault"
  ],
  "work_shape": "onsite",
  "payment_lane_options": [
    {
      "code": "pay_after_completion",
      "label": "Pay after repair is completed"
    }
  ],
  "line_items": [
    {
      "kind": "service",
      "description": "Diagnose and repair kitchen breaker fault",
      "quantity": 1,
      "unit_amount_minor": 30000,
      "amount_minor": 30000,
      "currency": "PHP",
      "fulfillment_role": "perform",
      "is_optional": false
    }
  ]
}
```

The provider identity must be derived from the authenticated user, not accepted from the request body.

---

## 4.2 Hardware quote

```http
POST /api/requests/{requestId}/quotes
```

```json
{
  "currency": "PHP",
  "amount_minor": 16000,
  "expires_at": "2026-06-08T18:00:00+08:00",
  "scope": "Supply one compatible kitchen breaker.",
  "inclusions": [
    "One compatible breaker",
    "Basic compatibility confirmation"
  ],
  "exclusions": [
    "Installation",
    "Electrical diagnosis"
  ],
  "line_items": [
    {
      "kind": "product",
      "description": "Compatible kitchen breaker",
      "quantity": 1,
      "unit_amount_minor": 16000,
      "amount_minor": 16000,
      "currency": "PHP",
      "listing_id": "listing-hardware-breaker-01",
      "fulfillment_role": "supply",
      "is_optional": false
    }
  ]
}
```

---

## 4.3 Electrician quote

```json
{
  "currency": "PHP",
  "amount_minor": 24000,
  "expires_at": "2026-06-08T18:00:00+08:00",
  "scope": "Diagnose the breaker fault and install the supplied replacement breaker.",
  "inclusions": [
    "Diagnosis",
    "Installation labor",
    "Basic testing"
  ],
  "exclusions": [
    "Replacement breaker"
  ],
  "line_items": [
    {
      "kind": "service",
      "description": "Diagnose and install supplied breaker",
      "quantity": 1,
      "unit_amount_minor": 24000,
      "amount_minor": 24000,
      "currency": "PHP",
      "fulfillment_role": "perform",
      "is_optional": false
    }
  ]
}
```

---

## 4.4 Quote package creation

```http
POST /api/requests/{requestId}/quote-packages
Idempotency-Key: 8b92...
```

```json
{
  "acceptance_mode": "atomic",
  "currency": "PHP",
  "expires_at": "2026-06-08T18:00:00+08:00",
  "coordinator_user_id": "electrician-b",
  "items": [
    {
      "source_quote_id": "quote-hardware-01",
      "source_quote_line_item_id": "quote-line-hardware-01",
      "client_need_key": "source_breaker",
      "kind": "product",
      "description": "Compatible kitchen breaker",
      "provider_user_id": "tagudin-hardware-user",
      "listing_id": "listing-hardware-breaker-01",
      "quantity": 1,
      "amount_minor": 16000,
      "currency": "PHP",
      "fulfillment_role": "supply",
      "required": true,
      "requires_provider_confirmation": true
    },
    {
      "source_quote_id": "quote-electrician-b-01",
      "source_quote_line_item_id": "quote-line-electrician-b-01",
      "client_need_key": "repair_breaker_fault",
      "kind": "service",
      "description": "Diagnose and install supplied breaker",
      "provider_user_id": "electrician-b",
      "quantity": 1,
      "amount_minor": 24000,
      "currency": "PHP",
      "fulfillment_role": "perform",
      "required": true,
      "requires_provider_confirmation": true
    }
  ],
  "dependencies": [
    {
      "predecessor_need_key": "source_breaker",
      "successor_need_key": "repair_breaker_fault",
      "blocks_transition": true,
      "condition_code": "material_available_for_installation"
    }
  ]
}
```

The server should calculate the display total:

```json
{
  "display_total_minor": 40000,
  "currency": "PHP"
}
```

The package should enter `pending_participant_confirmation` if the hardware provider has not confirmed the offer.

The electrician cannot unilaterally create an accepted hardware order merely by referencing the hardware provider.

---

## 4.5 Buyer acceptance

```http
POST /api/quote-packages/{packageId}/accept
Idempotency-Key: buyer-accept-2f71
If-Match: "package-version-3"
```

```json
{
  "selected_optional_groups": {},
  "accept_required_items": [
    "package-item-hardware-01",
    "package-item-electrician-01"
  ],
  "accept_terms": true,
  "delivery_address": {
    "address_line_1": "Barangay ...",
    "municipality": "Tagudin",
    "province": "Ilocos Sur",
    "postal_code": "2714",
    "latitude": 17.123456,
    "longitude": 120.123456
  }
}
```

The server must validate:

- Every mandatory item is still valid.
- Every required provider has confirmed.
- All quote expirations are valid.
- Prices and listing versions have not changed.
- The dependency graph is acyclic.
- No provider is being impersonated.
- Capacity reservations, if applicable, are still available.

---

# 5. Use Case 2: Listing Fulfillment Presets

A Bibingka listing should not contain a fake combined “Bibingka + Tagudin Express” product. Instead, the listing exposes fulfillment choices.

## 5.1 `listing_fulfillment_presets`

```text
listing_fulfillment_presets
-------------------------------
id UUID PRIMARY KEY
listing_id UUID NOT NULL REFERENCES listings(id)

code VARCHAR NOT NULL
mode VARCHAR NOT NULL
  CHECK mode IN ('pickup', 'delivery')

title VARCHAR NOT NULL
description TEXT NULL

active BOOLEAN NOT NULL DEFAULT TRUE
is_default BOOLEAN NOT NULL DEFAULT FALSE

price_policy VARCHAR NOT NULL
  CHECK price_policy IN ('free', 'fixed', 'provider_quote', 'at_checkout')

configured_fee_minor BIGINT NULL
currency CHAR(3) NULL

configuration JSONB NOT NULL DEFAULT '{}'
version INTEGER NOT NULL DEFAULT 1

UNIQUE (listing_id, code)
```

For Ate Gina’s listing:

```text
pickup:
  mode = pickup
  configured_fee_minor = 0

delivery:
  mode = delivery
  price_policy = at_checkout
```

## 5.2 `fulfillment_preset_partners`

```text
fulfillment_preset_partners
-------------------------------
id UUID PRIMARY KEY
preset_id UUID NOT NULL REFERENCES listing_fulfillment_presets(id)

provider_user_id UUID NOT NULL REFERENCES users(id)
provider_listing_id UUID NULL REFERENCES listings(id)
capability_profile_id UUID NULL REFERENCES capability_profiles(id)

display_name_snapshot VARCHAR NOT NULL
is_recommended BOOLEAN NOT NULL DEFAULT FALSE
priority INTEGER NOT NULL DEFAULT 100
active BOOLEAN NOT NULL DEFAULT TRUE

configured_amount_minor BIGINT NULL
currency CHAR(3) NULL
price_policy VARCHAR NOT NULL
  CHECK price_policy IN ('fixed', 'provider_quote', 'at_checkout')

configuration JSONB NOT NULL DEFAULT '{}'
version INTEGER NOT NULL DEFAULT 1

CHECK (
  provider_listing_id IS NOT NULL
  OR capability_profile_id IS NOT NULL
)
```

Example:

```text
Delivery preset
  ├── Tagudin Express
  │     configured amount: ₱60
  │     recommended: true
  │
  └── Kuya Danny Tricycle
        configured amount: ₱80
        recommended: false
```

The default partner is only a recommendation. The buyer’s selection must be recorded separately.

---

# 6. Checkout-Time Fulfillment Offers

Static preset data is not sufficient for checkout. Prices, availability, and capacity must be revalidated.

Add:

## 6.1 `checkout_sessions`

```text
checkout_sessions
-------------------------------
id UUID PRIMARY KEY
buyer_user_id UUID NOT NULL REFERENCES users(id)
status VARCHAR NOT NULL
  CHECK status IN (
    'draft',
    'priced',
    'awaiting_confirmation',
    'confirmed',
    'expired',
    'cancelled'
  )

currency CHAR(3) NOT NULL
expires_at TIMESTAMPTZ NOT NULL
version INTEGER NOT NULL DEFAULT 1
idempotency_key VARCHAR NOT NULL
```

## 6.2 `fulfillment_option_offers`

```text
fulfillment_option_offers
-------------------------------
id UUID PRIMARY KEY
checkout_session_id UUID NOT NULL REFERENCES checkout_sessions(id)
checkout_line_id UUID NOT NULL

preset_id UUID NOT NULL REFERENCES listing_fulfillment_presets(id)
partner_id UUID NULL REFERENCES fulfillment_preset_partners(id)

mode VARCHAR NOT NULL
amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0)
currency CHAR(3) NOT NULL

listing_version INTEGER NOT NULL
partner_version INTEGER NULL
capacity_reservation_id UUID NULL

offer_token_hash VARCHAR NOT NULL
status VARCHAR NOT NULL
  CHECK status IN ('available', 'selected', 'expired', 'consumed', 'invalidated')

valid_until TIMESTAMPTZ NOT NULL
terms_snapshot JSONB NOT NULL
```

The offer token is preferably opaque and server-generated. The frontend must not construct or modify it.

## 6.3 `capacity_reservations`

```text
capacity_reservations
-------------------------------
id UUID PRIMARY KEY
provider_user_id UUID NOT NULL REFERENCES users(id)
fulfillment_offer_id UUID NOT NULL REFERENCES fulfillment_option_offers(id)

capacity_key VARCHAR NOT NULL
quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0)

status VARCHAR NOT NULL
  CHECK status IN ('held', 'consumed', 'released', 'expired')

expires_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ NOT NULL
```

Capacity should be reserved for a short period during checkout, not permanently held by a listing preset.

---

# 7. Listing and Checkout API Payloads

## 7.1 Listing fulfillment configuration

```http
POST /api/listings/{listingId}/fulfillment-presets
```

```json
{
  "expected_listing_version": 12,
  "presets": [
    {
      "code": "stall_pickup",
      "mode": "pickup",
      "title": "Stall pickup",
      "description": "Collect from Ate Gina's stall.",
      "is_default": true,
      "price_policy": "free",
      "configured_fee_minor": 0,
      "currency": "PHP",
      "partners": []
    },
    {
      "code": "doorstep_delivery",
      "mode": "delivery",
      "title": "Doorstep delivery",
      "description": "Delivery to the buyer's address.",
      "is_default": false,
      "price_policy": "at_checkout",
      "partners": [
        {
          "provider_user_id": "tagudin-express",
          "provider_listing_id": "listing-tagudin-express-local",
          "display_name": "Tagudin Express",
          "is_recommended": true,
          "priority": 10,
          "price_policy": "fixed",
          "configured_amount_minor": 6000,
          "currency": "PHP"
        },
        {
          "provider_user_id": "kuya-danny",
          "provider_listing_id": "listing-kuya-danny-tricycle",
          "display_name": "Kuya Danny Tricycle",
          "is_recommended": false,
          "priority": 20,
          "price_policy": "fixed",
          "configured_amount_minor": 8000,
          "currency": "PHP"
        }
      ]
    }
  ]
}
```

The API should reject a partner configuration if the seller does not have permission to recommend that provider or if the referenced courier listing is inactive.

---

## 7.2 Create checkout preview

```http
POST /api/checkout/sessions
Idempotency-Key: checkout-create-5aa1
```

```json
{
  "currency": "PHP",
  "cart_lines": [
    {
      "listing_id": "listing-bibingka-01",
      "quantity": 1,
      "expected_listing_version": 42
    }
  ],
  "fulfillment_selections": [
    {
      "cart_line_ref": "line-1",
      "preset_id": "preset-doorstep-delivery",
      "preferred_partner_id": "partner-tagudin-express",
      "allow_substitution": true,
      "destination": {
        "address_line_1": "Barangay ...",
        "municipality": "Tagudin",
        "province": "Ilocos Sur",
        "postal_code": "2714",
        "latitude": 17.123456,
        "longitude": 120.123456
      }
    }
  ]
}
```

The response should contain server-generated offers:

```json
{
  "checkout_session_id": "checkout-123",
  "status": "awaiting_confirmation",
  "currency": "PHP",
  "expires_at": "2026-06-08T12:05:00+08:00",
  "cart_lines": [
    {
      "id": "checkout-line-1",
      "listing_id": "listing-bibingka-01",
      "quantity": 1,
      "unit_amount_minor": 18000,
      "amount_minor": 18000,
      "listing_version": 42
    }
  ],
  "fulfillment_options": [
    {
      "id": "offer-pickup-1",
      "cart_line_id": "checkout-line-1",
      "mode": "pickup",
      "amount_minor": 0,
      "currency": "PHP",
      "valid_until": "2026-06-08T12:05:00+08:00"
    },
    {
      "id": "offer-delivery-tagudin-1",
      "cart_line_id": "checkout-line-1",
      "mode": "delivery",
      "provider_user_id": "tagudin-express",
      "display_name": "Tagudin Express",
      "amount_minor": 6000,
      "currency": "PHP",
      "capacity_reservation_id": "reservation-1",
      "valid_until": "2026-06-08T12:05:00+08:00"
    },
    {
      "id": "offer-delivery-danny-1",
      "cart_line_id": "checkout-line-1",
      "mode": "delivery",
      "provider_user_id": "kuya-danny",
      "display_name": "Kuya Danny Tricycle",
      "amount_minor": 8000,
      "currency": "PHP",
      "capacity_reservation_id": "reservation-2",
      "valid_until": "2026-06-08T12:05:00+08:00"
    }
  ],
  "display_totals": {
    "product_minor": 18000,
    "fulfillment_minor": 6000,
    "display_total_minor": 24000,
    "currency": "PHP"
  }
}
```

The total is a display total only. The resulting order obligations remain:

```text
Ate Gina order: ₱180
Tagudin Express order: ₱60
```

---

## 7.3 Confirm checkout

```http
POST /api/checkout/sessions/{checkoutId}/confirm
Idempotency-Key: checkout-confirm-9920
If-Match: "checkout-version-4"
```

```json
{
  "selected_offers": [
    {
      "checkout_line_id": "checkout-line-1",
      "fulfillment_offer_id": "offer-delivery-tagudin-1"
    }
  ],
  "accept_terms": true,
  "payment_method_token": "psp-method-token"
}
```

The server creates the merchant and courier child orders.

Conceptual response:

```json
{
  "checkout_session_id": "checkout-123",
  "status": "confirmed",
  "deal_chain_id": "chain-bibingka-01",
  "orders": [
    {
      "order_id": "order-food-01",
      "origin": "listing",
      "provider_user_id": "ate-gina",
      "amount_minor": 18000,
      "currency": "PHP",
      "status": "accepted",
      "deal_need_id": "need-prepare-bibingka",
      "payment_obligation_id": "payment-obligation-food-01",
      "fulfillment": {
        "mode": "delivery",
        "readiness_state": "preparing"
      }
    },
    {
      "order_id": "order-courier-01",
      "origin": "deal_chain",
      "provider_user_id": "tagudin-express",
      "amount_minor": 6000,
      "currency": "PHP",
      "status": "pending_acceptance",
      "deal_need_id": "need-deliver-bibingka",
      "payment_obligation_id": "payment-obligation-courier-01",
      "fulfillment": {
        "mode": "delivery",
        "readiness_state": "awaiting_collection"
      }
    }
  ],
  "display_total": {
    "minor": 24000,
    "currency": "PHP"
  }
}
```

For pickup, only the merchant order is created. There is no courier order.

---

# 8. Order and Payment Modeling

## 8.1 Orders should remain independent

Add or confirm the following fields:

```text
orders
-------------------------------
id
buyer_user_id
provider_user_id
origin
status
request_id
quote_id
deal_chain_id
deal_need_id

checkout_session_id NULL
order_group_id NULL
provider_acceptance_deadline NULL
```

`order_group_id` is only a correlation and display grouping mechanism. It must not create financial dependency.

Do not model courier orders with `parent_order_id` in a way that implies cancellation inheritance. The Deal Chain and dependency graph already express execution relationships.

## 8.2 Payment obligations

Add:

```text
order_payment_obligations
-------------------------------
id UUID PRIMARY KEY
order_id UUID NOT NULL UNIQUE REFERENCES orders(id)

amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0)
currency CHAR(3) NOT NULL

status VARCHAR NOT NULL
  CHECK status IN (
    'pending',
    'authorized',
    'captured',
    'partially_refunded',
    'refunded',
    'voided',
    'failed'
  )

capture_policy VARCHAR NOT NULL
payment_intent_id UUID NULL
terms_hash VARCHAR NOT NULL
created_at
updated_at
```

Every payment obligation must point to exactly one order.

A PSP may technically support one checkout transaction with multiple allocations, but the internal ledger must still contain one obligation per order. Serbizyu must never record one undifferentiated ₱240 obligation for a merchant-plus-courier package.

---

# 9. Immutable Terms Snapshots

On order finalization, create exactly one immutable final terms snapshot.

Recommended fields:

```text
order_terms_snapshots
-------------------------------
id UUID PRIMARY KEY
order_id UUID NOT NULL REFERENCES orders(id)

snapshot_no INTEGER NOT NULL
is_final BOOLEAN NOT NULL DEFAULT FALSE

source_quote_id UUID NULL
source_quote_line_item_id UUID NULL
source_fulfillment_offer_id UUID NULL

buyer_user_id UUID NOT NULL
provider_user_id UUID NOT NULL

amount_minor BIGINT NOT NULL
currency CHAR(3) NOT NULL

terms JSONB NOT NULL
terms_hash VARCHAR NOT NULL
captured_at TIMESTAMPTZ NOT NULL

UNIQUE (order_id, snapshot_no)
```

Recommended database protections:

- Reject `UPDATE` and `DELETE` after insertion.
- Use a trigger to ensure only one `is_final = true` row per order.
- Use `ON DELETE RESTRICT` for legal and financial records.
- Store the selected listing version, fulfillment version, address snapshot, exclusions, SLA, and provider identity.

---

# 10. Lifecycle Transitions

## 10.1 Request lifecycle

```text
draft
  -> published
  -> sourcing
  -> quoted
  -> accepted
  -> closed
```

Alternative terminal transitions:

```text
published/sourcing/quoted -> expired
published/sourcing/quoted -> cancelled
```

`requests.status = accepted` means at least one proposal has been accepted and an order or execution process has begun. It does not mean all child orders are complete.

## 10.2 Quote lifecycle

```text
draft
  -> submitted
  -> accepted
```

Other valid transitions:

```text
submitted -> declined
submitted -> withdrawn
submitted -> expired
submitted -> superseded
```

A quote should not be marked `accepted` merely because it was included in a package. It is accepted only after the relevant provider and buyer acceptance rules are satisfied.

## 10.3 Quote package lifecycle

```text
draft
  -> submitted
  -> pending_participant_confirmation
  -> accepted
```

Alternative paths:

```text
submitted -> declined
submitted -> expired
submitted -> superseded
accepted -> cancelled
```

For `acceptance_mode = independent`:

```text
submitted
  -> partially_accepted
  -> accepted
```

`partially_accepted` means some optional or independently executable items have been accepted. It must not mean that a mandatory package was silently split against the buyer’s stated intent.

## 10.4 Deal Chain lifecycle

Use the existing lifecycle, with the following interpretation:

```text
draft
  -> open
  -> invited
  -> quoted
  -> accepted
  -> in_progress
  -> completed
```

Exception paths:

```text
open/invited/quoted -> cancelled
accepted/in_progress -> blocked
blocked -> in_progress
blocked -> replacement_needed
replacement_needed -> in_progress
in_progress -> failed
```

`deal_chains.status = completed` is an aggregate state. It must be calculated only when all required DealNeeds are complete.

## 10.5 Child order lifecycle

Existing order statuses can remain the commercial lifecycle:

```text
pending_acceptance
  -> accepted
  -> in_progress
  -> completed
```

Cancellation and dispute paths:

```text
pending_acceptance -> cancelled
accepted -> cancelled
in_progress -> cancelled
accepted/in_progress/completed -> disputed
```

Readiness must be separate from the main order status:

```text
order_fulfillment_state:
  preparing
  ready_for_collection
  collected
  in_transit
  delivered
  failed
  returned
```

Do not add `ready` to the main order status if it would imply completion.

---

# 11. Readiness and Delivery Semantics

For the Bibingka flow, use two DealNeeds:

```text
DealNeed A: prepare and hand over Bibingka
DealNeed B: transport and deliver Bibingka
```

Dependency:

```text
DealNeed A --ready_for_collection--> DealNeed B
```

The correct progression is:

```text
Merchant order:
  accepted
  -> in_progress
  -> fulfillment_state = ready_for_collection
  -> fulfillment_state = collected
  -> completed at handoff, if merchant's obligation ends at handoff

Courier order:
  pending_acceptance
  -> accepted
  -> in_progress
  -> collected
  -> in_transit
  -> delivered
  -> completed
```

The merchant’s `ready_for_collection` event is not order completion.

A separate readiness event is preferable:

```text
order_readiness_events
-------------------------------
id
order_id
deal_need_id
event_type
  -- prepared, ready_for_collection, collected, delivered
occurred_at
actor_user_id
metadata JSONB
```

This lets the courier react to a readiness fact without causing the entire customer journey to become complete.

---

# 12. Partial Acceptance and Capacity Failure

## 12.1 Capacity expires before order creation

Suppose the buyer selects Tagudin Express, but its capacity reservation expires during checkout.

If no orders have been created:

```text
Result:
  - checkout confirmation fails with HTTP 409
  - no payment is captured
  - no child order is finalized
  - selected courier offer becomes invalid
  - buyer is asked to choose pickup or another courier
```

Example error:

```json
{
  "error": {
    "code": "FULFILLMENT_CAPACITY_LOST",
    "message": "Tagudin Express is no longer available for this delivery window.",
    "checkout_session_id": "checkout-123",
    "replacement_options": [
      {
        "fulfillment_offer_id": "offer-delivery-danny-1",
        "amount_minor": 8000,
        "currency": "PHP"
      },
      {
        "fulfillment_offer_id": "offer-pickup-1",
        "amount_minor": 0,
        "currency": "PHP"
      }
    ]
  }
}
```

## 12.2 Merchant order already exists

If the merchant order has already been accepted but the courier fails before assignment:

```text
Merchant order:
  remains accepted or in_progress

Courier DealNeed:
  replacement_needed

Courier order:
  not created, or failed without affecting merchant order

DealChain:
  blocked or replacement_needed
```

The buyer can select another courier. Serbizyu must create a new courier child order, not mutate the old courier order’s provider or terms.

If the buyer switches to pickup, that should be an explicit fulfillment amendment or a new fulfillment selection. It must not silently rewrite an existing finalized order.

---

# 13. Fault Isolation

## 13.1 Courier breaks down during transit

Recommended result:

```text
Courier order:
  in_progress -> disputed or failed

Courier DealNeed:
  replacement_needed

Merchant order:
  remains completed at handoff or otherwise remains independently settled

DealChain:
  blocked/replacement_needed
```

Do not automatically cancel or claw back the merchant’s completed preparation order.

Create an incident record:

```text
order_incidents
-------------------------------
id
order_id
deal_chain_id
incident_type
  -- vehicle_breakdown, delay, loss, spoilage, wrong_item, etc.
reported_by_user_id
responsibility_status
  -- unresolved, merchant, courier, buyer, force_majeure
description
evidence JSONB
occurred_at
resolved_at
```

Any refund, credit, or compensation should reference the affected order and payment obligation.

## 13.2 Food spoiled before courier collection

If the merchant caused the problem:

```text
Merchant order:
  disputed or failed

Courier assignment:
  cancelled or released

Courier payment:
  should not be charged if collection never occurred
```

## 13.3 Food spoiled during transit

The delivery order and product order can both be involved in the incident, but they remain distinct:

```text
Product order:
  product outcome disputed

Courier order:
  transport incident disputed

Payment adjustments:
  separate per order
```

The Deal Chain may fail as an overall customer outcome, but that does not rewrite historical completion states or erase individual obligations.

---

# 14. Concurrent Modification and Stale Pricing

## 14.1 Use optimistic concurrency

Every mutable aggregate should have a version:

```text
requests.version
quotes.version
quote_packages.version
deal_chains.version
deal_needs.version
listings.version
listing_fulfillment_presets.version
checkout_sessions.version
orders.version
```

Expose the version through:

```http
ETag: "listing-version-42"
```

Require:

```http
If-Match: "listing-version-42"
```

For API payloads, also accept `expected_*_version` where appropriate.

## 14.2 Price changes

There are three distinct cases.

### Before quote submission

The latest listing price applies.

### After quote submission but before acceptance

The submitted quote remains valid until its expiration, unless the provider withdraws it or the terms explicitly permit repricing.

### After order finalization

The order terms snapshot is authoritative. Listing changes must not change the order.

If a listing price changes during checkout, return `409 CHECKOUT_STALE`:

```json
{
  "error": {
    "code": "CHECKOUT_STALE",
    "message": "The Bibingka price changed before checkout confirmation.",
    "changes": [
      {
        "checkout_line_id": "checkout-line-1",
        "old_amount_minor": 18000,
        "new_amount_minor": 20000,
        "currency": "PHP"
      }
    ],
    "requires_repricing": true
  }
}
```

The frontend must refresh the preview and ask the buyer to confirm again.

## 14.3 Capacity changes

Use a short reservation and a database transaction:

1. Lock or atomically reserve provider capacity.
2. Validate listing and partner versions.
3. Validate offer expiration.
4. Create orders and terms snapshots.
5. Consume the reservation.
6. Publish outbox events.

Do not rely only on an application-level “available” boolean.

## 14.4 PostgreSQL transaction strategy

Checkout confirmation should use:

- `READ COMMITTED` with targeted `SELECT ... FOR UPDATE`, or
- `SERIALIZABLE` for especially sensitive capacity operations.

Use an outbox table so order and Deal Chain events are published only after the transaction commits:

```text
outbox_events
-------------------------------
id
aggregate_type
aggregate_id
event_type
payload JSONB
occurred_at
published_at
```

Use idempotency keys for:

- quote submission
- package acceptance
- checkout creation
- checkout confirmation
- payment capture requests
- replacement order creation

---

# 15. Existing `quotes` Constraint

The current unique constraint is:

```text
UNIQUE (request_id, quote_version)
```

That is potentially problematic if `quote_version` is intended to be a provider-local revision number.

A better design is either:

```text
UNIQUE (request_id, provider_user_id, quote_version)
```

or introduce a quote series:

```text
quote_series_id
revision_no
UNIQUE (quote_series_id, revision_no)
```

Recommended interpretation:

- A new commercial offer from a provider is a new `quotes.id`.
- A revision of that provider’s offer increments `revision_no`.
- A superseded quote remains stored.
- A package copies the exact quote revision and terms it used.

Do not update the amount of an accepted quote in place.

---

# 16. Frontend and Inertia React Integration

## 16.1 Request detail page

The request endpoint should return normalized data:

```json
{
  "request": {},
  "standalone_quotes": [],
  "quote_packages": [],
  "deal_chain_drafts": [],
  "available_actions": {
    "can_submit_quote": false,
    "can_accept_quote": true,
    "can_accept_package": true
  },
  "versions": {
    "request": 7
  }
}
```

The UI should distinguish:

- Labor-only quote
- Product-plus-service package
- Optional components
- Exclusions
- Provider identity for every line
- Dependencies
- Quote expiration
- Provider confirmation status

Do not display only “Total ₱400” without showing that ₱160 belongs to the hardware provider and ₱240 belongs to the electrician.

## 16.2 Quote comparison

Use a line-oriented component:

```text
Proposal: Electrician A
  Repair labor                         ₱300
  Replacement part                     Excluded

Proposal: Turnkey package
  Breaker — Tagudin Hardware           ₱160
  Diagnosis and installation           ₱240
  Display total                        ₱400
```

The UI should show:

```text
Payment obligations: 2
Providers: 2
```

## 16.3 Checkout

The frontend should follow:

```text
Cart
  -> POST checkout session
  -> Display server-generated offers
  -> Buyer selects fulfillment
  -> POST confirm with offer IDs and versions
  -> Render returned child orders
```

The frontend must not:

- Calculate authoritative totals.
- Create DealNeeds.
- Create child orders.
- Treat a default courier as automatically selected.
- Replace a courier provider ID directly.
- Mark an order complete based on readiness.
- Reuse an expired offer token.

## 16.4 Status presentation

Show aggregate and child statuses separately:

```text
Your order
  Overall delivery: In progress

Bibingka preparation
  Ready for collection

Courier
  Assigned
  In transit
```

Do not display:

```text
Food order complete
```

merely because the food is ready at the stall.

## 16.5 Real-time events

Publish events through Laravel broadcasting or a polling fallback:

```text
QuoteSubmitted
QuotePackageUpdated
ProviderConfirmationReceived
DealChainStatusChanged
DealNeedReadyForCollection
OrderAccepted
OrderReadinessChanged
CourierAssigned
OrderDisputed
ReplacementNeeded
CheckoutInvalidated
```

Inertia pages can refresh partial props on these events, while order detail pages can use a dedicated event stream or polling endpoint.

---

# Final Recommendation

Implement the following additions:

1. **Normalized `quote_line_items`**
2. **`quote_packages` and `quote_package_items`**
3. **Draft DealChain generation from accepted or nearly accepted packages**
4. **Explicit package dependencies**
5. **Listing fulfillment presets**
6. **Preset partner options**
7. **Checkout-time fulfillment offers and capacity reservations**
8. **One payment obligation per child order**
9. **Immutable terms snapshots**
10. **Separate readiness events from order completion**
11. **Incident and replacement-order modeling**
12. **Optimistic versioning and idempotent checkout commands**

The central invariant should be:

> A Quote Package may coordinate multiple provider offers, and a Deal Chain may coordinate multiple DealNeeds, but every provider obligation, payment obligation, and finalized commercial contract remains attached to its own child order.

That preserves the Document 17 rules while still supporting turnkey services, buyer-selected fulfillment, courier substitution, partial failure, and concurrent marketplace changes.