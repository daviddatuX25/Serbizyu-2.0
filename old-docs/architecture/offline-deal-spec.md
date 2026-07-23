# Serbizyu — Offline/Hybrid Deal Architecture
## Quick Deal + Deal-Chaining Without Smartphones, Connectivity, or Digital Payments

*Extends the Deal System Specification (deal-system-spec.md) to handle provincial PH realities where one or both parties have no smartphone, no internet, or use cash in dead zones.*

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [The Core Insight: Degradation Layers](#2-the-core-insight-degradation-layers)
3. [Scenario A: Buyer Has Smartphone, Servicer Does Not](#3-scenario-a-buyer-has-smartphone-servicer-does-not)
4. [Scenario B: Servicer Has Smartphone, Buyer Does Not](#4-scenario-b-servicer-has-smartphone-buyer-does-not)
5. [Scenario C: Both Offline / No Connectivity](#5-scenario-c-both-offline--no-connectivity)
6. [Scenario D: Both Have Smartphones but No Internet (Dead Zone)](#6-scenario-d-both-have-smartphones-but-no-internet-dead-zone)
7. [Acceptance Mechanism Catalog](#7-acceptance-mechanism-catalog)
8. [Sync Protocol & Conflict Resolution](#8-sync-protocol--conflict-resolution)
9. [Portable Kiosk Model (Phase 2+)](#9-portable-kiosk-model-phase-2)
10. [Escrow Implications for Offline Cash](#10-escrow-implications-for-offline-cash)
11. [Fraud Vectors & Mitigations](#11-fraud-vectors--mitigations)
12. [Evidence Tier Mapping for Offline](#12-evidence-tier-mapping-for-offline)
13. [D27 Cash Rate Interaction](#13-d27-cash-rate-interaction)
14. [D28 Guardrails Offline Behavior](#14-d28-guardrails-offline-behavior)
15. [Deal-Chaining Offline Constraints](#15-deal-chaining-offline-constraints)
16. [Schema Changes](#16-schema-changes)
17. [Build Order & Phase Placement](#17-build-order--phase-placement)
18. [Edge Cases](#18-edge-cases)

---

## 1. Design Principles

### P1. SMS is the universal fallback channel
Not everyone has a smartphone. Almost everyone has a basic phone with SMS. Semaphore (sms.md) is already integrated for notifications — extend it to handle deal acceptance, counter-offers, and confirmations.

### P2. Offline mode is "record now, sync later"
The transaction happens at the point of interaction. If there's no internet, the device queues the record locally and syncs when connectivity returns. The platform never loses data.

### P3. No connection does not mean no deal
A deal can be initiated, negotiated, accepted, and fulfilled entirely offline. The platform becomes a record-keeper and trust layer after the fact. Some features (escrow, digital payment) are unavailable offline.

### P4. Dual confirmation still applies — adapted
The principle that no Order is created without both parties agreeing is preserved. The confirmation mechanism adapts to the available tools (SMS, biometric, photo, PIN, paper).

### P5. The kiosk is a shared, stationary "second party"
A sari-sari store tablet or barangay hall device acts as a proxy for whichever party lacks a device. It's not a replacement for individual ownership — it's a bridge.

### P6. Everything degrades, nothing is lost
Every offline or low-tech interaction creates a structured record (local first, sync later). The platform's trust value comes from *having a record at all*, not from real-time verification.

---

## 2. The Core Insight: Degradation Layers

The system defines five operating modes, degrading from "best" to "basic" as connectivity and device capability decrease:

| Layer | Name | Connectivity | Buyer Device | Servicer Device | Escrow | Payment | Evidence Tier |
|-------|------|-------------|-------------|----------------|--------|---------|--------------|
| L0 | Full online | Both online | Smartphone | Smartphone | ✅ Full D21 escrow | Digital (GCash/bank) | High (GPS, timestamps, photos) |
| L1 | SMS-aided | Buyer online, servicer SMS | Smartphone | Feature phone | ✅ Escrow (delayed) | Digital or cash | Medium (dual SMS confirm + photo) |
| L2 | Kiosk-mediated | Kiosk online | None needed | None needed | ✅ Escrow (kiosk proxy) | Digital (kiosk) | Medium (kiosk-recorded) |
| L3 | Local-first | Both offline at transaction time | Smartphone | Smartphone | ❌ (cash only) | Cash only | Low-Medium (local record, syncs later) |
| L4 | Paper trail | Both offline, no smartphones | Basic phone (SMS) | Basic phone (SMS) | ❌ | Cash only | Low (SMS record + photo) |

**Rule:** The system operates at the highest layer available. If both parties have smartphones and connectivity, it's L0. If the servicer has a feature phone but the buyer has a smartphone and signal, it's L1. If neither has connectivity, it's L3.

---

## 3. Scenario A: Buyer Has Smartphone, Servicer Does Not

### The Prototype
Tricycle driver Mang Jose has a feature phone (no smartphone, no data). He has a laminated QR sticker taped to his tricycle. Buyer Juan has a smartphone with the Serbizyu app.

### 3.1 Flow

```
[Face-to-face: Juan is at the tricycle stand]

1. Juan scans Mang Jose's QR sticker
   → Landing page loads (if Juan has signal)
   → OR: Juan has the listing cached from earlier browsing

2. Juan selects "Quick Deal"
   → Enters offer: ₱40 to the market
   → Adds photo of Mang Jose + tricycle (optional but recommended)

3. System checks: Mang Jose's device capability
   → Detects: phone number on file, no app install, no data
   → Falls back to SMS acceptance flow

4. System sends SMS to Mang Jose's feature phone:
   "SERBIZYU: Juan offers ₱40 for ride to market.
    Reply: ACCEPT A7K3 or COUNTER or DECLINE"

5. Mang Jose replies: "ACCEPT A7K3"
   → System logs the acceptance with SMS timestamp
   → Both parties get confirmation SMS
   → Juan's phone creates the Order record
   → If Juan has signal: Order is live immediately
   → If Juan is also offline: Order queued locally

6. Ride happens. Payment is cash (Mang Jose doesn't have GCash).

7. Juan takes a "post-ride" photo (timestamped selfie with Mang Jose).

8. When connectivity returns:
   → Order syncs to server
   → Photo evidence uploaded
   → SMS confirmation matched to Order
   → 3-day review window starts from sync timestamp
   → Commission tracked as receivable (D27 cash model)
```

### 3.2 Acceptance Mechanism
**Primary:** SMS reply with deal token
- Token format: 4 chars Crockford base32 (shorter than sms.md's 6-char for ease of typing on numeric keypad)
- Reply format: `ACCEPT X7K3`, `COUNTER 45`, `DECLINE`
- Token printed on the QR sticker itself alongside the QR code
- Token expiration: 30 minutes (matching Quick Deal offer window from §11.2)

**Fallback:** Pre-registered PIN acceptance
- Servicer registers a 4-digit PIN during onboarding
- Buyer enters servicer's PIN on their app to confirm acceptance
- PIN is printed on the QR sticker (can be changed every 30 days)

**Biometric (Phase 2+):** Facial recognition
- Buyer captures servicer's face via phone camera
- On-device face match against the servicer's registered selfie (D26 Identity Verified)
- Result: "Face match confirmed — Mang Jose accepted"
- Works completely offline (on-device ML)
- Risk: spoofing with photo (mitigated by liveness detection in Phase 3)

### 3.3 Sync Strategy
- **Buyer-side:** Order created locally with status `pending_sync`. When connectivity returns, POST to `/api/deals/sync` with the full record.
- **Server-side:** On receipt, sends SMS confirmation to servicer's phone. Matches `sms_acceptance_token` from the local record to the SMS reply.
- **If servicer's SMS reply hasn't arrived yet** (async): Order status = `pending_acceptance`. The full deal is only committed once the SMS reply is matched.
- **Conflict case:** If the servicer's SMS reply arrives before the buyer syncs (e.g., servicer replied, buyer walks to a signal area 30 min later): the server has the SMS acceptance but no Order yet. When the buyer syncs, the Order is created with the pre-existing SMS acceptance timestamp.

### 3.4 Escrow
- Cash transaction (D27): No escrow. Platform tracks commission as receivable.
- If buyer has GCash: Escrow can be created at sync time (when connectivity returns), but the ride has already happened. This is a **post-paid escrow** — it protects the servicer from non-payment more than the buyer from bad service.
- Recommendation: Cash-only for this scenario. Escrow requires real-time creation.

### 3.5 Fraud Vectors
- **SMS spoofing:** Someone else replies ACCEPT from a different number. → Mitigation: The SMS acceptance token is tied to the servicer's registered phone number. Replies from other numbers are rejected.
- **Replay attack:** Old QR token reused. → Mitigation: Tokens are single-use. Once `ACCEPT` or `DECLINE` is received, the token is expired.
- **Fake QR:** Malicious QR pasted over legitimate one. → Mitigation: QR encodes servicer UUID. Buyer's landing page shows servicer name, photo, and truck type. If it doesn't match the person in front of them, don't proceed.
- **Buyer claims ride happened when it didn't:** → Mitigation: Dual confirmation still required. Servicer must reply ACCEPT. Without it, no Order.

---

## 4. Scenario B: Servicer Has Smartphone, Buyer Does Not

### The Prototype
Elderly Aling Maria wants to hire Mang Jose's tricycle. She has no smartphone — just a basic phone for calls and SMS. Mang Jose has the Serbizyu app.

### 4.1 Flow

```
[Face-to-face: Aling Maria approaches Mang Jose at the market]

1. Mang Jose opens the Serbizyu app and selects "Create Quick Deal for Someone"

2. Mang Jose enters:
   - Buyer name/nickname: "Maria"
   - Buyer phone: 0917XXXXXXX
   - Service: Standard Trip to Barangay San Juan
   - Price: ₱50

3. System sends SMS to Aling Maria:
   "SERBIZYU: Mang Jose offers to take you to Brgy San Juan for ₱50.
    Reply: YES K4M9 to confirm or NO to decline"

4. Aling Maria replies: "YES K4M9"
   → System logs the confirmation
   → Order created
   → Mang Jose's app shows confirmed deal

5. Ride happens. Aling Maria pays ₱50 cash.

6. Mang Jose takes a photo of Aling Maria + tricycle (evidence).

7. Aling Maria receives follow-up SMS:
   "SERBIZYU: Rate Mang Jose 1-5. Reply RATE K4M9 5"

8. On Mang Jose's app: 3-day review window starts. Since this is cash,
   the "escrow" is the platform's trust record.
```

### 4.2 Acceptance Mechanism
**Primary:** SMS reply from buyer's phone
- Same token system as Scenario A, reversed direction
- Buyer replies with token included in the SMS
- Token printed on a physical "Serbizyu confirmation card" that servicers can carry

**Alternate:** Photo acceptance (zero SMS cost)
- Servicer takes a photo of the buyer with their smartphone
- Photo includes GPS metadata and timestamp
- Buyer optionally speaks the price into a video recording
- This creates a non-repudiable record without SMS costs
- Works entirely offline

**Alternate:** Pre-registered buyer PIN
- Buyer registers a PIN during a prior visit to a barangay kiosk
- Servicer enters the PIN into their app to confirm buyer accepted
- PIN is printed on a physical card the buyer carries

### 4.3 Sync Strategy
- **Servicer-side:** Order record is created on the servicer's device immediately. Status = `awaiting_buyer_confirm_sync`.
- **SMS side:** Semaphore webhook receives buyer's YES/NO reply. Timer: 15-minute window for buyer to reply.
- **On sync:** If the buyer's SMS reply was YES and the servicer uploads the photo evidence, the Order is fully committed.
- **If buyer doesn't reply to SMS:** The deal is recorded as `abandoned_offer`. No order created. Servicer can show the attempt record if the buyer later disputes the ride.

### 4.4 Escrow
- Cash transaction only (buyer has no smartphone, unlikely to have GCash).
- Platform fee: 12% cash rate (D27), tracked as servicer receivable.
- No escrow hold.

### 4.5 Fraud Vectors
- **Servicer creates fake deals with buyer's phone number:** Servicer could generate fake confirmations by using a buyer's phone number without their knowledge. → Mitigation: The SMS sends the service description and price. Buyer can verify. Also, the buyer's phone number must NOT be manually entered by the servicer — it should come from a pre-existing contact or the phone's contacts API, or the servicer calls the buyer to confirm.
- **Servicer artificially boosts their volume:** Creating fake Quick Deals with a confederate's phone. → Mitigation: Rate limits still apply (max 5 Quick Deals per buyer-servicer pair per hour). Dispute monitoring catches patterns.

---

## 5. Scenario C: Both Offline / No Connectivity

### The Prototype
Juan and Mang Jose are in a remote barangay in Candon's outskirts. No cellular data signal. Both have smartphones. They want to do a Quick Deal and record it.

### 5.1 Flow

```
[Face-to-face: dead zone, no internet]

1. Juan opens the Serbizyu app. It detects no connectivity.
   → App shows "Offline Mode" banner
   → Cached servicer profiles from last sync are available
   → QR scan works (QR decoding is local)

2. Juan scans Mang Jose's QR (or finds him in cached listings).
   → Quick Deal flow proceeds entirely offline:
     - Price negotiation (cached, max 3 rounds)
     - Terms agreed
     - Both parties "sign" by tapping [Confirm] on their respective devices
     - App generates a local Order record with:
       - deal_id (locally generated UUID)
       - Both parties' device fingerprints
       - GPS coordinates (from last known position)
       - Timestamp
       - Photo evidence (stored locally)

3. Payment: Cash. Juan hands ₱40 to Mang Jose.
   → App records "cash_confirmed" flag (both tap)

4. Ride happens.

5. Later, when either party reaches connectivity:
   → App syncs the local record queue
   → Synced Orders are matched by deal_id (UUID collision risk is negligible)
   → If BOTH parties sync the same deal_id, the system auto-merges
   → If only ONE party syncs, the deal is recorded as "single-source verified"
     with status = `pending_dual_verification` until the other party syncs
   → 3-day review window starts from first sync timestamp
```

### 5.2 Acceptance Mechanism
**Primary:** In-app dual confirmation (both devices, no internet)
- Both parties have the app. The app generates and signs the deal locally.
- Each device stores a cryptographic signature of the deal terms.
- "Done offline" marker = true on the Order record.

**Fallback:** Photo + SMS
- If one party can't use the app offline (e.g., low battery, no cached data):
- Take a timestamped photo of both parties together with the cash visible
- When signal returns, the photo is uploaded with an SMS confirmation to the other party

### 5.3 Sync Strategy

#### Local Queue
Each device maintains a `pending_sync` local store (SQLite or IndexedDB for PWA):

```json
{
  "queue": [
    {
      "local_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "quick_deal",
      "payload": { ... full deal record ... },
      "created_at": "2026-07-19T10:30:00+08:00",
      "sync_attempts": 0,
      "sync_status": "pending"
    }
  ]
}
```

#### Sync Protocol

1. **Trigger:** Connectivity detected (navigator.onLine → true, or periodic background fetch)
2. **Push:** Device POSTs all pending items to `POST /api/deals/sync/batch`
3. **Server validation:**
   - Check `local_id` uniqueness (stored as `client_deal_id` on the server)
   - If `client_deal_id` already exists: return `409 Conflict` → this means the other party already synced this deal. Server sends back the canonical server-side deal record.
   - If new: create the deal with status `pending_peer_verification`
4. **Peer verification:**
   - The server waits up to 72 hours for the other party to sync a matching deal
   - Match criteria: same `servicer_id`, `buyer_id`, price within ₱5, timestamp within 2 hours
   - If matched: status → `live`, review window starts
   - If not matched within 72 hours: the deal is single-source. Dispute protection is lower (Low evidence tier, §12).
5. **Return:** Server returns full canonical deal record. Device updates local store.

#### Conflict Resolution

| Conflict | Resolution |
|----------|-----------|
| Both parties sync different prices | Highest price wins (buyer protection bias). Flag for admin review. |
| Only one party syncs | Deal stands as Low evidence. The other party is notified via SMS when their number is identified. |
| Timestamps differ by >2 hours | Manual review. Likely two different transactions. Create separate records. |
| Duplicate sync of same deal_id | Idempotent: server returns existing record, no duplicate created. |
| Party A syncs "completed" but Party B syncs "disputed" | Dispute takes priority. Escrow frozen (if any). Admin reviews. |

### 5.4 Escrow
- Cash transaction. No escrow hold.
- Platform fee (12%) tracked as `receivable` on the servicer's Serbizyu wallet.
- The 3-day guarantee (D21) works differently:
  - Starts when the deal is synced, NOT when the work happened
  - Buyer has 3 days from sync to dispute
  - If buyer disputes after 3 days from ride but <3 days from sync: dispute is valid
  - Rationale: The buyer couldn't dispute while offline. The clock starts when they can.

### 5.5 Offline Guardrails for D28 Quick Deal Rules

| Guardrail | Online Behavior | Offline Behavior |
|-----------|----------------|-----------------|
| Max 3 counter-rounds | Server-enforced counter | Local counter tracked in local state. App enforces once sync'd. If counters >3 at sync time, only first 3 count. |
| >50% deviation warning | Server-side check against listing price | App must cache the listing price. If not cached, warning is skipped (deal still proceeds). |
| Quick Deal expiry (30 min) | Server timer | Local timer. If connection returns after expiry, offer is marked expired. |
| Rate limits (max 5/hr per pair) | Redis-based | App estimates from local cache. If uncertain, warns "may exceed limit." Server enforces at sync. |

---

## 6. Scenario D: Both Have Smartphones but No Internet (Dead Zone)

Identical to Scenario C in flow, but both parties can use the app fully (cached UIs, local processing). The key difference:

- **No SMS costs** — both confirm via app
- **Higher evidence tier** — both devices sign, GPS from both, photos from both
- **Faster sync** — whichever party walks into signal first triggers the sync
- **Deal-Chaining possible offline** — a Deal-Chain can be negotiated and agreed offline (all slots defined, servicers accept via SMS or cached app), but payment cannot be collected until online.

---

## 7. Acceptance Mechanism Catalog

### 7.1 SMS Token (L1, L4)
- **How it works:** Server sends SMS with a 4-char token. Recipient replies with `ACCEPT <token>`.
- **Token format:** 4 chars Crockford base32 (no I, L, O, U). 32^4 = 1,048,576 combinations. Sufficient for one-hour windows.
- **Token storage:** `sms_acceptance_tokens` table. Token, phone_number, deal_id, expires_at, used_at.
- **Cost:** ₱0.60–1.00 per SMS sent. Two SMS per deal (offer + confirmation) = ~₱1.20–2.00.
- **Pros:** Works on any phone. Familiar pattern (load confirmation codes).
- **Cons:** SMS cost. Delay (seconds to minutes). Requires signal (Scenario C dead zones: doesn't work).
- **Fallback if no signal:** None — this mechanism requires SMS delivery.

### 7.2 Physical Acceptance Card (L1, L2, L4)
- **How it works:** Pre-printed card with a unique QR code or token. Party B scans the card to accept.
- **Card format:** Credit-card sized, laminated. Contains: Serbizyu logo, servicer name, unique QR, unique 6-digit alpha-numeric token, "I accept" checkbox field with space for signature.
- **Lifecycle:** Card issued during servicer onboarding. Tied to servicer's account. Can be revoked.
- **Pros:** Zero per-transaction cost. Physical token cannot be replayed (scanned once). No signal needed.
- **Cons:** Card can be lost, stolen, or damaged. Requires physical distribution.
- **Implementation:** `physical_token` table. token_id, servicer_id, issued_at, revoked_at, last_scanned_at.

### 7.3 Pre-registered PIN (L1, L3, L4)
- **How it works:** Party A enters Party B's 4-6 digit PIN into their app.
- **PIN registration:** Done at onboarding or at a kiosk. PIN is hashed (bcrypt) and stored.
- **PIN delivery:** Printed on a physical card, or memorized.
- **Pros:** Works entirely offline. Zero infrastructure cost per transaction. Familiar (ATM PIN model).
- **Cons:** PIN can be shared, observed, or guessed. Must be changeable.
- **Security:** Rate-limit PIN attempts (3 tries, then lockout). PIN is never stored in plaintext on the device.

### 7.4 Biometric Face Scan (L0, L3 — Phase 2+)
- **How it works:** On-device face capture. ML-based face matching against registered identity photo.
- **Framework:** MediaPipe FaceMesh or Google ML Kit face detection. All on-device, no internet needed.
- **Accuracy:** Good for 1:1 verification in controlled lighting. Degraded in poor light (tricycle at night).
- **Pros:** Works offline. Hard to spoof with liveness detection. No per-transaction cost.
- **Cons:** Requires smartphone with camera. Requires Identity Verified servicer (D26). Poor lighting = false reject. Privacy concerns.
- **Storage:** Face embeddings stored on-device only. Server stores hash of embedding for matching. Raw face data never leaves the device.

### 7.5 Photo Confirmation + GPS (L3, L4)
- **How it works:** Both parties take a selfie together at deal conclusion. Photo embeds GPS coordinates and timestamp (EXIF).
- **Pros:** Works 100% offline. Creates irrefutable record of mutual presence. Zero infrastructure cost.
- **Cons:** Not real-time confirmation (photo is evidence, not mechanism). Disputes require human review of photo.
- **Evidence weight:** Photo + GPS + timestamp = Medium evidence tier (§12).

### 7.6 Agent-Mediated (L2 via kiosk)
- **How it works:** A kiosk operator or barangay agent acts as proxy. They operate the app/screen on behalf of the offline party.
- **Role:** The agent is a neutral third party who confirms both parties agreed.
- **Pros:** Works for any combination of device/connectivity gaps. Human verification.
- **Cons:** Requires trusted agent. Adds a human step.
- **Accountability:** Agent signs the deal record with their credentials. Agent's acceptance is logged as `mediated_by`.

### 7.7 Acceptance Mechanism Decision Matrix

| Mechanism | Works Offline? | Both Smartphones? | One Smartphone? | No Smartphones? | Cost Per Deal | Speed | Evidence Tier |
|-----------|---------------|------------------|-----------------|-----------------|---------------|-------|--------------|
| SMS Token | No (needs signal) | ✅ | ✅ | ✅ | ₱1–2 | ~10s–2min | Medium |
| Physical Card | ✅ | ✅ | ✅ | ✅ | ₱0 (printed once) | Instant | Medium |
| Pre-registered PIN | ✅ | ✅ | ✅ | ✅ (card-based) | ₱0 (printed once) | Instant | Medium |
| Biometric Face | ✅ | ✅ | ✅ (scanner needs smartphone) | ❌ | ₱0 | ~2s | High |
| Photo + GPS | ✅ | ✅ | ✅ (one camera needed) | ❌ | ₱0 | ~5s | Low-Medium |
| Agent-Mediated | ✅ | ✅ | ✅ | ✅ | ₱0 (if volunteer) | Variable | Medium-High |

---

## 8. Sync Protocol & Conflict Resolution

### 8.1 Data Structures

#### Local Pending Record (stored on device)
```json
{
  "client_id": "uuid-v4",                     // client-generated UUID
  "local_created_at": "2026-07-19T10:30:00+08:00",
  "type": "quick_deal",
  "sender_device_id": "device-fingerprint-hash",
  "version": 1,                                // schema version for forward compat
  "payload": {
    "servicer_id": "uuid",
    "buyer_id": "uuid",
    "phone_number_buyer": "0917XXXXXXX",
    "phone_number_servicer": "0918XXXXXXX",
    "listing_id": "uuid",
    "category_id": "uuid",
    "price": 40.00,
    "negotiation_rounds": [
      { "round": 1, "proposed_by": "buyer", "amount": 40.00, "accepted": true }
    ],
    "payment_method": "cash",
    "acceptance_mechanism": "sms_token",
    "acceptance_token": "K4M9",
    "acceptance_timestamp": "2026-07-19T10:31:00+08:00",
    "servicer_phone_used": "0918XXXXXXX",
    "gps_lat": 17.1854,
    "gps_lng": 120.4512,
    "evidence_photos": [
      "file:///local/path/photo_1.jpg",
      "file:///local/path/photo_2.jpg"
    ],
    "evidence_photo_hashes": ["sha256:abc...", "sha256:def..."],
    "local_signatures": {
      "buyer_device": "signature-b64",
      "servicer_device": "signature-b64"
    },
    "deal_completed_local": false,
    "cash_confirmed_by_buyer": true,
    "cash_confirmed_by_servicer": true
  }
}
```

#### Server Sync Response
```json
{
  "status": "synced",
  "conflict": null,
  "canonical_deal": {
    "deal_id": "server-uuid",
    "client_id": "client-uuid",
    "status": "pending_peer_verification",
    "evidence_tier": "medium",
    "sync_source": "buyer_device",
    "peer_sync_status": "awaiting",
    "escrow_status": "not_applicable",
    "review_window_starts_at": null
  }
}
```

### 8.2 Sync Flow Diagram

```
Device (offline)                    Server
      |                               |
      |--- [connectivity detected] ---|
      |                               |
      |--- POST /api/deals/sync  ---->|
      |     { client_id, payload }   |
      |                               |
      |<--- 201 Created ---------------|
      |     { deal_id, status }       |
      |                               |
      |--- POST /api/deals/evidence ->|
      |     { deal_id, photos[] }     |
      |                               |
      |<--- 200 OK -------------------|
      |                               |
      (later: other party syncs)
      |                               |
      |<--- [webhook: peer_synced] ---|
      |     deal_id is now confirmed  |
```

### 8.3 Conflict Resolution Matrix

| Conflict Type | Detection | Resolution | Data Loss? |
|--------------|-----------|------------|-----------|
| Price mismatch (buyer ₱40, servicer ₱50) | Both parties sync different prices | Lower price unless servicer provides evidence of agreement. Flag admin review. | No. Both records preserved. |
| One-sided sync | Only one party syncs within 72h | Deal stands at Low evidence tier. SMS sent to unsynced party. | No. Unsynced party can sync later. |
| Duplicate client_id | Server receives same client_id twice | Return 409 with existing deal data. Client reconciles. | No |
| Photo mismatch | Different photos uploaded for same deal | Merge all unique photos. | No |
| Different acceptance mechanism claimed | Buyer says SMS token, server has no SMS record | Admin review. Deal held at `pending_verification`. | No |
| Both parties claim they initiated | Duplicate client_ids, different initiators | Timestamp-based: earlier initiator wins. | One record marked `superseded`. |
| Conflicting deal completion status | One says completed, one says disputed | Dispute wins. Both records preserved as evidence. | No |
| GPS coordinates >500m apart | Both devices record GPS, locations differ | Deal still valid (they may have moved). Flagged for admin if dispute arises. | No |

### 8.4 Sync Protocol Rules

1. **Idempotency:** All sync endpoints are idempotent on `client_id`. Re-syncing the same record returns existing data.
2. **Ordering:** Syncs are processed in `local_created_at` order per device.
3. **Authentication:** Device sends a `client_token` — a device-scoped API token generated during last online session. Stored in device secure storage.
4. **Backoff:** If server returns 429, device doubles retry interval (min 30s, max 30min).
5. **Photo sync:** Photos are uploaded last, via `POST /api/deals/{id}/evidence`. The deal record itself can be created with `evidence_pending = true`.
6. **Partial sync:** If a large deal has many photos, each photo uploads independently. The deal record is created immediately; photos trickle in.
7. **Queue persistence:** The pending sync queue survives app restart (SQLite/IndexedDB).
8. **Queue flush:** On successful sync of a record, it's removed from the local queue.

---

## 9. Portable Kiosk Model (Phase 2+)

### 9.1 What Is the Kiosk?

A **fixed-location shared device** that acts as a Serbizyu terminal for face-to-face deal creation, acceptance, and record-keeping. It is NOT a replacement for personal accounts — it's a bridge for parties who don't have their own device or connectivity.

**Hardware options (in order of preference):**

| Option | Hardware | Estimated Cost | Pros | Cons |
|--------|----------|---------------|------|------|
| **A: Android Tablet** | Samsung Galaxy Tab A (8", ₱6K–8K) | ~₱8,000 + ₱500/mo data | Touchscreen, camera, GPS, SMS-capable. Runs native app or PWA. | Requires power. Can be stolen. |
| **B: Dedicated Android Phone** | Cherry Mobile or itel entry smartphone (₱2K–3K) | ~₱3,000 + prepaid load | Cheapest. Good camera. | Small screen. Battery management. |
| **C: Ruggedized Kiosk** | Sunmi V2s or similar (POS tablet) | ~₱15,000 | Built-in printer, thermal receipt, durable. | Expensive. Overkill for v1. |
| **D: Feature-phone SMS kiosk** | Nokia 105 + SMS gateway | ~₱1,000 | Absolute cheapest. No app needed. | Text-only. No photos. High latency. |

**Phase 2 recommendation:** Option A (Android tablet, generic) + Option D (SMS fallback). Total hardware cost ~₱9,000 per kiosk.

### 9.2 Where Kiosks Live

| Location | Operator | Best For | Foot Traffic |
|----------|----------|----------|-------------|
| Sari-sari store | Store owner (trained as agent) | Walk-in deal creation. Store owner knows everyone. | High |
| Barangay hall | Barangay secretary or tanod | Formal setting. Trusted authority. Mediation if disputes arise. | Medium |
| Wet market / talipapa | Market vendor cooperative | High-traffic. Vendors nearby. | Very high |
| Carried by Serbizyu agent | Mobile agent | House-to-house onboarding. Special events (fiestas, harvest). | Variable |
| Tricycle terminal / TODA | TODA dispatcher | High-density transport hub. Drivers waiting for passengers. | High |

### 9.3 Software Architecture

#### On the Kiosk Device
- **PWA shell** (cached via service worker for offline use)
- Or **Android APK** with local SQLite + background sync service
- Service worker caches: listing data from last sync, category list, pricing templates
- Background sync: periodic (every 15 min if idle, immediate if deal created), or push-triggered

#### Kiosk Software Stack
```
┌─────────────────────────────────────────────┐
│              Kiosk User Interface            │
│  [Deal Mode] [Servicer Mode] [Buyer Mode]   │
├─────────────────────────────────────────────┤
│           Kiosk State Machine                │
│  idle → selecting_party → deal_type →        │
│  price_entry → acceptance → printing/receipt │
├─────────────────────────────────────────────┤
│           Local Sync Queue                  │
│  SQLite or IndexedDB + Background Sync API   │
├─────────────────────────────────────────────┤
│           Device Services                    │
│  Camera, GPS, Biometric (if available),      │
│  SMS (via Semaphore API), Thermal printer    │
└─────────────────────────────────────────────┘
```

#### Kiosk State Machine
```
idle ──→ select_mode (buyer/servicer/both)
  │
  ├── buyer_none_device → search_servicer → select_servicer → negotiate → accept → record
  ├── servicer_none_device → search_buyer → no_buyer_found (create invitation)
  │                                            │
  │                                            └──→ buyer_found → negotiate → accept → record
  └── both_present → quick_deal_mode → negotiate → dual_accept → print_receipt → record
        │
        └── deal_chain_mode → define_slots → invite_servicers → ... (online required for multi-party)
```

#### Kiosk Modes

**Mode 1: Buyer has no device**
- Buyer approaches kiosk
- Operator selects "I need a service"
- Searches cached servicer listings by category/barangay
- Selects servicer, enters deal terms
- Kiosk sends SMS to servicer (if servicer has feature phone) or auto-notifies (if servicer has app)
- Servicer accepts via SMS reply or in-app
- Receipt printed for buyer

**Mode 2: Servicer has no device**
- Servicer approaches kiosk
- Operator selects "I offer a service"
- Servicer shown their profile (cached from last online session)
- Servicer sets availability, toggles Quick Deal on/off
- Wait for buyers (or kiosk operator finds one via word-of-mouth)
- When buyer found: create deal, print receipt

**Mode 3: Both present (most common kiosk deal)**
- Both parties come to kiosk together
- Quick Deal created, both confirm on kiosk screen
- Receipt printed with deal details, QR code, and token
- Cash changes hands directly
- Kiosk syncs when online

### 9.4 Receipt Format

```
═══ SERBIZYU ═══
Quick Deal Receipt
─────────────────
Deal #: QD-A7K3F9
Date: 2026-07-19 10:30 AM
─────────────────
Service: Tricycle Ride
From: Public Market
To: Brgy. San Juan
─────────────────
Servicer: Mang Jose (TODA #142)
Buyer: Juan dela Cruz
─────────────────
Price: ₱40.00
Payment: Cash
Platform Fee: ₱4.80 (12%)
─────────────────
Token: A7K3F9
Acceptance: [ ] Buyer signs here
            [ ] Servicer signs here
─────────────────
Scan QR to verify:
[QR CODE]
─────────────────
Serbizyu — Trusted Services in Candon
Text HELP to 22565
```

### 9.5 Kiosk Sync Strategy

- **Online kiosk:** Syncs immediately via API. Preferred.
- **Offline kiosk:** Queues all deals locally. Syncs when connectivity returns.
- **Sync trigger:** Device detects wifi or cellular data (periodic check every 5 min).
- **Push notification from server:** When kiosk comes online, server sends any pending invitations or counter-offers that were created while kiosk was offline.
- **Conflict handling:** Same as §8.3. Kiosk-generated deals have `client_type = "kiosk"` and `operator_id` for audit.
- **Cache refresh:** Kiosk downloads updated servicer listings, category prices, and blacklisted tokens on each sync.

### 9.6 Kiosk Operator Model

| Role | Operator | Training | Commission | Accountabilities |
|------|----------|----------|-----------|------------------|
| Sari-sari store owner | Store owner | 30-min in-person + printed guide | ₱5/deal + 2% of platform fee | Accurate recording, no fake deals |
| Barangay official | Secretary/treasurer | 1-hour training by Serbizyu agent | Stipend (₱500/mo) | Neutral facilitation, dispute first-response |
| Mobile agent | Serbizyu-trained agent | Full agent training (D19 model) | 10% platform fee per deal | Onboarding, kiosk maintenance, dispute mediation |
| TODA dispatcher | Terminal dispatcher | 15-min demo | ₱5/deal | Verification that drivers are real |

**Kiosk operator verification:** OTP-linked. Operator logs into kiosk with their Serbizyu account. All deals mediated through that kiosk are tagged with `operator_id`.

### 9.7 Multi-User Concurrency on One Kiosk

The kiosk is single-user-interaction at a time. For multiple concurrent parties:

1. **Queue mode:** Kiosk screen shows "Please wait — 2 parties ahead of you."
2. **Express mode:** For Quick Deals (both parties present), the flow takes <2 minutes. No meaningful queue.
3. **Token system:** Kiosk prints numbered queue tickets if demand is high.
4. **Multiple kiosks:** At high-volume locations (market, terminal), deploy 2+ kiosks.

**True concurrency is not needed.** Provincial PH foot traffic at a sari-sari store averages 10–30 deals per day. A single kiosk handles this with <5 min average wait.

---

## 10. Escrow Implications for Offline Cash

### 10.1 The Core Problem

D21 says: "Escrow created on payment confirmation → 3-day buyer review window." D27 says: "Cash transactions: buyer confirms 'paid in cash' → servicer confirms receipt → platform tracks for trust/review but no escrow hold."

**Offline adds:** Payment happens before the record exists on the server. Escrow creation requires server-side processing (Xendit API call, ledger entry). If the record is created offline, escrow cannot be created until sync.

### 10.2 Cash Only Offline

**Rule:** Offline deals **must** use cash payment. No escrow is created at deal time.

| Scenario | Payment | Escrow | 3-Day Guarantee |
|----------|---------|--------|-----------------|
| Online, both parties | Digital (GCash/bank) | ✅ Full D21 escrow | ✅ Starts at payment confirmation |
| Online, cash | Cash | ❌ No escrow (D27) | ⚠️ Starts at dual confirmation |
| Offline, any method | Cash only (mandatory) | ❌ No escrow | ⚠️ Starts at first sync timestamp |
| Offline, over ₱5K | Cash with barangay witness | ❌ No escrow | ⚠️ Starts at sync. Witness signature required. |

**Why no escrow offline:**
- Escrow requires: payment capture → Xendit API call → ledger entry → webhook confirmation
- All of these require server connectivity
- Attempting to create escrows in a deferred batch at sync time is dangerous:
  - The money isn't held yet — the buyer might not have it
  - The service is already delivered — escrow's protective purpose (hold before delivery) is already defeated
  - Ledger reconciliation becomes complex and error-prone

### 10.3 Post-Sync Escrow for Digital-Offline Hybrid

**Phase 3+ feature:** If both parties agree at deal time that the buyer will pay digitally *when signal returns*:

1. Deal is created offline with payment_method = `digital_deferred`
2. Buyer acknowledges: "You will pay ₱40 when you have signal."
3. At sync time, buyer receives push notification: "Confirm payment for Deal QD-A7K3F9"
4. Buyer taps [Pay Now] → GCash link → payment processed → escrow created
5. **Problem:** The servicer already did the work. Escrow is now "seller protection" against non-payment, not "buyer protection" from bad service.
6. **Mitigation:** The 3-day review window starts after payment, not after work. This means the servicer waits 3 days from sync+payment to get their money, even though they worked hours/days ago.

**Recommendation:** Do NOT implement post-sync escrow in Phase 1–2. Keep it cash-only offline. The 3-day guarantee for offline cash deals works as:

> **Offline 3-day rule:** Buyer has 3 days from the **earlier of** (a) the deal sync timestamp, or (b) the timestamp they were confirmed reachable via SMS, to file a dispute. After 3 days, the platform considers the deal final. No money is held (it's cash), but the platform's trust record and commission receivable are finalized.

### 10.4 Commission Tracked as Receivable

For all offline cash deals:

1. At sync, platform fee (12% D27 rate) is recorded as `accounts_receivable.servicer_commission`
2. Servicer sees in their wallet: "Commission owed: ₱4.80 (from QD-A7K3F9)"
3. The receivable accumulates. When it exceeds ₱100, the servicer is prompted to pay via GCash, or it's deducted from their next digital payout.
4. For servicers who never have digital payouts: quarterly collection run by Serbizyu agent (cash pickup, recorded in system).

---

## 11. Fraud Vectors & Mitigations

### 11.1 Threat Model for Offline Deals

| Threat | Description | Mechanism Exploited | Mitigation |
|--------|-------------|--------------------|-----------|
| **T1: Fake QR sticker** | Malicious actor prints fake QR with their own servicer ID, pastes over legitimate tricycle QR | QR is static, easy to copy | QR landing page shows servicer name, photo, vehicle. Buyer MUST verify matches. GPS-anchored QR (Phase 3). |
| **T2: SMS spoofing** | Attacker sends fake ACCEPT reply from a different number | SMS sender ID can be spoofed on some networks | Match reply against registered phone number. Reject mismatches. Log carrier sender ID. |
| **T3: Collusion** | Buyer and servicer collude to create fake deals, collect platform rewards, then cancel | Both parties agree to fake a transaction | Rate limits cap volume. Pattern detection flags back-to-back deals from same pair. No rewards for cash deals (no escrow). |
| **T4: Replay attack** | Same acceptance token used twice | Token not expired after first use | Tokens are single-use. Server marks `used_at` on receipt. Client-side also expires locally. |
| **T5: Photo spoofing** | Old photo reused as evidence | Photo timestamp can be spoofed | Photo metadata includes GPS, timestamp, AND device signature. Server compares against known data. |
| **T6: Kiosk operator fraud** | Kiosk operator creates fake deals to earn commission | Operator has physical access to kiosk | Operator's deals tagged with operator_id. Pattern detection: abnormal volume from one operator. Spot audits. |
| **T7: Double-dipping** | Servicer claims same cash deal on two platforms | Cash has no digital trail | QR sticker is servicer-specific. Deal ID is platform-specific. Cross-platform is outside scope. |
| **T8: Fake acceptance card** | Physical card counterfeited | QR on card is printed, could be photographed and printed | Card QR encodes: servicer_id + card_serial + signature. Signature validated server-side. |
| **T9: Dead-zone bait-and-switch** | Servicer agrees deal offline, then claims different price at sync | No server record during offline negotiation | Both parties must locally sign the deal terms. Photo evidence of agreement. Price stored on both devices. |
| **T10: Buyer claims cash paid when it wasn't** | Buyer confirms cash paid, but didn't actually pay | Dual confirmation is trust-based | Photo of cash handover. Receiver confirmation required (both tap "paid"). Pattern monitoring. |

### 11.2 Risk Scoring for Offline Deals

Each offline deal gets a risk score at sync time. Admin dashboard flags high-risk deals:

```
Risk Score = sum of:
  +10  if single-source (only one party synced)
  +20  if no photo evidence
  +15  if deal value >₱5,000
  +10  if acceptance mechanism = PIN (easier to share)
  +5   if new buyer (<3 days on platform)
  +5   if new servicer (<3 days on platform)
  -10  if confirmed by BOTH parties via SMS token
  -15  if photo + GPS embedded
  -10  if barangay witness present

Thresholds: <20 = low, 20-40 = medium (review spot-check), >40 = high (manual review required)
```

---

## 12. Evidence Tier Mapping for Offline

### 12.1 D24 Evidence Tiers Adapted

D24 defines three evidence tiers. Offline interactions naturally land in Low or Medium. High tier requires platform tools (GPS tracking, step timestamps, photo proof) that are unavailable without app-mediated real-time interaction.

| Evidence Tier | Online Equivalent | Offline Equivalent | Requirements |
|---------------|------------------|-------------------|--------------|
| **High** | GPS tracking, step-by-step confirmations, photo proof | **Not achievable offline.** The closest is: both devices signed the deal + GPS + photos + SMS confirmations from both parties. | Two-device local signatures, GPS, timestamped photos, SMS confirmations. |
| **Medium** | Calendar confirmations, chat logs, manual photo uploads | SMS acceptance tokens + photo evidence + GPS. Single-device signatures. | At least two of: SMS reply, photo, GPS, physical card scan. |
| **Low** | Cash handshake, no tools, "I said / they said" | Single-source sync (one party uploads). No photo. PIN-only acceptance. No GPS. | Only one party's record. No corroborating evidence. |

### 12.2 Default Evidence Tier by Scenario

| Scenario | Default Tier | Can Upgrade To | Conditions |
|----------|-------------|----------------|------------|
| A (buyer smartphone, servicer no) | Medium | High (if buyer takes geo-tagged photo + servicer SMS confirms) | Both confirmations + photo |
| B (servicer smartphone, buyer no) | Medium | Medium (SMS from buyer + photo from servicer) | SMS confirmation + photo |
| C (both offline, smartphones) | Medium | High (both sign locally, both have GPS + photos) | Dual local signatures + dual GPS |
| D (both offline, no smartphones) | Low | Medium (if photo from servicer's basic phone camera) | Photo evidence |
| Kiosk-mediated | Medium | High (if kiosk prints receipt + operator confirms + both sign) | Printed receipt + witness |

### 12.3 Impact on Dispute Resolution

Following D24: "Low tier: burden falls on servicer."

- **Low-tier offline deals:** If the buyer disputes, the servicer bears the burden of proof. The platform's default is to side with the buyer unless the servicer produces evidence.
- **Medium-tier offline deals:** Split by evidence. The platform considers SMS logs, photos, and GPS data.
- **High-tier offline deals (rare, offline):** Near-automatic protection for whichever party's evidence is stronger.

**This means:** To protect themselves, servicers operating offline should:
1. Always take a confirmation photo (selfie with buyer + cash)
2. Encourage buyers to use SMS acceptance (generates server-side evidence)
3. Use physical acceptance cards (traceable)
4. If using a kiosk, ask for the printed receipt

---

## 13. D27 Cash Rate Interaction

D27 establishes:
- Digital: 8%
- Cash (dual confirmed): 12%
- Cash (high value >₱5K): 15%

### 13.1 Rate Application for Offline Deals

All offline deals are cash (per §10.2). Rate is determined by the deal value at time of sync:

| Offline Scenario | Value | Rate | Notes |
|-----------------|-------|------|-------|
| Quick Deal, any offline | ≤₱5,000 | 12% | Standard cash rate |
| Quick Deal, any offline | >₱5,000 | 15% | Barangay witness required (D27) |
| Deal-Chain, all slots offline | Sum of all slot prices | Per-slot rate | Each slot's rate independent |

### 13.2 Barangay Witness for High-Value Offline Deals

For offline cash deals >₱5,000:
- D27's barangay witness requirement is enforced
- If kiosk is at barangay hall: barangay secretary acts as witness
- If kiosk is at sari-sari store: store owner can be witness IF they are a verified barangay official
- If no kiosk: both parties must upload a photo of themselves WITH a barangay tanod or official
- The witness's name, position, and contact are recorded in the deal metadata
- Without witness: deal is marked `high_value_no_witness` and default disputes go against the servicer

### 13.3 "Protected" Tier for Offline Cash

D27's optional "Protected" tier (+₱10–15/transaction) works differently offline:
- Cannot be activated offline (requires real-time payment via Xendit)
- If buyer wants Protected tier: they must go online after the deal and pay the +₱10–15 via GCash
- The protection covers: platform-mediated dispute resolution with admin review
- **Deferred Protected tier:** If buyer agrees to pay the +₱10–15 within 24 hours of sync, protection is retroactively applied. This is a Phase 3 feature.

---

## 14. D28 Guardrails Offline Behavior

### 14.1 Quick Deal Guardrails

| D28 Guardrail | Online | Offline (Both Smartphones) | Offline (One Smartphone) | Offline (No Smartphones) |
|--------------|--------|---------------------------|-------------------------|-------------------------|
| Max 3 counter-rounds | Server-enforced | Locally enforced. If >3 at sync, only first 3 count. | Locally tracked on app. SMS rounds count toward limit (each ACCEPT/COUNTER is a round). | Not enforced (no app). Kiosk enforces if used. |
| >50% deviation warning | Shown server-side | Shown if listing price is cached. If not cached, warning skipped. | N/A (buyer can't see deviation without app). | Kiosk shows warning. SMS-only: no warning possible. |
| Quick Deal expiry (30 min) | Server timer | Local timer on both devices. If connectivity returns after expiry, offer = expired. | SMS timer: 30 min from SMS sent. Server rejects ACCEPT after 30 min. | SMS timer only. |
| Rate limits (max 5/hr per pair) | Redis counter | Locally estimated. "You may approach the limit." Server enforces at sync. | Server checks at sync. If limit exceeded, oldest deal is cancelled. | Kiosk checks via local cache. Server enforces at sync. |
| >20% price modification monitoring | Server tracks % | Server tracks at sync. Offline modifications are still counted. | Same. | Same. |

### 14.2 Deal-Chaining Offline Constraints

Deal-Chaining is **severely constrained** offline:

| Feature | Offline Available? | Notes |
|---------|-------------------|-------|
| Create a Deal-Chain | ✅ (cached) | Define slots, set budget, invite servicers. Syncs later. |
| Invite servicers | ❌ | Invitation requires real-time availability check. SMS fallback works if servicer's phone number is known. |
| Servicer accepts slot | ⚠️ Partial | If invited via SMS: can accept. If invited via app: needs connectivity. |
| Counter-offer | ⚠️ Partial | SMS counter-offers work (4-char token). Full negotiation UI requires online. |
| Payment collection | ❌ | Requires server-side Xendit integration. |
| Escrow creation | ❌ | Requires server-side processing. |
| Slot replacement | ❌ | Requires live availability check. |
| Deal completion | ⚠️ Partial | Slots can be marked complete locally. Full Deal completion requires all slots confirmed online. |

**Recommendation:** Deal-Chaining is a Phase 2+ feature overall (per deal-system-spec §16.2). Offline support for Deal-Chaining is Phase 3+. Phase 1–2 offline focus is Quick Deal only.

---

## 15. Schema Changes

### 15.1 New Tables

#### `offline_deal_queue` (server-side, tracks pending syncs)

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `client_id` | UUID | UNIQUE, NOT NULL | Client-generated UUID for idempotency |
| `client_type` | ENUM | `app_android`, `app_ios`, `pwa`, `kiosk` | What device created this |
| `device_fingerprint` | VARCHAR(255) | NOT NULL | Hash of device identifier |
| `deal_id` | UUID | FK → deals.id, nullable | Filled after deal creation |
| `status` | ENUM | `pending`, `synced`, `conflict`, `merged`, `stale` | |
| `payload` | JSONB | NOT NULL | The full deal payload as submitted |
| `sync_attempts` | INTEGER | DEFAULT 0 | |
| `last_sync_error` | TEXT | Nullable | |
| `created_at` | TIMESTAMP | | |
| `synced_at` | TIMESTAMP | Nullable | |

#### `sms_acceptance_tokens`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `token` | VARCHAR(4) | NOT NULL, INDEX | Crockford base32, 4 chars |
| `deal_id` | UUID | FK → deals.id, nullable | Populated when deal is created |
| `phone_number` | VARCHAR(20) | NOT NULL | Recipient's phone |
| `direction` | ENUM | `to_buyer`, `to_servicer` | Who receives the SMS |
| `purpose` | ENUM | `accept_deal`, `counter_offer`, `rate_service`, `verify_identity` | |
| `status` | ENUM | `pending`, `accepted`, `declined`, `countered`, `expired` | |
| `counter_value` | DECIMAL(10,2) | Nullable | If countered: the amount |
| `expires_at` | TIMESTAMP | NOT NULL | 30 minutes from issuance |
| `used_at` | TIMESTAMP | Nullable | |
| `created_at` | TIMESTAMP | | |

#### `physical_acceptance_cards`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `card_serial` | VARCHAR(12) | UNIQUE, NOT NULL | Printed on card |
| `qr_content` | TEXT | NOT NULL | Encoded data for QR on card |
| `servicer_id` | UUID | FK → users.id | Tied to one servicer |
| `issued_at` | TIMESTAMP | | |
| `revoked_at` | TIMESTAMP | Nullable | |
| `last_used_at` | TIMESTAMP | Nullable | |

#### `kiosk_operators`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → users.id, UNIQUE | Must be a verified user (D26 Identity Verified minimum) |
| `kiosk_location_type` | ENUM | `sari_sari_store`, `barangay_hall`, `market`, `mobile`, `toda_terminal` | |
| `kiosk_location_name` | VARCHAR(255) | | e.g., "Aling Maria's Sari-Sari Store" |
| `barangay` | VARCHAR(100) | | |
| `device_id` | VARCHAR(255) | | The kiosk device's unique identifier |
| `device_model` | VARCHAR(100) | | |
| `is_active` | BOOLEAN | DEFAULT true | |
| `commission_rate` | DECIMAL(3,3) | | Per-deal commission for this operator |
| `trained_at` | TIMESTAMP | Nullable | Training completion date |
| `created_at` | TIMESTAMP | | |

#### `kiosk_sessions`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK | |
| `kiosk_operator_id` | UUID | FK → kiosk_operators.id | |
| `deal_id` | UUID | FK → deals.id | Deal created during this session |
| `session_type` | ENUM | `buyer_serviced`, `servicer_registered`, `deal_mediated`, `inquiry` | |
| `buyer_phone` | VARCHAR(20) | Nullable | Phone of buyer if applicable |
| `servicer_phone` | VARCHAR(20) | Nullable | Phone of servicer if applicable |
| `printed_receipt` | BOOLEAN | DEFAULT false | Whether receipt was printed |
| `receipt_hash` | VARCHAR(64) | Nullable | SHA-256 of receipt content |
| `created_at` | TIMESTAMP | | |

### 15.2 Modified Tables

#### `deals` (existing)

Add columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `operating_layer` | ENUM | `l0` | `l0`, `l1`, `l2`, `l3`, `l4` — which degradation layer was active at creation |
| `sync_status` | ENUM | `online` | `online`, `pending_sync`, `awaiting_peer`, `conflict`, `single_source` |
| `offline_acceptance_mechanism` | JSONB | NULL | Which mechanisms were used (array of strings from §7) |
| `offline_acceptance_data` | JSONB | NULL | Token refs, photo hashes, PIN references |
| `risk_score` | INTEGER | NULL | Computed at sync time (§11.2) |
| `evidence_tier` | ENUM | NULL | Computed at sync time (§12) |
| `client_id` | UUID | NULL | Client-generated UUID for first party |
| `client_2_id` | UUID | NULL | Client-generated UUID for second party (if both sync) |
| `kiosk_operator_id` | UUID | FK → kiosk_operators.id | Non-null if kiosk-mediated |
| `barangay_witness_name` | VARCHAR(255) | NULL | For high-value cash deals |
| `barangay_witness_contact` | VARCHAR(20) | NULL | |

#### `deal_slots` (existing)

Add columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `offline_acceptance_token` | VARCHAR(4) | NULL | SMS token for this slot (if offline) |
| `offline_acceptance_method` | ENUM | NULL | `sms`, `pin`, `face`, `photo`, `card`, `agent` |

#### `orders` (existing)

Add columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_offline` | BOOLEAN | FALSE | Created while offline |
| `client_created_at` | TIMESTAMP | NULL | Timestamp on the creating device |
| `client_created_gps` | POINT | NULL | GPS at creation time |

### 15.3 New Indexes

```sql
CREATE INDEX idx_offline_queue_client_id ON offline_deal_queue(client_id);
CREATE INDEX idx_offline_queue_status ON offline_deal_queue(status);
CREATE UNIQUE INDEX idx_sms_tokens_token ON sms_acceptance_tokens(token);
CREATE INDEX idx_sms_tokens_phone ON sms_acceptance_tokens(phone_number);
CREATE INDEX idx_physical_cards_servicer ON physical_acceptance_cards(servicer_id);
CREATE INDEX idx_kiosk_sessions_operator ON kiosk_sessions(kiosk_operator_id);
CREATE INDEX idx_kiosk_sessions_deal ON kiosk_sessions(deal_id);
CREATE INDEX idx_deals_sync_status ON deals(sync_status);
CREATE INDEX idx_deals_operating_layer ON deals(operating_layer);
```

---

## 16. Build Order & Phase Placement

### 16.1 Phase 1 (Current Build)

- SMS token acceptance for Quick Deal (extend existing Semaphore integration)
- Photo + GPS evidence capture at deal creation
- Local-first deal record on app (cached UI, offline queue)
- Sync protocol v1 (POST /api/deals/sync)
- Evidence tier computation at sync
- Physical acceptance card schema + card generation tool (PDF for printing)
- D27 cash rate 12%/15% applied offline

**Phase 1 is "tricycle driver with a QR sticker and a feature phone" — the minimum viable offline flow.**

### 16.2 Phase 2 (Kiosk + Enhanced)

- Android kiosk app (PWA service worker + background sync)
- Kiosk operator model (onboarding, training materials, commission tracking)
- Receipt printing (thermal or A5)
- Pre-registered PIN acceptance
- Kiosk state machine (idle → deal → receipt)
- Risk scoring at sync (automated flagging)
- Deal-Chaining with offline slot definition (no payment collection)

### 16.3 Phase 3 (Full Offline)

- Biometric face acceptance (on-device ML)
- Post-sync escrow for digital-deferred payments
- "Protected" tier retroactive application for cash deals
- Kiosk-to-kiosk mesh sync (Phase 3+: kiosks relay deals to each other in dead zones via Bluetooth or WiFi Direct)
- GPS-anchored QR (QR includes location claim; server validates)
- Cross-platform compatibility via SMS gateway partnerships

---

## 17. Edge Cases

| # | Edge Case | Resolution |
|---|-----------|-----------|
| EC-O1 | Both parties sync identical deal at the exact same moment | Server processes first request, returns 409 for second with canonical data. Both devices reconcile. |
| EC-O2 | Buyer syncs, servicer never syncs (dies, loses phone, leaves town) | Deal stays `single_source` for 30 days, then auto-finalizes as Low evidence. Servicer commission receivable written off after 90 days. |
| EC-O3 | SMS token sent but never delivered (network failure) | Server retries SMS 3 times (5 min apart). After 15 min total: deal offer expires. Buyer notified to try again. |
| EC-O4 | Kiosk device stolen | Operator reports theft. Device is remotely deauthorized via `kiosk_operators.is_active = false`. Next sync from stolen device is rejected. |
| EC-O5 | Physical acceptance card lost | Servicer reports lost card. Card is revoked in system. Replacement card issued. Old card's QR is invalidated. |
| EC-O6 | Buyer/servicer disputes the local record after sync | Server has the synced payload signed by both devices. The signed payload is the canonical record. |
| EC-O7 | Deal created via kiosk, but servicer claims they never agreed | Kiosk operator is the witness. If operator confirms, deal stands. If operator is uncertain, deal is `disputed`. |
| EC-O8 | Multiple buyers scan the same QR in quick succession, one servicer | Rate limit: max 3 pending Quick Deals per servicer per 30 min. Excess offers get "Servicer is busy" message. |
| EC-O9 | Same deal synced from kiosk AND from one party's personal device | Server detects `client_id` mismatch for same deal content. Kiosk record is primary (operator-signed). Personal device record is supplementary evidence. |
| EC-O10 | Offline PIN guess brute force | 3 attempts per PIN per 15-minute window per device. After 3 failures, PIN is locked for 1 hour. Admin override available. |
| EC-O11 | Kiosk runs out of paper mid-receipt | Deal still proceeds. Digital record created. Operator notes "no receipt" in session log. QR code displayed on screen for buyer to photograph. |
| EC-O12 | Servicer's phone number changes (lost SIM, new number) | The acceptance token was sent to old number. Servicer must update their phone number via a kiosk or by contacting support. Stale tokens expire in 30 min. |
| EC-O13 | Buyer has app, servicer has feature phone, AND both are in a dead zone (no signal at all) | L4 scenario: No SMS possible. Fallback to Physical Acceptance Card (§7.2) or Pre-registered PIN (§7.3). Both mechanisms work without any connectivity. Card is scanned offline (QR decoding is local). PIN is validated locally against cached hash. Deal records queued and sync later. |

---

## Appendix A: Degradation Decision Tree

When a Quick Deal is initiated, the system selects the operating layer based on available data:

```
Quick Deal initiated (QR scan or manual)
│
├── Both parties have app + online?
│   └── ✅ L0 — Full online experience
│
├── One party has app, other has feature phone (number known)?
│   ├── Can send SMS to feature phone?
│   │   └── ✅ L1 — SMS-aided acceptance
│   └── No SMS signal?
│       └── Switch to Physical Card or PIN → L4
│
├── Neither has smartphone, but kiosk nearby?
│   └── ✅ L2 — Kiosk-mediated
│
├── Both have app but NO internet?
│   ├── Both devices have cached data?
│   │   └── ✅ L3 — Local-first, sync later
│   └── No cached data?
│       └── Fallback to PIN or Card → L4
│
└── Both have basic phones, no internet?
    └── ✅ L4 — Paper trail (SMS-recordable, photo if available)
```

---

## Appendix B: Kiosk Hardware Minimum Spec

For Phase 2 kiosk deployment:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Android 10+ | Android 12+ |
| RAM | 3GB | 4GB+ |
| Storage | 32GB | 64GB |
| Screen | 6" (phone) / 8" (tablet) | 8" tablet |
| Camera | 8MP rear | 13MP rear |
| Connectivity | 4G LTE + WiFi | 4G LTE + WiFi + Bluetooth 5 |
| Battery | 4000mAh | 6000mAh (all-day operation) |
| Extras | — | Thermal printer (Bluetooth), external battery pack |

**Estimated total cost per kiosk station:**
- Device: ₱6,000–8,000 (Samsung Galaxy Tab A8 or equivalent)
- Thermal printer: ₱1,500–2,500 (if equipped)
- Lamination + card printing: ₱500 (starter pack of 50 cards)
- Mount/stand: ₱500
- Monthly data: ₱500–1,000 (Smart/TNT load)

**Total per kiosk:** ~₱8,500–12,500 (one-time) + ₱500–1,000/mo data

---

## Appendix C: SMS Cost Budget for Offline Deals

Assumptions:
- Offline deal rate: 30% of all Quick Deals (conservative estimate for provincial PH)
- Quick Deal volume: 500/day at Phase 2 scale
- Two SMS per offline deal (offer notification + acceptance confirmation)
- SMS cost: ₱0.80/msg (Semaphore rate, rounded up)

**Monthly SMS cost:**
- Offline deals per day: 500 × 30% = 150
- SMS per deal: 2
- Daily SMS: 300
- Monthly SMS: 300 × 30 = 9,000
- Monthly cost: 9,000 × ₱0.80 = ₱7,200

**Mitigation strategies to reduce SMS cost:**
- Use Physical Acceptance Card or PIN for repeat servicers (₱0 per deal after card issuance)
- Batch SMS notifications where possible (e.g., daily digest for non-urgent)
- Encourage app install for servicers who have smartphones but choose not to use data
- Negotiate Semaphore volume discount at >10,000 SMS/month

---

*End of Offline/Hybrid Deal Specification. This document extends deal-system-spec.md, decision-matrix.md (D24, D27, D28), fulfillment-archetypes.md, and sms.md to cover the full range of device and connectivity scenarios in provincial PH.*
