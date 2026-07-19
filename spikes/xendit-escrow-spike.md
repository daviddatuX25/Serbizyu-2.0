# Xendit Marketplace Escrow Flow — Spike Report

**Author:** Hermes Agent  
**Date:** 2026-07-19  
**Context:** Serbizyu build-plan risk register — PH local services marketplace, 3-day payment hold requirement  
**Source docs:** docs.xendit.co (xenPlatform docs, API ref), xendit.co/en-ph/pricing

---

## 1. Executive Summary

Xendit's **xenPlatform** product provides the infrastructure for marketplace escrow-style payment flows. It supports sub-account management, split payments (fee deduction), balance transfers, and disbursements/payouts to sub-merchants. **No separate "escrow" product exists** — the 3-day hold is implemented as a **delayed payout** where the platform holds funds in the sub-account balance before disbursing.

**Go/No-Go: GO — with conditions** (see §7).

---

## 2. Confirmed Flow Diagram

### Serbizyu Escrow Payment Flow (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SERBIZYU ESCROW FLOW                        │
│                (xenPlatform — Managed Sub-Accounts)                 │
└─────────────────────────────────────────────────────────────────────┘

  1. ONBOARDING
     ┌──────────────┐     ┌──────────────────┐
     │ Serbizyu     │     │ Service Provider │
     │ (Master Acct)│────▶│ (Sub-Account)     │
     │              │     │ - KYC submitted   │
     │              │     │ - for-user-id=xxx │
     └──────────────┘     └──────────────────┘

  2. CLIENT PAYS (Day 0 — funds enter hold)
     ┌────────┐     POST /v2/invoices?for-user-id={sub_acct}     ┌──────────────┐
     │Client  │─────────────────────────────────────────────────▶│   Xendit     │
     │        │◀─────────────────────────────────────────────────│   Invoice    │
     └────────┘    Returns invoice URL + status=PENDING          │   (PAYMENT   │
          │                                                      │   LINK)      │
          │  Client pays via GCash, Card, OTC, etc.              │              │
          ├──────────────────────────────────────────────────────▶│              │
          │◀───────────────────payment.succeeded──────────────────│              │
          │                                                      └──────┬───────┘
          │                                                             │
          │                                                    Funds settle to
          │                                                    sub-account balance
          │                                                    (after fee deduction)
          │                                                             │
          ▼                                                             ▼
   ┌──────────────┐                                           ┌──────────────────┐
   │ 3-Day Hold   │                                           │  Sub-Account      │
   │ (Service not │                                           │  Balance: +₱950   │
   │  completed)  │                                           │  (after fees)     │
   └──────────────┘                                           └──────────────────┘

  3. SERVICE COMPLETED (Day 0–3)
     ┌──────────────┐      Client confirms job done              ┌──────────────┐
     │  Serbizyu    │◀───────────────────────────────────────────│   Client     │
     │  (Platform)  │                                            │              │
     └──────┬───────┘                                            └──────────────┘
            │
            │  Platform initiates disbursement
            │  POST /v3/payouts?for-user-id={sub_acct}
            ▼
   ┌────────────────┐
   │  Xendit Payout  │────▶ v3_payout.succeeded ────▶ Funds in provider's bank/wallet
   │  (Disburse from  │
   │  sub-account     │
   │  balance to      │
   │  provider bank)  │
   └────────────────┘

  ALTERNATIVE: REFUND / DISPUTE
     Client disputes → Serbizyu initiates refund
     POST /refunds (via Invoice) → refund.succeeded webhook
     Funds return to client's payment method
```

### Split Rule Flow (Platform Commission)

```
  Payment received in sub-account:       ₱1,000
  Split Rule: 10% to Platform (Serbizyu)  -₱100
  Transaction Fee (e.g., 3.5% + ₱15):    -₱35
  VAT on fee (12%):                       -₱4.20
                                        ─────────
  Sub-account net balance:               ₱860.80
```

---

## 3. Sub-Account Types

| Aspect | Managed Sub-Accounts | Owned Sub-Accounts |
|--------|---------------------|-------------------|
| **KYC/Verification** | Platform submits docs on behalf | Invite sub-merchant to self-verify |
| **Dashboard Access** | No login access | Sub-merchant can log in |
| **Transaction Fees** | Deducted from sub-account balance | Deducted from sub-account balance |
| **Billing Statement** | Goes to sub-account directly | Goes to master account |
| **API Key** | Cannot create — master calls with `for-user-id` | Can create own API keys |
| **Recommendation** | ✅ **Best for Serbizyu** — full platform control | Better for self-service models |

---

## 4. API Endpoints Used

### 4.1 Create Invoice (Payment Link) for Sub-Account
```
POST /v2/invoices
Headers:
  for-user-id: {sub_account_business_id}
  Content-Type: application/json

Body:
{
  "external_id": "serbizyu-order-001",
  "amount": 100000,          // PHP 1,000.00 in centavos
  "payer_email": "client@example.com",
  "description": "Plumbing service - Juan's Repairs",
  "items": [
    {
      "name": "Plumbing repair",
      "quantity": 1,
      "price": 100000,
      "category": "Home Services"
    }
  ],
  "success_redirect_url": "https://serbizyu.ph/order/success",
  "failure_redirect_url": "https://serbizyu.ph/order/failed"
}
```

### 4.2 Create Split Rule (Platform Commission)
```
POST /split_rules
Body:
{
  "name": "Serbizyu Platform Fee 10%",
  "description": "10% platform commission on marketplace transactions",
  "routes": [
    {
      "percent_amount": 10,
      "currency": "PHP",
      "destination_account_id": "{serbizyu_master_business_id}",
      "reference_id": "platform-commission"
    }
  ]
}
```
Then use header `with-split-rule: {split_rule_id}` when creating the invoice.

### 4.3 Create Payout (Disbursement to Provider)
```
POST /v3/payouts
Headers:
  api-version: 2025-09-01
  for-user-id: {sub_account_business_id}
  idempotency-key: {unique_key}

Body:
{
  "reference_id": "payout-order-001-provider",
  "recipient": {
    "type": "INDIVIDUAL",
    "given_name": "Juan",
    "surname": "Dela Cruz",
    "relationship": "CUSTOMER",
    "details": {
      "personal_mobile_number": "+639123456789"
    },
    "address": {
      "country": "PH",
      "city": "Manila",
      "province_state": "Metro Manila",
      "postal_code": "1000",
      "street_line_1": "123 Rizal Ave"
    },
    "account_details": {
      "currency": "PHP",
      "account_country": "PH",
      "account_holder_name": "Juan Dela Cruz",
      "account_number": "1234567890",
      "routing_type_1": "WALLET",
      "routing_value_1": "PH_GCASH"
    }
  },
  "payout_details": {
    "source_currency": "PHP",
    "source_amount": 86080,
    "destination_currency": "PHP"
  },
  "source_of_fund": "BUSINESS_REVENUE",
  "purpose_code": "SALARY",
  "description": "Payment for plumbing service order-001"
}
```

### 4.4 Transfer Between Accounts
```
POST /transfers
Body:
{
  "reference": "serbizyu-fee-transfer-001",
  "amount": 10000,
  "source_user_id": "{sub_account_business_id}",
  "destination_user_id": "{master_business_id}"
}
```
Note: Split rules handle this automatically — only needed for manual/ad-hoc transfers.

---

## 5. Webhook Event List

### Payment Webhooks (Invoice / Payments API)

| Webhook Event | When Fired | Direction |
|--------------|------------|-----------|
| `payment_request.expiry` | Payment request expired | ↘ Client |
| `payment_request.completed` | Direct Debit/E-Wallet completed | ↘ Client |
| `payment.capture` | Payment successfully collected | ↗ Platform |
| `payment.authorization` | Payment reserved (auth only) | ↗ Platform |
| `payment.failure` | Payment failed | ↗ Platform |
| `payment.expiry` | Successful auth expired | ↗ Platform |
| `refund.succeeded` | Refund successful | ↗ Platform |
| `refund.failed` | Refund failed | ↗ Platform |

### Invoice-Specific Webhooks (Legacy)

| Webhook Type | Event | When Fired |
|-------------|-------|------------|
| `invoice` | Invoice paid | Status → PAID |
| `invoice` | Invoice expired | Status → EXPIRED |

### Payment Session Webhooks (New API)

| Webhook Event | Description |
|--------------|-------------|
| `payment_succeeded` | Payment confirmed/received from partner channel |
| `payment_awaiting_capture` | Manual capture needed |
| `payment_pending` | Payment processing |
| `payment_failed` | Pending payment failed |
| `capture_succeeded` | Manual capture succeeded |
| `capture_failed` | Manual capture failed |

### Split Payment Webhooks

| Webhook Event | When Fired | Payload Fields |
|--------------|------------|----------------|
| `split.payment` (status=COMPLETED) | Split fee successfully transferred | id, split_rule_id, payment_id, source/destination accounts, amount, currency |
| `split.payment` (status=FAILED) | Split fee transfer failed | Same + failure_code (e.g., INSUFFICIENT_BALANCE) |

### Payout Webhooks (Disbursement)

| Webhook Event | When Fired |
|--------------|------------|
| `v3_payout.succeeded` | Payout completed — funds credited to beneficiary |
| `v3_payout.failed` | Payout rejected by partner bank |
| `v3_payout.reversed` | Succeeded payout later reversed/bounced |
| `v3_payout.rejected` | Payout rejected due to compliance |
| `v3_payout.pending_compliance` | Payout under compliance review |

### Disbursement Webhooks (Legacy)

| Webhook Type | Event | Region |
|-------------|-------|--------|
| `ph_disbursement` | Completed/Failed disbursement | Philippines only |
| `disbursement` | Completed/Failed disbursement | Indonesia only |

### Account Webhooks

| Webhook Event | When Fired |
|--------------|------------|
| `account.verification` | Sub-account verification status change |
| `account.suspension` | Account suspended |
| `owned_account.status` | Owned sub-account status change |
| `managed_account.status` | Managed sub-account status change |

---

## 6. Fee Observations (Philippines)

### 6.1 Payment Acceptance Fees (PHP)

| Payment Method | Category | Market | Method Fee | Xendit Processing Fee |
|---------------|----------|--------|------------|----------------------|
| **GCash** | E-Wallet | PH | ~2.5% | PHP 11.00 |
| **GrabPay** | E-Wallet | PH | ~2.5% | PHP 11.00 |
| **Maya** | E-Wallet | PH | ~2.5% | PHP 11.00 |
| **7-Eleven** | OTC | PH | **1.50%** (min ₱15) | **PHP 11.00** |
| **Cebuana** | OTC | PH | ~1.5% | PHP 11.00 |
| **ECPay** | OTC | PH | ~1.5% | PHP 11.00 |
| **LBC** | OTC | PH | ~1.5% | PHP 11.00 |
| **Palawan Express** | OTC | PH | ~1.5% | PHP 11.00 |
| **SM Bills Payment** | OTC | PH | ~1.5% | PHP 11.00 |
| **Robinsons Bills** | OTC | PH | ~1.5% | PHP 11.00 |
| **BPI Direct Debit** | Direct Debit | PH | Variable | PHP 11.00 |
| **RCBC Direct Debit** | Direct Debit | PH | Variable | PHP 11.00 |
| **UnionBank Direct Debit** | Direct Debit | PH | Variable | PHP 11.00 |
| **BillEase** | BNPL | PH | **1.50%** | **PHP 11.00** |
| **QRPh** | QR Code | PH | ~2.0% | PHP 11.00 |
| **Cards (Visa/MC)** | Cards | PH | ~2.0-3.0% | PHP 11.00 |
| **ShopeePay** | E-Wallet | PH | ~2.5% | PHP 11.00 |

> **Note:** Fees are based on public pricing at xendit.co/en-ph/pricing as of 2026-07-19. Actual negotiated rates may differ. The Processing Fee is per successful transaction.

### 6.2 xenPlatform-Specific Fees

| Fee Type | Amount | Billing |
|----------|--------|---------|
| **Sub-account activity fee** | Per monthly active sub-account with ≥1 chargeable transaction | Indirect (monthly invoice to platform) |
| **In-house transaction fee** | **~0.5%** of the transferred/split amount (not the full transaction) | Indirect (monthly invoice to platform) |

### 6.3 Payout Fees (Disbursement)

| Destination | Fee Structure |
|-------------|---------------|
| **GCash/Maya wallet** | PHP 11.00–15.00 per payout (est.) |
| **Bank account (InstaPay)** | PHP 15.00–25.00 per payout (est.) |
| **Bank account (PESONet)** | PHP 10.00–20.00 per payout (est.) |

### 6.4 Sample Fee Calculation (₱1,000 transaction)

| Line Item | Amount |
|-----------|--------|
| Client Payment | ₱1,000.00 |
| Payment Method Fee (GCash ~2.5%) | -₱25.00 |
| Xendit Processing Fee | -₱11.00 |
| VAT on Fees (12%) | -₱4.32 |
| **Net to Sub-Account** | **₱959.68** |
| Split Rule (10% Platform Commission) | -₱95.97 |
| In-House Transaction Fee (0.5% of ₱95.97) | -₱0.48 |
| **Net to Provider (after hold release)** | **₱863.71** |
| **Platform Commission (after fees)** | **₱95.49** |

### 6.5 Key Observations

1. **No explicit escrow fee** — the hold mechanism is free (funds sit in the sub-account balance)
2. **In-house transaction fee** (0.5%) is only charged on the split amount, not the full transaction
3. **Payouts** to providers add another PHP 11–25 per disbursement
4. **Total cost estimate** for a ₱1,000 transaction: ~4.5% + ₱30 = ~₱75 (7.5%)
5. **VAT** (12% in PH) is applied on top of all fees
6. **Refunds** typically cost another transaction fee unless negotiated

---

## 7. Go / No-Go Recommendation

### ✅ GO — with conditions

**Rationale:** Xendit xenPlatform provides all the building blocks needed for a marketplace escrow flow:
- Sub-account per provider → isolated balance = natural escrow
- Split rules → automated platform commission deduction
- Payouts API → controlled disbursement after hold period
- Webhooks → real-time status tracking
- Test mode → full sandbox for integration testing

### Conditions for Go

| # | Condition | Risk if Not Met | Mitigation |
|---|-----------|----------------|------------|
| 1 | **Confirm negotiated pricing** with Xendit sales before building | Published rates are ~7.5% on ₱1k — may not be viable for low-value services | Get volume-based pricing; ask about marketplace-specific rate cards |
| 2 | **Verify 3-day hold is contractually permitted** | Some payment methods require instant settlement | Use "delayed payout" model — funds settle to sub-account, you control when to disburse |
| 3 | **Implement refund/dispute handling early** | Split fees are NOT automatically reversed on refund | Build reconciliation logic: manually reverse split fees or eat the loss |
| 4 | **Test compliance with PH regulations** | BSP may have marketplace payment rules | Ensure sub-account KYC is solid; get legal review |
| 5 | **Budget for xenPlatform monthly fees** | Sub-account activity fee adds up at scale | Factor into unit economics; confirm caps with Xendit |

### Red Flags / Watch Items

- **Legacy Invoice API (v2/invoices)** is being deprecated in favor of Payment Sessions — use Payment Sessions for new builds
- **100% split rule fails** — you must leave room for transaction fees in the split calculation
- **Cross-border transfers** are not supported for Indonesia-incorporated merchants (not an issue for PH-only)
- **Split fees not auto-refunded** on payment reversal — need manual reconciliation
- **Payout minimum amounts** may apply per region

---

## 8. Next Steps

1. [ ] Contact Xendit PH sales for xenPlatform onboarding and negotiated pricing
2. [ ] Create a Xendit test account and activate xenPlatform
3. [ ] Create test sub-account(s) in test mode
4. [ ] Run a test invoice flow (create invoice → simulate payment → verify funds in sub-account)
5. [ ] Create a split rule and verify commission deduction
6. [ ] Test payout disbursement to a test GCash/bank account
7. [ ] Build webhook receiver for payment, split, and payout events
8. [ ] Document the complete integration API reference for dev team

---

## 9. References

| Resource | URL |
|----------|-----|
| xenPlatform Overview | https://docs.xendit.co/docs/xenplatform-overview.md |
| Sub-Accounts | https://docs.xendit.co/docs/sub-accounts.md |
| Accept Payments for Sub-Accounts | https://docs.xendit.co/docs/accepting-payments-for-sub-accounts.md |
| Split Payments | https://docs.xendit.co/docs/split-payments.md |
| Transfer Balances | https://docs.xendit.co/docs/transfer-balances.md |
| Payouts for Sub-Accounts | https://docs.xendit.co/docs/payouts-for-sub-accounts.md |
| xenPlatform Fees | https://docs.xendit.co/docs/xenplatform-fees.md |
| Testing xenPlatform Features | https://docs.xendit.co/docs/testing-xenplatform-features.md |
| Create Split Rule (API) | https://docs.xendit.co/apidocs/create-split-rule.md |
| Create Payout (API) | https://docs.xendit.co/apidocs/create-payout-v3.md |
| Payout Webhook | https://docs.xendit.co/apidocs/payout-v3-webhook.md |
| Payments API Webhooks | https://docs.xendit.co/docs/payments-api-webhooks.md |
| Split Payment Webhook | https://docs.xendit.co/apidocs/split-payment-status-notification-webhook.md |
| Set Webhook URL | https://docs.xendit.co/apidocs/set-webhook-url.md |
| PH Pricing | https://www.xendit.co/en-ph/pricing/ |
| Transaction Fees | https://docs.xendit.co/docs/transaction-fees.md |
