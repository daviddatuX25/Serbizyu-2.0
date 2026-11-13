# Synthetic commerce presentation runbook

This is a **local, English-language synthetic presentation**, not approval for a Tagudin pilot, live payment, or physical fulfillment. The application records cash reports and recipient acknowledgements; it does not prove that cash changed hands.

## Safety first

- Do not migrate, reset, seed, roll back, or use the ordinary `serbizyu` database for this presentation. Two migrations and fixture upserts accidentally reached it during QA; see the incident and backup-reconciliation notes in [the implementation handoff](planning-hardening/39-controlled-pilot-implementation-handoff.md#17-synthetic-commerce-presentation-pass).
- Use only the two named `serbizyu_pilot_qa_*` databases and their matching private storage roots below. `GET /` can upsert demo fixtures, so opening a server pointed at the ordinary database is not read-only.
- Never commit passwords, `.env`, database dumps, private evidence, or the `/tmp` access files. These synthetic databases, their evidence, and passwords are local state and are **not** supplied by a Git clone. The existing `ControlledPilotQaSeeder` creates a baseline proposal, not the completed Orders and product state described here; do not reseed the retained databases to recreate them.
- Stop if a preflight check shows the wrong database or missing storage; do not try a migration or seeder to repair it. The same rule applies if the private password files or the retained databases have been lost.

## Local environment and access

Start the existing Sail services if needed with `vendor/bin/sail up -d`. For this workstation, the app container address was `172.20.0.4`; check it with `vendor/bin/sail exec -T app hostname -i`. Container addresses can change. Ports 8102 and 8103 are isolated QA PHP listeners, not the normal web server. Use separate browser profiles or private windows for the two previews to avoid sharing XSRF cookies.

For the current ZeroTier address, the demo forwards are:

| Preview | Address for a trusted ZeroTier participant |
|---|---|
| Service/catalog | `http://192.168.192.141:8102/auth/sign-in` |
| Product | `http://192.168.192.141:8103/auth/sign-in` |

The host-side forwards bind only to `192.168.192.141`; the device opening them must be able to reach that ZeroTier interface. Port 8080 is the ordinary web service and is not the isolated demo. The forwarding and application connections use plain HTTP, so use synthetic credentials only and do not expose the preview to untrusted users or networks.

If the forwards have stopped, first follow the listener checks below and confirm the current container IP. Then run each command in a separate terminal, replacing the container IP if it changed; leave the terminals open:

```bash
socat -d -d TCP-LISTEN:8102,bind=192.168.192.141,reuseaddr,fork TCP:172.20.0.4:8102
socat -d -d TCP-LISTEN:8103,bind=192.168.192.141,reuseaddr,fork TCP:172.20.0.4:8103
```

Do not start another forward when its port is already listening. The addresses were checked from the host; connectivity from another device still depends on ZeroTier membership and firewall rules.

| Preview | Database | Private storage inside app container | Credentials on host |
|---|---|---|---|
| Service/catalog | `serbizyu_pilot_qa_catalog_20261112` | `/tmp/serbizyu-controlled-pilot-qa-catalog-20261112` | `/tmp/serbizyu-catalog-qa-access.txt` |
| Product | `serbizyu_pilot_qa_productjourney_20261113` | `/tmp/serbizyu-controlled-pilot-qa-productjourney-20261113` | `/tmp/serbizyu-productjourney-access.txt` |

Read the matching access file locally; it is mode 0600. The role emails are `pilot-f01-buyer@example.test`, `pilot-f01-provider@example.test`, `pilot-f01-merchant@example.test`, and `pilot-f01-maker@example.test` (staff). Passwords may differ between the two databases.

If a listener is not responding, first check the effective database and private root for that exact process. These commands do not migrate or seed:

```bash
vendor/bin/sail exec -T -u root -e APP_ENV=local -e SERBIZYU_ENV=local -e DB_DATABASE=serbizyu_pilot_qa_catalog_20261112 -e APP_CONFIG_CACHE=/tmp/serbizyu-catalog-final-config.php -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-catalog-20261112 app php artisan config:show database.connections.pgsql.database --no-interaction
vendor/bin/sail exec -T app test -d /tmp/serbizyu-controlled-pilot-qa-catalog-20261112

vendor/bin/sail exec -T -u root -e APP_ENV=local -e SERBIZYU_ENV=local -e DB_DATABASE=serbizyu_pilot_qa_productjourney_20261113 -e APP_CONFIG_CACHE=/tmp/serbizyu-product-final-config.php -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-productjourney-20261113 app php artisan config:show database.connections.pgsql.database --no-interaction
vendor/bin/sail exec -T app test -d /tmp/serbizyu-controlled-pilot-qa-productjourney-20261113
```

Only if both checks for a preview succeed and its port is not already serving, run its listener in a terminal. These are foreground processes; leave each terminal open. The direct PHP listener and `variables_order=EGPCS` preserve the explicitly passed environment; do not substitute `artisan serve`.

```bash
# Service/catalog preview, port 8102
vendor/bin/sail exec -T -u root -e APP_ENV=local -e SERBIZYU_ENV=local -e DB_DATABASE=serbizyu_pilot_qa_catalog_20261112 -e APP_CONFIG_CACHE=/tmp/serbizyu-catalog-final-config.php -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-catalog-20261112 -e CACHE_STORE=array -e SESSION_DRIVER=file -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SERBIZYU_PAYMENT_PROVIDER_MODE=disabled -e SERBIZYU_NOTIFICATION_PROVIDER_MODE=disabled -e SERBIZYU_EVIDENCE_PROVIDER_MODE=local app php -d variables_order=EGPCS -S 0.0.0.0:8102 -t public

# Product preview, port 8103; run in a separate terminal
vendor/bin/sail exec -T -u root -e APP_ENV=local -e SERBIZYU_ENV=local -e DB_DATABASE=serbizyu_pilot_qa_productjourney_20261113 -e APP_CONFIG_CACHE=/tmp/serbizyu-product-final-config.php -e LARAVEL_STORAGE_PATH=/tmp/serbizyu-controlled-pilot-qa-productjourney-20261113 -e CACHE_STORE=array -e SESSION_DRIVER=file -e SESSION_COOKIE=serbizyu_product_final -e QUEUE_CONNECTION=sync -e MAIL_MAILER=array -e SERBIZYU_PAYMENT_PROVIDER_MODE=disabled -e SERBIZYU_NOTIFICATION_PROVIDER_MODE=disabled -e SERBIZYU_EVIDENCE_PROVIDER_MODE=local app php -d variables_order=EGPCS -S 0.0.0.0:8103 -t public
```

These listeners are for a controlled local presentation. They are not hardened or intended to be exposed to an untrusted network. Synthetic uploads need the local evidence scanner/outbox to run; a newly uploaded file is not immediately proof that scanning or physical fulfillment occurred.

## Walkthrough

Sign in through `/auth/sign-in` using the corresponding ZeroTier preview address. Replace the host IP if it changes.

1. **Service, completed:** In the catalog preview, sign in as the buyer or provider and open `http://192.168.192.141:8102/orders/01a1d1fd-e0cc-70d5-b883-fc3a99109396`. This is service `ORD-00000003`: show accepted agreement, completed Work, buyer sign-off and separately acknowledged synthetic cash. The photo is synthetic evidence, not proof of an actual job.
2. **Product, pending:** In the product preview, sign in as merchant and open `http://192.168.192.141:8103/orders/01a1d254-522c-71e1-a320-fa75228afc96`. This is a different `ORD-00000003`. The merchant's Orders queue shows the proposal needing a response; the buyer's queue shows waiting for the provider. In Stock, the staged state was 3 physical, 1 held, 0 committed and 2 available. Counts change if the presenter advances the Order.
3. **Product, completed:** Open `http://192.168.192.141:8103/orders/01a1d22b-591d-712b-8a45-8d016f2df2a8` as buyer or merchant. `ORD-00000002` records acceptance, custody departure, receipt, and a separate cash report and merchant acknowledgement. Its quantity-two purchase reduced on-hand stock once at custody departure, not again at receipt or payment.
4. **Review:** Open `http://192.168.192.141:8103/listings/01a1d228-f865-73c2-82b1-abd1dd24bc2f`. The synthetic buyer's four-star review was sealed until the merchant submitted feedback. The public listing then showed one four-star review; the merchant's note stayed private. On the completed Order, reopening submitted feedback should show its recorded state rather than a new form.

The current implementation permits review **after payment settlement**, not before the cash report. Request → Quote → Order → Work → cash was exercised in an earlier separate isolated run documented in the handoff; the two retained previews above do not by themselves recreate that earlier run.

## Do not claim as complete

The QA handoff does not qualify cancellation, A3 presence, review-photo publication, physical devices, real camera capture, real money, map pin, visible photo timestamps, voice or video. The reviewed Filipino/Taglish and English pilot content is deferred but remains mandatory before a Tagudin pilot. Listing and review examples are synthetic; rights and local provenance for pre-existing repository photos have not all been established. See the handoff for the actual checks and unresolved issues.
