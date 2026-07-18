# Serbizyu — Unified Inbox & Messaging Architecture
*Conversation model, token binding, shared vs. per-user channels, and the inbox experience across roles. Phase 1 in-app messaging → Phase 2 channel adapters.*

---

## 1. The Core Insight

Serbizyu's messaging is NOT a separate chat app bolted onto a marketplace. It's a **channel-agnostic conversation layer** that sits between the Work engine (orders/offers) and the channel adapters (Messenger, SMS, in-app). One conversation, many channels, bound by a short token — the channel is metadata, not a separate inbox to check.

The same conversation infrastructure serves both the buyer and the servicer. The data model, token resolution, and message store are shared. What differs is context: a servicer sees their jobs and bids; a buyer sees their orders and requests. Same inbox, different lens.

---

## 2. Conversation Model

### Data Shape

```
Conversation
  ├── id
  ├── context_type: 'offer' | 'order' | 'request' | null
  ├── context_id: polymorphic FK to the Offer/Order/Request
  ├── participants: [buyer_id, servicer_id]
  ├── token: 6-char Crockford base32 (no I, L, O, U)
  ├── status: 'active' | 'resolved' | 'archived'
  └── created_at, updated_at

Message
  ├── id
  ├── conversation_id
  ├── sender_type: 'user' | 'system'
  ├── sender_id: user_id or null (system messages)
  ├── body: text
  ├── channel: 'app' | 'messenger' | 'sms' | 'system'
  ├── platform_message_id: unique per channel (idempotency key)
  ├── delivered_at, read_at (nullable)
  └── created_at
```

**Key design decisions:**

1. **Channel is metadata on the message, not a routing concern on the conversation.** A single thread can contain messages from multiple channels. The participant doesn't care how the message arrived — they see it in one place.
2. **Context is polymorphic.** A conversation can be bound to an Offer (pre-booking inquiry), an Order (active work), or a Request (bidding discussion). This lets the inbox show relevant context cards.
3. **Tokens are short-lived but reusable.** 72-hour expiry, renewable on new activity. A token can be replied to multiple times within its life.
4. **No separate buyer inbox table, no separate servicer inbox table.** One `conversations` table, filtered by `participants`.

---

## 3. Token-Based Conversation Binding

Every outbound message from Serbizyu carries a short reference token. Inbound messages extract the token and resolve back to the correct conversation.

### Token Format

- 6 characters, Crockford base32 alphabet (excludes I, L, O, U; case-insensitive)
- Example: `7KX2`, `A3F9P`, `MNQ5T`
- Stored in `conversation_tokens` table: token, conversation_id, expires_at (72h), single_use flag (off by default)

### Token Resolution Order (per messenger.md §Inbound)

When a webhook arrives:

1. **Postback payload** — `conv:{token}` embedded in a button we sent (highest confidence)
2. **Text pattern match** — `/^BOOK\s+([A-Z0-9]{6})$/i` (e.g., "BOOK 7KX2")
3. **Existing open conversation** — matched by sender PSID/phone number, most recent, within 24h
4. **None** — create new unbound conversation, hand to onboarding/intake flow

### Token Embedding

| Channel | How the token travels |
|---|---|
| In-app | Implicit — conversation ID is the direct reference, no token needed |
| Messenger | Postback button payload or text pattern `BOOK {token}` |
| SMS | Text body: `Reply BOOK {token} to inquire` |
| Facebook (outbound-only) | Not applicable — comments are out of scope v1 |
| Email | Subject line reference or link with token param |

---

## 4. Shared vs. Per-User Channels

### Current Reality (Phase 1–2)

Serbizyu operates **shared platform channels**, not per-user channel accounts:

| Channel | Account | Notes |
|---|---|---|
| Messenger | One Serbizyu Page | All user conversations route through the shared Page |
| SMS | One Semaphore sender (`SERBIZYU`) | All outbound SMS from the platform number |
| In-app | Per-user sessions | Unlimited, no external API constraints |
| Phone number | Per-user (phone-first signup) | Easier to manage individually; used for OTP + account identity |

**How shared channels filter to the right user:** Every outbound message embeds a conversation token. Every inbound message is token-resolved back to the right conversation. The platform account is the pipe; the token is the address.

### Future: Per-User Channel Credentials

The `channel_credentials` table already supports per-user credentials (`user_id` FK). When a servicer connects their own Messenger Page or SMS number, their outbound messages use their own account. The conversation token still binds everything.

**When this matters:** Multi-town expansion, different industries, or when a servicer's volume justifies a dedicated channel.

### Profile Channel Links (Current)

Even without per-user channel accounts, servicers can display **external channel links** on their profile:
- "Chat me on Messenger" → `m.me/{servicer_personal_page}`
- "Call / SMS" → `tel:{servicer_phone}`
- These redirect the buyer OUTSIDE Serbizyu — the conversation won't appear in the unified inbox unless the buyer comes back through a token-bearing link.

---

## 5. In-App Messaging (Phase 1 — Sprint 5)

### What ships in Phase 1

- In-app messages only — no external channel bindings
- Reverb broadcasting for real-time delivery
- TanStack Query for live updates on the frontend
- Events: `MessageReceived`, `OrderCreated`, `WorkStatusChanged`, `EscrowReleased`
- Conversation context: Offer or Order

### What does NOT ship in Phase 1

- Messenger/SMS channel adapters (Phase 2)
- Token-based inbound resolution (unnecessary without external channels)
- Channel badges on messages (all messages are `channel: 'app'`)

### Phase 1 Inbox Behavior

- Buyer in an active order: inline chat on the tracking screen (05-track.html), or inbox if accessed
- Servicer with active jobs: inbox shows all conversations across all jobs
- No external messages arrive yet — everything is in-app

---

## 6. Channel Messaging (Phase 2 — Epic E1)

### What unlocks

- `MessengerAdapter` and `SmsAdapter` go live
- Shared platform credentials (one Page token, one Semaphore key)
- Outbound: booking confirmations, status updates, reminders via channel
- Inbound: replies arrive via webhook, token-resolved, appended to the conversation
- Channel badges appear on messages: `messenger`, `sms`, `app`, `system`
- The inbox becomes truly unified — one thread, any channel

### 24-Hour Rule Constraint (Messenger)

Meta's 24-hour messaging window is the critical constraint. Free-form messages only within 24h of the user's last message. Outside the window, only Message Tags allowed:
- `POST_PURCHASE_UPDATE` — booking confirmations, status changes
- `CONFIRMED_EVENT_UPDATE` — appointment reminders
- Every outbound notification type must map to a legal tag in `config/channels.php`

### SMS Constraint

- 160-character discipline enforced by `SmsAdapter`
- Adapter truncates title/description, never the token or URL
- Cost: ~₱0.60–1.00 per 160-char segment
- Transactional messages always send; marketing requires opt-in consent

---

## 7. The Unified Inbox UI

### Role-Agnostic Infrastructure

Both buyer and servicer use the same inbox screen (12-inbox.html). The conversation data is the same. What differs:

| Aspect | Buyer View | Servicer View |
|---|---|---|
| Conversations shown | Orders they booked, requests they posted | Jobs assigned to them, bids they submitted |
| Context cards | Order status, tracking link | Job status, payout visibility |
| Primary action | "Track order" / "Release escrow" | "View active job" / "Submit proof" |
| Channel badges | Same — metadata only | Same — metadata only |

### Tabbar Behavior (Mockup Reference)

| Screen Group | Inbox Tab | Rationale |
|---|---|---|
| 01–04 (browse/search/offer/book) | `<div>` unclickable | Casual browsing — no active conversation yet |
| 05–07 (track/release/review) | `<div>` unclickable | Inline order chat serves the same purpose; unified inbox is for multi-conversation management |
| 18, 21 (post request, compare bids) | `<a>` → inbox | Active poster managing bids and conversations |
| 08–13 (servicer flow) | `<a>` → inbox | Servicer always manages multiple conversations |
| 19–20 (browse requests, submit bid) | `<a>` → inbox | Servicer in active bidding |

### "One Thread, Any Channel" Card

The inbox includes an explainer card (mockup line 16):
> One thread, any channel — Messenger replies, SMS texts, and in-app chats all land in the same Conversation, bound via embedded tokens (BOOK 7KX2). Channel is metadata, not a separate inbox to check.

---

## 8. Conversation Lifecycle

```
[No conversation]
    │
    ├── Buyer books an Offer ──────► [Conversation bound to Order]
    ├── Buyer posts a Request ──────► [Conversation bound to Request]
    ├── Servicer submits a Bid ─────► [Conversation bound to Request]
    ├── External message arrives ───► [Token resolved → Conversation found]
    └── External message, no token ─► [Unbound conversation → intake flow]

[Active conversation]
    │
    ├── Order completed ──────► status: 'resolved'
    ├── Request accepted ──────► rebinds to new Order
    ├── 30 days no activity ───► status: 'archived'
    └── Participant blocked ───► conversation frozen, messages held

[Resolved/Archived]
    │
    └── Read-only, retained for dispute evidence + audit trail
```

---

## 9. Channel Fallback & Degradation

If a channel adapter fails (rate limit, token expiry, API restriction):

1. Mark channel `degraded` on the conversation
2. Fall back to in-app notification for the affected message
3. Retry with exponential backoff (1s → 5min max)
4. After 3 consecutive failures, alert ops dashboard
5. Staff can manually rebind a conversation from one channel to another (e.g., Messenger restricted → SMS)

The Conversation model is channel-agnostic, so rebinding does not lose message history.

---

## 10. What the Mockup Gets Right (and the One Fix)

### Correctly Represented

- Token-bound conversations (7KX2 example)
- Channel badges as metadata (messenger, app, sms, system)
- One thread containing messages from multiple channels
- "One thread, any channel" concept card
- Inbox tab clickable for servicer screens, unclickable for casual buyer browsing
- Inbox tab clickable for active posters (screens 18, 21)

### Fixed

- Stage label was "Servicer 5/6 — Unified Inbox" → now just "Unified Inbox"
- The inbox is shared infrastructure, not a servicer-only feature

---

## 11. Testing Strategy

### Phase 1 (In-App Only)

- Contract: Conversation creation on order booking; message append; Reverb broadcast received by both participants
- Idempotency: duplicate message send → one row

### Phase 2 (Channel Adapters)

- Contract per channel: signature verification, token resolution order, message parsing
- Idempotency: same webhook `mid`/`message_id` delivered twice → one message (unique index on platform_message_id)
- Sandbox: Meta test users + test page for Messenger; Semaphore test mode for SMS

---

## 12. Relationship to Other Docs

| Document | Relationship |
|---|---|
| `connector-architecture.md` | Defines the `ChannelAdapter` interface this inbox consumes |
| `channels/messenger.md` | Messenger adapter spec — token resolution, 24h rule, webhook |
| `channels/sms.md` | SMS adapter spec — 160-char discipline, cost model |
| `phased-build-plan.md` | Sprint 5 (in-app messaging), Epic E1 (channel adapters) |
| `mockup/screens/12-inbox.html` | The UI reference implementation |

---

*End of Unified Inbox spec. One conversation model, token-bound, channel-agnostic. Shared platform channels filtered by token; in-app unlimited. Same inbox infrastructure, buyer and servicer views.*
