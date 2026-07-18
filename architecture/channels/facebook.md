# Channel Spec: Facebook Page (Distribution)
*Adapter: `FacebookAdapter`. Direction: outbound + metrics. Phase 2.*

## Credentials
- Meta App (type: Business), App ID, App Secret
- Page Access Token (long-lived, 60 days, refresh via `fb_exchange_token`)
- Page ID
- Required permissions: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
- App Review: required for posts on behalf of pages you don't admin in dev mode. Budget 1 to 2 weeks for review before Phase 2 launch.

## Outbound: normalizeOffer
```
Payload:
  message: caption (title, short price, town, trust line, CTA + public URL)
  link: offer.publicUrl()          // OG card comes from snapshot SSR page
  published: false                 // always draft; curator publishes from dashboard
```
- Caption limits: 63,206 chars, but keep under 250 for feed display. First 125 chars matter most (above the fold).
- Image: pulled from OG tag on the linked snapshot page. No separate upload needed for link posts. Preferred: 1200x630 from Marketing Asset Generator.

## Publish
- `POST /{page-id}/feed` with the payload, `published=true` when curator approves
- Store `post_id` and `permalink_url` on `publish_results`
- Idempotency: our `content_queue.id` as a client-side dedupe key. Meta has no idempotency keys, so a retry must check for an existing `publish_results` row first.

## Metrics (fetchMetrics)
- `GET /{post-id}/insights?metric=post_impressions,post_clicks,post_reactions_like_total`
- Nightly job, store on `channel_metrics`. Clicks feed the orchestrator's channel ROI.

## Rate Limits
- 200 calls/hour/user (app-level throttling headers: `x-app-usage`, `x-page-usage`). Back off at 70% usage.

## ToS Risks
- Automated posting must be human-approved (it is: draft-first). Group posting is a separate adapter and a stricter policy area. Never scrape or auto-join groups.
- Fallback if restricted: curator dashboard exports caption + link, staff posts manually. SOP in ops runbook.

## Inbound
- Not handled here. Comments on posts are out of scope for v1 (monitor via Meta Business Suite). Messenger inbound is `MessengerAdapter`.

## Tests
- Contract: normalize produces valid payload fields; publish handles 200/403/429; metrics parser handles missing insight data
- Webhook: none for this adapter
- Sandbox: Meta Test Pages (create via app dashboard) for integration testing without touching the real page
