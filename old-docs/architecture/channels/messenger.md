# Channel Spec: Messenger (Messaging + Notifications)
*Adapter: `MessengerAdapter`. Direction: bidirectional. Phase 2. This is the highest-value channel: full booking flow without an app install.*

## Credentials
- Same Meta App as Facebook Page adapter (shared app, separate Page Access Token usage)
- Webhook verify token (we generate, store in config)
- App Secret for `X-Hub-Signature-256` verification on every webhook
- Permissions: `pages_messaging`, `pages_manage_metadata`
- App Review for `pages_messaging` required before production messaging. File early.

## Webhook
- `POST /webhooks/channels/messenger`
- Verify signature: HMAC-SHA256 of raw body with App Secret
- Events: `messages`, `messaging_postbacks`, `message_deliveries`, `message_reads`
- Must respond 200 within 20 seconds or Meta retries. Queue everything, process async.

## Inbound: parseInboundWebhook
- Extract sender PSID, text or postback payload, timestamp
- Token resolution order:
  1. Postback payload containing `conv:{token}` (from buttons we sent)
  2. Text matching `/^BOOK\s+([A-Z0-9]{6})$/i` (conversation token)
  3. Existing open conversation bound to this PSID (most recent, within 24h)
  4. None: create new unbound conversation, hand to onboarding bot flow

## Outbound: sends
- Send API: `POST /{page-id}/messages?access_token=...`
- Message types used: text, generic template (booking card: title, price, [Book] [Message] buttons), quick replies (ACCEPT / DECLINE for servicers)
- **24-hour rule is the critical constraint:** free-form messages only within 24h of the user's last message. Outside the window, only Message Tags allowed. We use:
  - `ORDER_UPDATE` tag? Not a real tag. Actual usable tags: `ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE`
  - Booking confirmations and status updates outside 24h: `POST_PURCHASE_UPDATE`
  - Misusing tags gets the app restricted. Map every outbound notification type to a legal tag in `config/channels.php` and review per notification.
- Rate: Meta handles bursts, but keep under 250/sec. Our volumes will never approach this in Phase 2.

## Booking Flow in Messenger (the bot)
1. User clicks ad/QR/link → `m.me/{page}?ref=browse:{town}` → `messaging_referrals` event
2. Bot: generic template with category quick replies
3. User picks category → bot sends up to 5 offer cards (generic templates)
4. User taps Book → create Order + Conversation, send confirmation with order reference
5. Payment: send Xendit checkout link (web view). Return URL carries the conversation token to resume thread.
6. All subsequent status updates flow through the thread (or tagged messages outside 24h)

## Metrics
- Delivery and read receipts from webhook events. Store on `channel_metrics` per message.

## Fallback
- If messaging is restricted: SMS adapter covers the same flows. The Conversation model is channel-agnostic, so rebinding a conversation from Messenger to SMS is a supported operation.

## Tests
- Contract: signature verification rejects tampered bodies; token resolution order; postback parsing
- Idempotency: same webhook `mid` delivered twice creates one message (unique index on platform message ID)
- Sandbox: Meta test users + test page for full round-trip without real customers
