# First-Slice Architecture Seam Decision

Date: 2026-08-02
Evidence class: CAPSTONE / TEAM_TRAINING
Scope: local/mock connected first slice

Status: RECONCILED — canonical Listings persistence seam is active

## Observed call path

The live HTTP path is:

```text
ListingController
  -> Listings application actions/queries
      -> ListingCommandStore / PublicListingReader
          -> Infrastructure ListingRepository
              -> Listing model + Query Builder + DB/Schema/Str
              -> listings, listing_versions, idempotency_keys,
                 audit_events, outbox_messages
```

The current code has one active concrete adapter: `ListingRepository`. It satisfies both application contracts and is bound in `AppServiceProvider`:

- `ListingCommandStore` for create, update, submit, and denial recording;
- `PublicListingReader` for public list and detail projections.

The application layer contains no `DB::`, `Schema::`, `Illuminate\\Database`, or `ListingRepository` persistence imports. Laravel persistence, transaction boundaries, row locks, version checks, idempotency replay, audit/outbox writes, and projection mapping are concentrated in the Infrastructure adapter.

The former `FirstSliceListingService` path is not present in the live application tree. This document supersedes the pre-refactor observation that described it as the active implementation.

## Boundary result

The seam now has one implementation and two intentionally narrow interfaces. The adapter preserves the established behavior:

- idempotency scope is `listing.submit:<listing-id>:<owner-id>`;
- request fingerprints reject reuse of a key for different submission semantics;
- successful responses are stored and replayed;
- listing versions are immutable and stale writes return `VERSION_CONFLICT`;
- submission writes the `listing.submit_review` audit action and `listing.submitted_for_review` outbox event in the transaction;
- public projections include only active/approved listings and omit owner-private data;
- protected owner actions record `listing.protected_edit_denied` with a persisted correlation ID.

This is the smallest safe seam for the current local/mock slice. It is not an external/provider gateway, and no second persistence implementation is retained as an active compatibility path.

## PM/Lead decision

The canonical Listings persistence seam is now in place for the working initial version. Keep the two narrow application contracts and the single `ListingRepository` adapter stable while completing acceptance evidence. Do not introduce an external/provider gateway without a real external dependency.

Before the next Listing feature lane:

1. Add contract-level tests for any new command/query behavior at the existing interfaces.
2. Preserve idempotency scope/fingerprint/replay, audit action, outbox event, immutable versioning, authorization denial, correlation IDs, and projection shape.
3. Keep all Eloquent, Query Builder, `DB`, and `Schema` access in Infrastructure.
4. Split the adapter only if a real independent variation appears; do not create a generic CRUD repository or a second parallel implementation.

## Ongoing acceptance checks for the reconciled seam

- `rg`/static call-site audit shows one canonical listing command/query path.
- Exactly one Listings persistence binding/implementation is active.
- Application-layer Listings code contains no `DB::`, `Schema::`, `Illuminate\Database`, or direct persistence queries.
- Focused Pest coverage proves create/update/submit/replay/stale-version and denial behavior before and after the seam change.
- Focused behavior and contract tests prove atomic state/version/audit/outbox/idempotency behavior through the application contracts.
- Browser smoke remains green for auth/challenge/refresh, draft/submit, public browse/detail, denial, and recovery.
- PHPStan, Pint, frontend checks, and OpenSpec strict validation remain green.
- Audit/outbox/idempotency evidence shows unchanged event/action/scope semantics.

The seam reconciliation is complete, but this is not a claim that the product is production-ready. The current release remains local/mock CAPSTONE evidence only; remaining acceptance gaps are tracked in the first-slice verification document.
