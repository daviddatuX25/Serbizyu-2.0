# Channel Spec: SMS via Semaphore (Messaging + Notifications)
*Adapter: `SmsAdapter`. Direction: bidirectional. Phase 2. The reach-everyone channel: works on any phone, any signal.*

## Credentials
- Semaphore API key (account approved, sender name registered; registration takes days, file in Phase 0)
- Sender name: `SERBIZYU` (11 char max, must be registered)

## Outbound: sends
- `POST https://api.semaphore.co/api/v4/messages` with apikey, number, message, sendername
- **160-char discipline is the adapter's job.** Format:
  ```
  {Title} - {price}
  {Town}. Reply BOOK {token} to inquire.
  {shortUrl}
  ```
  The adapter truncates the title, never the token or URL.
- Bulk sends: use the bulk endpoint with per-recipient tokens baked into each message.
- Rate: 10 msg/sec default. The shared RateLimiter enforces it; queue absorbs bursts.

## Inbound: parseInboundWebhook
- Semaphore webhook (set in their dashboard): receives `number`, `message`, `message_id`, `timestamp`
- Token resolution: `/^BOOK\s+([A-Z0-9]{6})$/i` → conversation; else match sender's phone to an open conversation; else onboarding flow reply with instructions
- Signature: Semaphore has no webhook signing. Restrict by shared secret query param on the webhook URL + IP allowlist if their docs support it. Log everything.

## Token Format
- 6 chars, Crockford base32 (no I, L, O, U; case-insensitive). `conversation_tokens` table: token, conversation_id, expires_at (72h), single-use flag off (a token can be replied to repeatedly within its life).
- Generated when an offer is distributed via SMS or when a booking confirmation is sent.

## Cost Model
- Per-segment pricing (about ₱0.60 to ₱1.00 per 160 chars). Notifications policy: transactional messages (booking confirmations, status changes, OTP) always send. Marketing messages require explicit opt-in consent recorded in `servicer_channel_consents` (buyers get their own consent flag).
- Cost monitoring: daily spend metric on the analytics dashboard. Alert at configurable threshold.

## Failure Handling
- Semaphore returns per-message status. Failed sends retry 3x with backoff, then mark conversation channel `degraded` and fall back to in-app notification.
- Delivery reports arrive asynchronously; update message status on receipt.

## Tests
- Contract: message truncation never cuts token/URL; token regex matches case-insensitively; Crockford alphabet enforced
- Idempotency: unique index on Semaphore `message_id`
- Sandbox: Semaphore test mode (no real send) for CI
