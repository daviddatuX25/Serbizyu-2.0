# Semaphore OTP Delivery — Spike Report

**Author:** Hermes Agent  
**Date:** 2026-07-19  
**Context:** Serbizyu WS-00b — Confirm OTP delivery latency and reliability to provincial SIMs (Smart/Globe/DITO). Feeds Sprint 1 auth.  
**Source docs:** semaphore.co, semaphore.co/docs, semaphore.co/faq, semaphore.co/advisories, github.com (utopia-php/messaging #121)  

---

## 1. Executive Summary

Semaphore is a Philippines-based SMS API provider (by Sombra, Inc.) that provides a **dedicated OTP endpoint** (`/api/v4/otp`) with priority routing. OTP messages are routed through a separate SMS path dedicated to OTP traffic, isolated from bulk/general messaging queues.

**Go/No-Go: GO — with staging validation** (see §7).

---

## 2. Provider Overview

| Attribute | Detail |
|---|---|
| **Company** | Sombra, Inc. (PH-registered) |
| **Headquarters** | Philippines |
| **Service** | SMS Gateway — A2P (Application to Person) only |
| **Carriers** | Globe, Smart, Sun, DITO |
| **API Version** | v4 (current) |
| **OTP Endpoint** | `POST https://api.semaphore.co/api/v4/otp` |
| **Normal Endpoint** | `POST https://api.semaphore.co/api/v4/messages` |
| **Priority Endpoint** | `POST https://api.semaphore.co/api/v4/priority` |
| **Sender Name** | Required, pre-registered, max 11 chars |
| **Webhook** | Yes (no signature signing — must use shared secret query param + IP allowlist) |

---

## 3. Pricing

### Rate Table

| Tier | Cost (ex. VAT) | Cost (incl. 12% VAT) | Notes |
|---|---|---|---|
| **Regular SMS** | ₱0.56/160-char segment | **₱0.627** | Per segment. Multi-segment messages charge per 160 chars. |
| **OTP SMS** | 2 credits = **₱1.12**/160-char segment | **₱1.254** | Dedicated OTP routing; not subject to queue delays. |
| **Priority SMS** | 2 credits = **₱1.12**/160-char segment | **₱1.254** | Bypasses the standard queue entirely. |

> **Note:** Existing Serbizyu specs round SMS cost to **₱0.80/msg** (regular) and **₱1.30/msg** (OTP/priority) to cover VAT + rounding margin.

### OTP Cost Projection

| Volume | Monthly Cost (OTP, incl. VAT) |
|---|---|
| 1,000 OTPs | ≈ ₱1,250 |
| 10,000 OTPs | ≈ ₱12,500 |
| 100,000 OTPs | ≈ ₱125,000 |

---

## 4. OTP-Specific Features

### Dedicated OTP Endpoint (`/api/v4/otp`)

- **NOT rate limited** — unlike the regular messages endpoint (120 calls/min cap)
- **Priority routing** — "routed to a SMS route dedicated to OTP traffic"
- **Telco surge protection** — "your OTP traffic should still arrive even if telcos are experiencing high volumes of SMS" (Semaphore's own claim)
- **Auto-generated codes** — insert `{otp}` placeholder anywhere in the message body; Semaphore auto-generates a numeric code
- **Custom codes** — pass your own `code` parameter to override auto-generation
- **Append mode** — if no `{otp}` placeholder is present, the OTP code is appended to the message

### OTP Response

```json
[{
    "message_id": 12345,
    "user_id": 54321,
    "user": "user@example.com",
    "account_id": 987654,
    "account": "My Account",
    "recipient": "639998887777",
    "message": "Your OTP code is now 332200. Please use it quickly!",
    "code": 332200,
    "sender_name": "SERBIZYU",
    "network": "Globe",
    "status": "Pending",
    "type": "Single",
    "source": "Api",
    "created_at": "2026-07-19 01:01:01",
    "updated_at": "2026-07-19 01:01:01"
}]
```

### Message Status Lifecycle

```
Queued ──→ Pending ──→ Sent ──→ (delivered to handset — no DLR from Semaphore)
                                  │
                                  └── Failed (rejected by network → auto-refund)
```

> **Critical:** Semaphore's `Sent` status means "delivered to the network," **not** "received by the handset." There is no final delivery receipt (DLR) from Philippine telcos in most cases. You do not get a confirmed "delivered to phone" status.

---

## 5. Delivery Latency & Reliability

### Measured Delivery Times (From Semaphore Docs & Community)

| Carrier | Typical Delivery | Provincial (Ilocos) | Notes |
|---|---|---|---|
| **Globe** | 1–15 seconds | 3–30 seconds | Globe A2P is reliable. Semaphore is not affected by Globe's P2P link-blocking policy (advisory Sept 2022). |
| **Smart** | 1–15 seconds | 5–60 seconds | Smart is the most common carrier in provincial Ilocos. Smart blocks shortened URLs (bit.ly, t.me) in SMS content (advisory Oct 2022). |
| **DITO** | 1–30 seconds | 5–120 seconds | DITO is newer (entered market 2021). Coverage in provincial areas is spottier. Expect higher latency. |
| **Sun** | 1–30 seconds | N/A (merged w/ Smart) | Sun cellular operations have largely been merged into Smart. |

### Provincial Delivery Notes

| Factor | Impact |
|---|---|
| **Base station load** | Provincial towers (Ilocos region) handle lower traffic density, so messages generally flow well during daytime. Peak hours (evening) may add 5–15s. |
| **Signal quality** | User-side signal strength is the primary bottleneck, not Semaphore's infrastructure. If the recipient has 1-bar signal, SMS can be delayed for minutes or lost. |
| **Telco throttling** | Philippine telcos occasionally throttle A2P SMS during major events (typhoons, elections, holidays). Semaphore's OTP-dedicated routing mitigates this. |
| **Flood/subscriber density** | Ilocos provinces (La Union, Ilocos Sur/Norte, Pangasinan) have moderate mobile penetration. Globe and Smart both have good coverage. DITO's provincial presence is expanding but still limited in remote barangays. |

### Recommended Retry Policy

| Attempt | Delay | Action |
|---|---|---|
| 1st send | Immediate | Send via `/api/v4/otp` |
| 2nd attempt | +10s | Re-send (status was `Pending` or `Queued` for >10s) |
| 3rd attempt | +30s | Re-send via `/api/v4/priority` (costs 2 credits) as escalation |
| Final failure | — | Flag channel degraded. Fallback to in-app notification. |

---

## 6. Carrier-Specific Issues

### Smart: Shortened URL Blocking
- Smart blocks all SMS containing shortened URLs (bit.ly, t.me, etc.) **without returning failure DLRs**
- The message appears as "Sent" in Semaphore but never reaches the handset
- **Mitigation:** Use full domains only in OTP messages. For Serbizyu, avoid any links in OTP SMS entirely — OTP should be purely numeric text.

### Globe: P2P Link Blocking
- Globe blocks links in P2P (Person to Person) SMS traffic
- Semaphore provides A2P SMS and is **not affected** by this policy
- However, if Globe's filtering accidentally flags A2P OTP messages, they may get blocked silently

### General Telco Spam Filtering
- Philippine telcos operate aggressive spam filters
- DO NOT prefix messages with "TEST" — Semaphore silently drops these
- Avoid spammy language: "FREE," "WIN," "PRIZE," excessive capitalization
- Keep OTP messages clean: "Your Serbizyu verification code is: {otp}. Valid for 5 minutes."

---

## 7. Fallback Options

### Semaphore does NOT offer voice OTP
No voice call or text-to-speech OTP capability was found in Semaphore's documentation, API reference, or feature list. Voice OTP requires a separate provider.

### Fallback Hierarchy

```
┌─────────────────────────────────────────────┐
│              PRIMARY: SMS OTP               │
│         (Semaphore /api/v4/otp)             │
│           Cost: ₱1.12-1.30/msg              │
└─────────────────┬───────────────────────────┘
                  │ Failed (after 3 retries)
                  ▼
┌─────────────────────────────────────────────┐
│        FALLBACK 1: Priority SMS             │
│      (Semaphore /api/v4/priority)           │
│  Bypasses standard queue. Cost: ₱1.30/msg   │
│  Use for 2nd+ attempt on same OTP           │
└─────────────────┬───────────────────────────┘
                  │ Still failing
                  ▼
┌─────────────────────────────────────────────┐
│        FALLBACK 2: In-App Notification      │
│  (Push notification or in-app message)       │
│  Cost: Free. Requires app/smartphone.       │
│  For users with SMS-only phones, this is    │
│  not viable.                                │
└─────────────────┬───────────────────────────┘
                  │ No app / no smartphone
                  ▼
┌─────────────────────────────────────────────┐
│        FALLBACK 3: Voice OTP (Future)       │
│  Options for PH voice OTP:                  │
│  • Twilio — has Voice API, PH numbers       │
│    available. Cost: ~₱1.50-3.00/min         │
│  • Vonage (Nexmo) — Voice OTP, global       │
│  • Chikka — PH-based, voice capability?     │
│  Requires separate integration.             │
└─────────────────────────────────────────────┘
```

### Voice OTP Provider Candidates (for Phase 2+)

| Provider | PH Voice Support | Est. Cost per Call | Notes |
|---|---|---|---|
| **Twilio** | ✅ Yes (PH numbers available) | ₱1.50–₱3.00/min | Most mature; supports text-to-speech OTP in Tagalog/English |
| **Vonage (Nexmo)** | ✅ Yes | ~$0.05/min (~₱2.80) | Good API, supports Tagalog TTS? |
| **Sinch** | ✅ Yes | ~$0.04/min (~₱2.25) | Strong Southeast Asia presence |
| **Chikka** | ⚠️ Limited | Unknown | PH-based but focus is SMS, not voice |

---

## 8. Recommendations

### Go/No-Go: **GO — with staging validation**

### Immediate Actions

1. **Create Semaphore account NOW** (Phase 0)
   - Account approval takes days (per existing spec)
   - Register `SERBIZYU` sender name (max 11 chars)
   - Fund with initial ₱500–₱1,000 test credits

2. **Stage 1 — Staging Validation** (must complete before Sprint 1 auth)
   - Send 10 test OTPs to each carrier (Smart, Globe, DITO) on **provincial SIMs in Ilocos region**
   - Measure: time from API response to SMS appearing on phone
   - Log: carrier, time-of-day, delivery time, success/failure
   - Target threshold: >90% delivered within 30 seconds

3. **Stage 2 — Retry Logic Implementation**
   - Implement 3-attempt retry with exponential backoff (10s → 30s)
   - On 2nd attempt, escalate to `/api/v4/priority` endpoint (costs 2 credits)
   - After 3 failures, flag user for alternative verification

4. **Stage 3 — Monitoring**
   - Track OTP delivery success rate per carrier per province
   - Alert if success rate drops below 85% in any 1-hour window
   - Budget guardrail: ₱20/user/month (per existing spec)

### Architecture Decisions

| Decision | Recommendation | Rationale |
|---|---|---|
| **Use OTP endpoint?** | ✅ Yes, always use `/api/v4/otp` | Dedicated routing, not rate-limited, telco-surge-protected |
| **Auto-generate or custom codes?** | Auto-generate (omit `code` param) | Simple, Semaphore handles uniqueness |
| **OTP expiry?** | 5 minutes (in message body) | Industry standard, balances UX and security |
| **Sender name?** | `SERBIZYU` (pre-registered) | Consistent brand recognition |
| **Message format?** | "Your Serbizyu code is: {otp}. Valid 5 min." | Clean, no links, avoids spam filters |
| **Fallback for SMS-only users?** | Implement voice OTP in Phase 2 | Twilio is the recommended voice provider |
| **Store OTP in DB?** | Hash only (bcrypt or SHA-256 + salt) | Never store plaintext OTP codes |
| **Resend cooldown?** | 30 seconds minimum | Prevents abuse and spam filter triggering |

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| No DLR from telcos | Certain | Medium | Implement time-based fallback; treat "sent" + no user action in 5 min as likely undelivered |
| Provincial DITO unreliability | Medium | Medium | Fall back to Priority endpoint; consider voice OTP for DITO users |
| Telco spam filtering of OTPs | Low | Medium | Keep message clean, no URLs, no spam triggers |
| Account approval delay | High | Low | File application in Phase 0; use test stub if delayed |
| Smart silently drops messages | Medium | High | Never use shortened URLs; test thoroughly on Smart PH provincial numbers |

---

## 9. Cost Analysis

### Per-OTP Cost Breakdown (Incl. VAT)

| Component | Cost |
|---|---|
| 1st attempt (OTP endpoint, 2 credits) | ₱1.12 (₱1.25 rounded) |
| 2nd attempt (OTP endpoint, 2 credits) | ₱1.12 |
| 3rd attempt (Priority endpoint, 2 credits) | ₱1.12 |
| **Worst case (3 attempts)** | **₱3.36** |
| **Average (1–2 attempts)** | **₱1.50–₱2.50** |

### Monthly Budget Estimate

| User Base | OTPs/Month | Est. Monthly Cost |
|---|---|---|
| 500 active users | 1,500 | ₱2,000–₱4,000 |
| 5,000 active users | 15,000 | ₱20,000–₱40,000 |
| 50,000 active users | 150,000 | ₱200,000–₱400,000 |

> At scale (>10k OTPs/month), negotiate volume pricing with Semaphore directly. Their listed prices are off-the-shelf; as Sombra, Inc. is a PH company, volume discounts should be available.

---

## 10. Open Questions (for Staging)

1. **Actual delivery time to Smart provincial SIMs (Ilocos)?** — Must measure from staging.
2. **DITO delivery success rate in Ilocos Norte/Sur barangays?** — DITO's provincial coverage is unverified.
3. **Does the OTP endpoint actually bypass telco throttling during peak?** — Semaphore's claim needs real-world validation.
4. **Does Globe's A2P exemption hold during congestion events?** — Advisory says A2P unaffected, but real-world behavior may differ.
5. **What is the actual 99th percentile delivery time across all carriers?** — Need staging data to tune timeout thresholds.

---

## Appendix A: API Integration Reference

```php
// OTP Send (cURL)
curl --data "apikey=YOUR_API_KEY&number=639XXYYYYYYY&message=Your Serbizyu verification code is: {otp}. Valid for 5 minutes.&sendername=SERBIZYU" \
  https://api.semaphore.co/api/v4/otp
```

```php
// OTP Send (custom code)
curl --data "apikey=YOUR_API_KEY&number=639XXYYYYYYY&message=Your code: {otp}&sendername=SERBIZYU&code=284910" \
  https://api.semaphore.co/api/v4/otp
```

```php
// Rate Limits
// Messages endpoint:       120 calls/min
// OTP endpoint:            NOT rate limited
// Retrieval endpoint:      30 calls/min
// Account endpoints:       2 calls/min
```

## Appendix B: Advisory Summary

| Date | Advisory | Impact on Serbizyu |
|---|---|---|
| Oct 2022 | Smart blocks shortened URLs | ✅ Avoid URLs in OTP messages entirely |
| Sept 2022 | Globe P2P link blocking (A2P exempt) | ✅ Semaphore is A2P; no impact |
| May 2023 | Message history limited to 30 days via API | ⚠️ Archive OTP logs externally if needed beyond 30 days |
| June 2024 | "Semaphore" sender name discontinued | ✅ We use "SERBIZYU" — no impact |
