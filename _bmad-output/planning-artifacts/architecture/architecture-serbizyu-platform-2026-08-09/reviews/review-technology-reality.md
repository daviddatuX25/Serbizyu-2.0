# Technology Reality Review

**Target:** `ARCHITECTURE-SPINE.md` and `PROGRAM-IMPLEMENTATION-PLAN.md`  
**Review date:** 2026-08-09  
**Verdict:** **CONDITIONAL PASS — one high-severity founder decision is required before finalization.**

## Executive finding

The stack table is consistent with the repository's current manifests, lockfiles, container definitions, and official support facts checked for PHP/Laravel. The provider-neutral payment boundary is technically sound. However, the spine marks Xendit as the adopted first real sandbox adapter even though the repository's only Xendit decision-quality source explicitly says the recommendation is not founder-approved or locked, and the canonical rebuilt sources do not select Xendit.

## Stack verification matrix

| Spine claim | Repository/current-source basis | Assessment |
| --- | --- | --- |
| PHP 8.4 | `composer.json` requires `php: ^8.4`; `Dockerfile` uses `php:8.4-fpm-bookworm`; PHP's official support table keeps 8.4 in active support through 2026-12-31 and security support through 2028-12-31: https://www.php.net/supported-versions.php | Supported and correctly stated at minor-line altitude. The container tag does not pin a patch/digest, but the spine does not claim one. |
| Laravel Framework 12 | `composer.json` requires `laravel/framework: ^12.0`; the working `composer.lock` resolves v12.65.0. Laravel's official policy supports Laravel 12 on PHP 8.2–8.5, with bug fixes through 2026-08-13 and security fixes through 2027-02-24: https://laravel.com/docs/12.x/releases | Supported and repository-backed. Near-term watch item: the bug-fix window ends four days after this review; this is not an unsupported claim, but upgrade timing should be decided before a long implementation train. |
| Laravel Boost 2.5.3 | `composer.json` requires `laravel/boost: ^2.5`; the working `composer.lock` updates the resolved package from v2.4.13 to **v2.5.3**. `boost.json` configures Boost for this repository. | Exact claim is correct for the reviewed lockfile. It is a development/scaffolding dependency, not a production runtime invariant; future Composer updates can make the architecture row stale. |
| Inertia Laravel / React 3 | `composer.json` requires `inertiajs/inertia-laravel: ^3.0`; the lockfile resolves the Laravel adapter on major 3. `package.json` pins `@inertiajs/react` to 3.6.1 and `package-lock.json` resolves 3.6.1. | Both adapters are on major 3; the combined row is accurate, though two separate rows would remove ambiguity. |
| React 19 | `package.json` and `package-lock.json` pin `react` and `react-dom` to 19.2.8; React 19 types are pinned to the corresponding 19.2 line. | Correct and pinned. |
| PostgreSQL 16 / PostGIS 3.5 | `compose.yaml` uses `postgis/postgis:16-3.5`; Laravel is configured for `pgsql` and the app image installs `pdo_pgsql`. | Correct repository baseline. The Compose image is a mutable family tag rather than a digest, but the spine claims only the major/minor family. |
| Redis 7.4 | `compose.yaml` uses `redis:7.4-alpine`; app configuration selects `phpredis` and Redis-backed session/cache services; the PHP image installs/enables the Redis extension. | Correct repository baseline. The image is minor-family pinned, not patch/digest pinned. |
| Pest 4 | `composer.json` requires `pestphp/pest: ^4.7` and `pestphp/pest-plugin-laravel: ^4.1`; `composer.lock` resolves Pest v4.7.7 and the Laravel plugin v4.1.0; repository test scripts execute Pest. | Correct and supported by executable repository configuration. |

## External-provider verification

### Provider-neutrality: pass

AD-14 defines provider-neutral payment ports, canonical append-only payment events, and adapter mapping. AD-15 requires deterministic fake adapters and contract tests before any network sandbox. AD-16 preserves sandbox/live separation. T7A independently specifies provider-neutral intent, authenticity, status, refund/reversal, release/payout, reconciliation, event-inbox, idempotency, failure, and recovery contracts. This wording does not leak Xendit statuses into Order, Work, Obligation, ledger, or UX state.

### Xendit current evidence

Repository research at `research/serbizyu-xendit-payment-economics-2026-07-31.md` records first-party Xendit evidence for platform-managed sub-accounts, payment acceptance on behalf of sub-accounts, split rules, controlled payouts, refunds, and webhook authentication, citing:

- https://www.xendit.co/en-ph/pricing/
- https://docs.xendit.co/docs/xenplatform-overview
- https://docs.xendit.co/apidocs/

The same source correctly prohibits calling the proposed delayed-payout model legal “escrow” without written Xendit/counsel approval and gates production on onboarding, KYC, product activation, contract, legal, security, reconciliation, refund, and operations evidence. The spine's sandbox-only/non-escrow wording is therefore appropriately bounded.

## Findings

### HIGH — Obtain founder approval before adopting Xendit as the first adapter

**Evidence:** `ARCHITECTURE-SPINE.md` AD-15 labels “Xendit is the first real sandbox adapter” as **[ADOPTED]**, and `PROGRAM-IMPLEMENTATION-PLAN.md` T7B mandates Xendit-specific secrets, signature verification, event mapping, reconciliation, degradation handling, and a sandbox exit test. The spine's listed canonical rebuilt sources do not select Xendit: the rebuilt PRD, UX, domain, schema, ADR, and epics remain provider-neutral, while the only repository source that evaluates Xendit (`research/serbizyu-xendit-payment-economics-2026-07-31.md`, lines 3 and 54–56) explicitly says it is “not yet a founder-approved product decision” and “not locked by this research note.”

**Impact:** Finalizing the spine as written converts an evidence-backed candidate into an adopted implementation dependency outside the stated authority chain; T7B implementers would be required to build the Xendit adapter without the founder decision the source itself requires.

**Action — founder input required, not an autofix:** either (1) record explicit founder approval and propagate a canonical provider-selection ADR that cites the verified Xendit source and preserves every G6/live-money gate, or (2) change AD-15/T7B to “selected provider sandbox adapter” and leave Xendit as the current candidate until that decision exists. Do not weaken AD-14–16 or the T7A provider-neutral contract.

## Autofix/decision classification

- **Clear autofixes:** none required for stack accuracy.
- **Founder decision required:** Xendit selection/adoption status.
- **Non-blocking maintenance note:** avoid treating Laravel Boost's exact patch as a permanent architecture invariant; the lockfile, not the spine, is the executable patch pin.
