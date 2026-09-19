# Design: Frontend view-projection kernel

Status: PROPOSED  
Change: `establish-frontend-view-projection-kernel`

## 1. Design objective

Introduce a narrow frontend application boundary so React screens render purpose-specific projections and dispatch typed intents while production Laravel and deterministic Scenario adapters own data acquisition, visibility, authorization simulation, state transitions, persistence, and failures.

## 2. Current-code adaptation

Use the existing `resources/js` tree. Do not create the obsolete `frontend/src` tree referenced by earlier planning.

Initial seams:

```text
resources/js/
  application/
    contracts/
      ids.ts
      viewer.ts
      projections.ts
      actions.ts
      commands.ts
      errors.ts
      MarketplaceGateway.ts
    adapters/
      InertiaMarketplaceAdapter.ts
  scenario/
    schema.ts
    clock.ts
    fixtures/listing-scenarios.ts
    projectors/listingProjector.ts
    commands/dispatchScenarioCommand.ts
    repository/ScenarioRepository.ts
    repository/BrowserStorageAdapter.ts
    review/ScenarioLabPage.tsx
    review/ScenarioProvider.tsx
  features/
    listings/
      ListingDetailScreen.tsx
```

Existing `resources/js/types.ts` remains the transport compatibility boundary during migration. New contracts use canonical camelCase and discriminated resource kinds. The production adapter translates existing snake/camel fields; new feature components do not accept both conventions.

## 3. Contracts

### 3.1 Viewer and relationship

```ts
type ViewerContext = {
    principalAccountId: UserId | null;
    authenticated: boolean;
    capabilityCodes: CapabilityCode[];
    effectiveOwner?: {
        ownerId: UserId;
        resolvedGrantId: ConsentGrantId;
        resolvedGrantVersion: number;
    };
    accessPurpose: 'consumer' | 'reviewer';
};

type ListingRelationship =
    | 'guest'
    | 'member'
    | 'listing_owner'
    | 'acting_agent';

Relationship is derived per resource by a projector. It is not persisted as a mutable active persona.

### 3.2 Listing projection

```ts
type ListingDetailProjection = {
    schemaVersion: 1;
    resource: {
        kind: 'listing';
        id: ListingId;
        sourceVersionIds: ListingVersionId[];
        rowRevision: number;
    };
    viewer: {
        principalAccountId: UserId | null;
        effectiveOwnerId: UserId | null;
        resolvedGrantVersion: number | null;
        accessPurpose: 'consumer' | 'reviewer';
    };
    relationships: readonly ListingRelationship[];
    facts: ListingDetailFacts;
    status: ListingStatusMeaning;
    primaryAction: AvailableListingAction | null;
    secondaryActions: readonly ListingActionDescriptor[];
    recoveryActions: readonly ListingActionDescriptor[];
    meta: ProjectionMeta;
};
```

`ListingDetailFacts` contains only fields visible to the relationship. Owner-only capacity internals or management notes are absent from guest/member projections.

### 3.3 Action registry

The implemented action codes are bounded to the list below and registered centrally. Each code maps to exactly one owner, target kind, explicit command or navigation, payload/result schema, expected row-revision source, and invalidation set:

- `listing.view`
- `listing.save`
- `listing.add_to_picks`
- `listing.begin_booking`
- `listing.request_quote`
- `listing.manage`
- `listing.resume`
- `listing.submit_review`
- `listing.archive`
- `auth.sign_in_to_continue`
- `acting.exit_owner_context`
- `browse.return`
- `scenario.reset`

No Request or Quote action code is introduced in this change. An available action carries a registry target; a disabled educational action carries no target and only an allowlisted non-sensitive reason.

### 3.4 Intent and trusted execution context

```ts
type CommandIntent<C extends ListingCommandCode, P> = {
    action: C;
    targetId: ListingId;
    expectedRowRevision: number;
    idempotencyKey: string;
    payload: P;
};

type ScenarioExecutionContext = {
    principalAccountId: UserId;
    effectiveOwnerId?: UserId;
    resolvedGrantId?: ConsentGrantId;
    resolvedGrantVersion?: number;
    correlationId: string;
    evidenceClass: EvidenceClass;
};
```

The browser supplies only `CommandIntent`. Production derives trusted principal/effective Owner/grant/policy from the authenticated server session and current stores, maps the code to one explicit application command, reloads the authorized target, and reauthorizes below transport. The Scenario adapter derives its execution context from ScenarioRepository—not intent—and applies equivalent deterministic guards. Prior descriptor presence is never authorization.

## 4. Gateway

```ts
interface MarketplaceGateway {
    getListingDetail(query: ListingProjectionQuery): Promise<ListingDetailProjection>;
    dispatch(intent: ListingCommandIntent): Promise<ListingCommandResult>;
}
```

The first implementation provides:

- `InertiaMarketplaceAdapter`, which validates/translates an already-authorized server purpose projection and preserves existing production URLs;
- `ScenarioMarketplaceAdapter`, which projects synthetic repository records locally.

Production Laravel selects permitted data and constructs the projection before Inertia serialization. The browser production composition cannot import/invoke Scenario projectors over production records. If current server props cannot support a fact/action, Laravel omits it or returns safe unavailable state.

## 5. Scenario repository

```ts
type ScenarioSnapshotV1 = {
    schemaVersion: 1;
    scenarioId: ScenarioId;
    dataOrigin: 'synthetic';
    evidenceClass: 'CAPSTONE' | 'SANDBOX' | 'TEAM_TRAINING';
    repositoryRevision: number;
    clock: { now: string };
    review: { perspectiveAccountId: UserId };
    users: Record<UserId, ScenarioUser>;
    capabilities: Record<UserId, CapabilityCode[]>;
    consentGrants: Record<ConsentGrantId, ConsentGrant>;
    listings: Record<ListingId, ScenarioListing>;
    listingVersions: Record<ListingVersionId, ScenarioListingVersion>;
    events: ScenarioEvent[];
    rowRevisions: Record<string, number>;
    idempotencyResults: Record<string, ScenarioCommandResult>;
};
```

Rules:

- fixture modules export deeply immutable, synthetic-origin seed data;
- repository clones seed state on initialization/reset;
- all time comes from `ScenarioClock`;
- storage key includes environment, evidence class, schema version, and scenario ID;
- load/write rejects non-synthetic, corrupt, or incompatible state with explained reset/export recovery;
- commit uses repository revision CAS and writes aggregate/event/idempotency result as one adapter transaction;
- components cannot access repository or storage directly;
- one dispatch validates everything before committing a copied next snapshot;
- idempotency results are retained in repository metadata or events;
- every mutation increments one target aggregate version and appends an attributable event.

## 6. Scenario Lab boundary

The Lab is reachable through a reviewer-only Inertia route or development/review route selected by application configuration. It must:

- show a permanent fictional-data banner;
- identify active scenario and perspective;
- allow only perspectives included in that fixture;
- expose reset and minimal state inspection;
- use a storage namespace distinct from product session/auth state;
- remain absent from consumer navigation;
- make no real mutation HTTP requests.

The Lab may reuse product screen components because those components accept projections. It must not reuse Laravel session identity as its perspective selector.

## 7. Production compatibility

The initial adapter maps `HomeProps.activeListingDetail`, `booking`, `session`, and denial data into `ListingDetailProjection`. Existing server-projected `booking.direct_booking_enabled`, `booking.is_owner`, and `booking.start_url` remain authoritative for the real path.

This change removes business action derivation from `ListingDetailView.tsx`; it does not invent new server permissions. Existing visual composition and URL behavior remain unless the new projection explicitly preserves them.

## 8. Failure model

| Code | Meaning | UI behavior |
| --- | --- | --- |
| `not_found` | Listing absent or undiscoverable | Listing unavailable recovery; no leaked facts. |
| `permission_denied` | Command not allowed for relationship/grant | Explain safe next path; no state/event. |
| `stale_version` | Expected version differs | Require reload/re-review; no state/event. |
| `capability_inactive` | Policy/activation blocks command | Disabled/recovery projection; no synthetic success. |
| `invalid_state` | Lifecycle rejects command | Current state plus allowed recovery. |
| `idempotency_conflict` | Same key, different semantic input | Reject and expose correlation reference. |
| `storage_incompatible` | Persisted schema cannot migrate | Explained scenario reset. |

## 9. Test strategy

- Pure projector tests assert visible serialized fields and exact action codes for guest/member/Owner/Agent.
- Command tests assert permission, grant expiry, expected version, idempotency replay/conflict, event attribution, and atomic no-change failure.
- Adapter tests assert old snake/camel transport values become one canonical projection.
- Component tests assert the screen renders projection actions without recomputing them.
- Playwright verifies production Listing detail and Scenario Lab at desktop and 360–375px, including refresh/reset and no reviewer controls in consumer navigation.

## 10. Migration rule

This change is a seam extraction, not a frontend rewrite. Migrate one production Listing detail path and one deterministic Listing scenario. Leave unrelated Home, auth, onboarding, Browse, and My Listings behavior unchanged. The next OpenSpec change owns Listing/Request Browse discrimination and Request detail.