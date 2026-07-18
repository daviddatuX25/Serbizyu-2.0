# Channel Spec: TikTok (Distribution)
*Adapter: `TikTokAdapter`. Direction: outbound + metrics. Phase 3. The only adapter where content generation is a pipeline stage, not a prerequisite.*

## Credentials
- TikTok for Business developer app, Client Key, Client Secret
- OAuth 2.0 user authorization: `video.upload`, `video.publish`, `user.info.basic` scopes
- Access token (24h) + refresh token (long-lived). Refresh job runs daily.

## The Two-Job Publish Pipeline
TikTok only publishes video. A listing is not a video. So publishing is two queued jobs:

1. `GenerateVideoAsset(offerId, channelId)`
   - Marketing Asset Generator produces a 9 to 15 second vertical clip: servicer photos as slideshow, title/price/town as text overlay, brand end card with QR/link
   - Tooling: ffmpeg or a canvas-based renderer. Templates per archetype (dispatch offers get map stills, food offers get photo-forward)
2. `PublishToTikTok(videoAssetId, contentQueueId)`
   - `POST /v2/post/publish/video/init/` (FILE_UPLOAD source), upload chunks, poll status

## Outbound: normalizeOffer
```
Payload:
  video: generated asset
  caption: hook first (not title). "POV: your aircon dies in Candon summer" > "Aircon cleaning services"
  privacy_level: PUBLIC_TO_EVERYONE (requires approved posting permission; else SELF_ONLY until audit)
```

## Content Review Reality
- Unaudited apps post as SELF_ONLY (private). Public posting requires TikTok's posting permission approval. Budget 2 to 4 weeks. Until approved, the adapter runs in draft mode and staff post manually.
- Rate limit assumption: 6 posts/day/account, conservative. ToS risk on automation is the highest of any channel.

## Metrics (fetchMetrics)
- Video insights via Research API or Business API: views, likes, comments, shares
- Attribution: link in bio only (no link stickers for normal accounts). UTM on the bio link + "how did you hear about us" on booking form. Imperfect attribution is the accepted cost of this channel.

## Inbound
- None. TikTok DMs are not available via API for this use case. CTA always points to Messenger/SMS/site.

## Fallback
- Manual posting SOP: curator dashboard renders the generated video + caption for staff to post from the brand phone. The generation pipeline is channel-independent, so the asset is never wasted.

## Tests
- Contract: upload init/chunk/status flow; token refresh rotation; caption length limits (2,200 max, we target under 150)
- No real publish in CI. Mock the status polling states (processing, published, failed)
