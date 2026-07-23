# Serbizyu — Connector Architecture
*Unified adapter pattern for messaging (bidirectional) and distribution (outbound + metrics). One adapter per channel, two consumers.*

---

## 1. The Core Insight

Distribution and Messaging are the same integration, viewed from opposite directions:
- **Distribution** normalizes an Offer into a platform payload and publishes it.
- **Messaging** normalizes a platform webhook into a Conversation message and routes it.

One adapter per channel serves both. This halves the integration surface and ensures that a channel we can post to is automatically a channel we can receive replies from.

---

## 2. Adapter Interface (Conceptual)

Every channel adapter implements a single interface with five responsibilities:

```php
interface ChannelAdapter
{
    // Outbound: Distribution
    public function normalizeOffer(Offer $offer): PlatformPayload;
    public function publish(PlatformPayload $payload, ChannelCredentials $creds): PublishResult;
    
    // Inbound: Messaging
    public function parseInboundWebhook(Request $request): InboundMessage;
    public function resolveConversation(InboundMessage $message): Conversation;
    
    // Metrics
    public function fetchMetrics(PublishResult $result): ChannelMetrics;
}
```

**Key design decisions:**

1. **No separate "distribution adapter" and "messaging adapter."** One adapter, one credential set, one webhook endpoint per channel.
2. **The platform payload is opaque.** The adapter returns a `PlatformPayload` value object; the orchestrator doesn't inspect it. This keeps the interface small and the adapter deep (per codebase-design vocabulary).
3. **Inbound resolution is token-based.** Every outbound message from Serbizyu carries a short reference (conversation token or order ID). The adapter embeds it in a deep link or message body. Inbound webhooks extract it and resolve back to the right Conversation.

---

## 3. Channel Registry

| Channel | Adapter | Outbound | Inbound | Metrics | Phase |
|---|---|---|---|---|---|
| Facebook Page | `FacebookAdapter` | ✅ | ✅ (Messenger) | ✅ | 2 |
| Facebook Group | `FacebookGroupAdapter` | ✅ | ❌ | ⚠️ (limited) | 2 |
| Messenger | `MessengerAdapter` | ✅ | ✅ | ✅ | 2 |
| SMS (Semaphore) | `SmsAdapter` | ✅ | ✅ | ⚠️ (delivery only) | 2 |
| TikTok | `TikTokAdapter` | ✅ | ❌ | ✅ | 3 |
| YouTube | `YouTubeAdapter` | ✅ | ❌ | ✅ | 3 |
| Google Business | `GoogleBusinessAdapter` | ✅ | ❌ | ✅ | 3 |
| Shopee | `ShopeeAdapter` | ✅ | ✅ | ✅ | 3+ |
| Lazada | `LazadaAdapter` | ✅ | ✅ | ✅ | 3+ |
| Email | `EmailAdapter` | ✅ | ❌ | ✅ | 2 |

**Note:** Facebook Page and Messenger are separate adapters because they use different Meta APIs and credential types, even though they share the Meta platform. Facebook Group is separate because the Graph API for groups has different permissions and rate limits.

---

## 4. Adapter Deep Dive: Facebook/Messenger

### Credentials
- Page Access Token (long-lived, stored encrypted)
- App Secret (for webhook signature verification)
- Page ID, App ID

### Outbound (Distribution)
```php
class FacebookAdapter implements ChannelAdapter
{
    public function normalizeOffer(Offer $offer): PlatformPayload
    {
        return new PlatformPayload([
            'message' => $this->formatCaption($offer),
            'link' => $offer->publicUrl(),
            'picture' => $offer->primaryImageUrl(),
            'published' => false, // draft first, human approves
        ]);
    }
    
    public function publish(PlatformPayload $payload, ChannelCredentials $creds): PublishResult
    {
        // POST /{page-id}/feed
        // Returns post_id, permalink_url
    }
}
```

### Inbound (Messaging)
```php
class MessengerAdapter implements ChannelAdapter
{
    public function parseInboundWebhook(Request $request): InboundMessage
    {
        // Verify X-Hub-Signature-256
        // Parse messaging[0].message.text or messaging[0].postback
        // Extract conversation token from ref parameter or message text pattern
    }
    
    public function resolveConversation(InboundMessage $message): Conversation
    {
        // Look up by sender PSID + token
        // If no token, create new Conversation with channel binding
    }
}
```

### Metrics
- Post insights: reach, clicks, reactions
- Message delivery: sent, delivered, read

---

## 5. Adapter Deep Dive: SMS

### Credentials
- Semaphore API key
- Sender name (registered with Semaphore)

### Outbound
```php
class SmsAdapter implements ChannelAdapter
{
    public function normalizeOffer(Offer $offer): PlatformPayload
    {
        $token = $this->generateConversationToken($offer);
        return new PlatformPayload([
            'message' => "{$offer->title} — {$offer->shortPrice()}\n"
                      . "Reply BOOK {$token} to inquire.\n"
                      . "Or visit: {$offer->shortUrl()}",
            'number' => $this->resolveRecipientPhone($offer),
        ]);
    }
}
```

### Inbound
```php
public function parseInboundWebhook(Request $request): InboundMessage
{
    // Semaphore webhook: { "number": "639...", "message": "BOOK ABC123", ... }
    // Extract token from "BOOK {token}" pattern
}
```

**Constraint:** SMS is 160 characters. The adapter must truncate intelligently, not just cut off.

---

## 6. Adapter Deep Dive: TikTok

### Credentials
- TikTok for Business account
- Client Key, Client Secret, Access Token (OAuth 2.0)

### Outbound
```php
class TikTokAdapter implements ChannelAdapter
{
    public function normalizeOffer(Offer $offer): PlatformPayload
    {
        // TikTok requires video content
        // The Marketing Asset Generator produces a branded video clip
        // from servicer photos + text overlay
        return new PlatformPayload([
            'video_url' => $this->assetGenerator->createVideoClip($offer),
            'caption' => $this->formatCaption($offer),
            'privacy_level' => 'PUBLIC_TO_EVERYONE',
        ]);
    }
}
```

**Note:** TikTok is the only adapter that requires a media generation step before publishing. This is queued as a `GenerateVideoAsset` job, then `PublishToTikTok` job.

---

## 7. Webhook Endpoint Structure

Single entry point, routed by channel:

```
POST /webhooks/channels/{channel}
```

Laravel route:
```php
Route::post('/webhooks/channels/{channel}', [WebhookController::class, 'handle'])
    ->middleware('verify.channel.signature');
```

The `WebhookController`:
1. Resolves the adapter from the channel parameter
2. Calls `adapter->parseInboundWebhook($request)`
3. If the message resolves to an existing Conversation, appends it
4. If not, creates a new Conversation with channel binding
5. Fires `MessageReceived` event for Notifications domain

**Security:** Every adapter verifies platform-specific signatures (Meta's X-Hub-Signature-256, Semaphore's API key in header, etc.). The middleware rejects invalid signatures before the adapter runs.

---

## 8. Credential Vault

**Storage:** `channel_credentials` table, encrypted with Laravel's `Crypt` (AES-256-GCM).

```php
Schema::create('channel_credentials', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained(); // servicer who connected
    $table->string('channel'); // facebook, messenger, sms, tiktok
    $table->text('credentials'); // encrypted JSON
    $table->timestamp('connected_at');
    $table->timestamp('expires_at')->nullable();
    $table->timestamp('revoked_at')->nullable();
    $table->timestamps();
});
```

**Rotation:** Facebook/Messenger tokens expire. The adapter checks `expires_at` and triggers a refresh job 7 days before expiry. If refresh fails, the channel is marked `needs_reauth` and the servicer is notified.

---

## 9. Rate Limiting & Backoff

Every adapter respects platform limits via a shared `RateLimiter` service:

```php
class RateLimiter
{
    public function attempt(string $channel, callable $operation): mixed
    {
        $key = "rate_limit:{$channel}";
        $limit = config("channels.{$channel}.rate_limit");
        
        return RateLimiter::attempt($key, $limit, $operation);
    }
}
```

**Limits (config-driven):**
- Facebook: 200 calls/hour per user
- Messenger: 1000 messages/second (Meta handles burst)
- SMS: 10 messages/second (Semaphore default)
- TikTok: 6 posts/day (conservative, to avoid review)

**Backoff:** Exponential, starting at 1s, max 5min. After 3 consecutive failures, the adapter marks itself `degraded` and alerts the ops dashboard.

---

## 10. Testing Strategy per Adapter

**Contract tests (mocked external API):**
- `test_normalize_offer_returns_valid_payload`
- `test_publish_returns_publish_result_with_id`
- `test_parse_inbound_webhook_extracts_message_and_token`
- `test_resolve_conversation_finds_or_creates_conversation`
- `test_fetch_metrics_returns_channel_metrics`

**Integration tests (sandbox where available):**
- Facebook: Meta Graph API Explorer for manual verification
- SMS: Semaphore test mode (no actual SMS sent)
- TikTok: TikTok Developer sandbox

**Idempotency tests:**
- Same webhook received twice → one message in database
- Same publish retried → one post on platform (idempotency key where supported)

---

## 11. Adding a New Channel

**Checklist for adapter #8:**
1. Create `App\Domains\Distribution\Adapters\{Channel}Adapter`
2. Implement `ChannelAdapter` interface
3. Register in `config/channels.php`
4. Add webhook signature verification to `VerifyChannelSignature` middleware
5. Add rate limit config
6. Add contract tests
7. Add credential fields to `channel_credentials` seeder
8. Add channel icon to `ChannelIcon` component
9. Update `ChannelAdapterFactory` if any custom resolution needed
10. Document in `docs/channels/{channel}.md`

**Time estimate:** 2–3 days for a standard REST API channel. 1 week for OAuth + media-heavy channels (TikTok, YouTube).

---

## 12. The Deep Module Test

Using codebase-design vocabulary, the ChannelAdapter is a **deep module**:
- **Interface:** 5 methods, 3 value objects (PlatformPayload, PublishResult, InboundMessage)
- **Implementation:** API clients, retry logic, credential refresh, payload formatting, webhook parsing, metrics normalization
- **Leverage:** The orchestrator and the messaging router each learn one interface. N adapters pay back across 2 consumers.
- **Locality:** A Facebook API change lives in `FacebookAdapter`. No other file knows what Graph API version we're on.

**The deletion test:** If we delete `TikTokAdapter`, the complexity of TikTok's OAuth flow, video upload, and content review status polling vanishes. It doesn't reappear in the orchestrator or the messaging router. That's a real adapter.

---

*End of Connector Architecture. One adapter per channel, two consumers, five responsibilities, zero leaked platform details.*
