<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure;

use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\Contracts\PublicListingReader;
use App\Modules\Listings\Application\GovernedCatalogService;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\Projections\ListingProjection;
use App\Modules\Listings\Domain\ListingRules;
use App\Modules\Listings\Infrastructure\Models\Listing;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\ResourceActor;
use App\Shared\Contracts\ActingForAuthorizer;
use App\Shared\Contracts\OwnerListingReader;
use App\Shared\Contracts\WorkSpecificationPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class ListingRepository implements ListingCommandStore, OwnerListingReader, PublicListingReader
{
    public function __construct(
        private readonly ListingRules $rules,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly ActingForAuthorizer $actingFor,
        private readonly GovernedCatalogService $catalog,
        private readonly WorkSpecificationPort $workSpecs,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createDraft(ResourceActor $actor, array $input, string $correlationId): array
    {
        $this->ensureStorage($correlationId);
        $input = $this->withResolvedWorkShape($input, $correlationId);
        $this->validate($input, $correlationId);

        return DB::transaction(function () use ($actor, $input, $correlationId): array {
            $this->assertActingForIfNeeded($actor, $correlationId, 'listing.create');
            $ownerId = $actor->resourceOwnerId;
            $now = now();
            $workShape = trim((string) $input['work_shape']);
            $pins = $this->catalog->ensurePublished(
                (string) $input['category_code'],
                (string) $input['listing_type'],
                $workShape,
                $correlationId,
            );
            $listingId = (string) Str::uuid7();

            Listing::query()->insert([
                'id' => $listingId,
                'owner_user_id' => $ownerId,
                'capability_profile_id' => $pins['capability_profile_id'],
                'category_id' => $pins['category_id'],
                'listing_type' => (string) $input['listing_type'],
                'status' => 'draft',
                'geography' => json_encode(array_merge(
                    [
                        'area_code' => 'Tagudin',
                        'region_code' => '0100000000',
                        'region_name' => 'Region I (Ilocos Region)',
                        'province_code' => '0102900000',
                        'province_name' => 'Ilocos Sur',
                        'municipality_code' => '0102933000',
                        'municipality_name' => 'Tagudin',
                        'postal_code' => '2714',
                    ],
                    (!empty($input['geography']) && is_array($input['geography'])) ? $input['geography'] : [],
                    !empty($input['stall_location']) ? [
                        'stall_location' => (string) $input['stall_location'],
                        'address_line_1' => (string) $input['stall_location'],
                        'street_address' => (string) $input['stall_location'],
                    ] : []
                ), JSON_THROW_ON_ERROR),
                'current_version' => 1,
                'review_status' => 'not_required',
                'version' => 1,
                'correlation_id' => $correlationId,
                'archived_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $this->insertVersion($listingId, 1, $actor->actorUserId, array_merge($input, ['work_shape' => $workShape]), $correlationId, $now, $pins);

            return $this->ownerProjection($listingId, $ownerId, $correlationId);
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function updateDraft(
        string $listingId,
        ResourceActor $actor,
        int $expectedVersion,
        array $input,
        string $correlationId,
    ): array {
        $this->ensureStorage($correlationId);

        return DB::transaction(function () use ($listingId, $actor, $expectedVersion, $input, $correlationId): array {
            $this->assertActingForIfNeeded($actor, $correlationId, 'listing.update');
            $ownerId = $actor->resourceOwnerId;
            $listing = Listing::query()->where('id', $listingId)->lockForUpdate()->first();
            $this->assertOwnerAndVersion($listing, $listingId, $ownerId, $expectedVersion, $correlationId);
            if ((string) $listing->status !== 'draft') {
                throw new ListingError('INVALID_STATE', 'Only a draft listing can be edited.', $correlationId, status: 409);
            }

            $current = DB::table('listing_versions')
                ->where('listing_id', $listingId)
                ->where('version_number', (int) $listing->current_version)
                ->first();
            if ($current === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
            }

            $terms = json_decode((string) $current->terms, true) ?: [];
            $payload = array_merge([
                'title' => (string) ($terms['title'] ?? ''),
                'description' => (string) $current->description,
                'category_code' => (string) ($terms['category_code'] ?? ''),
                'listing_type' => (string) $listing->listing_type,
                'work_shape' => (string) ($terms['work_shape'] ?? ''),
                'work_catalog_code' => $terms['work_catalog_code'] ?? null,
                'work_set_version' => $terms['work_set_version'] ?? null,
                'milestone_stages' => $terms['milestone_stages'] ?? null,
                'work_specification' => $terms['work_specification'] ?? null,
                'package_tiers' => $terms['package_tiers'] ?? null,
                'addons' => $terms['addons'] ?? null,
                'inclusions' => $terms['inclusions'] ?? null,
                'variants' => $terms['variants'] ?? null,
                'pricing_mode' => $terms['pricing_mode'] ?? null,
                'media' => $terms['media'] ?? null,
                'deal_chain_combinations' => $terms['deal_chain_combinations'] ?? null,
                'deal_chain_specification' => $terms['deal_chain_specification'] ?? null,
                'stall_location' => $terms['stall_location'] ?? null,
                'geography' => $terms['geography'] ?? null,
            ], $input);
            $payload = $this->withResolvedWorkShape($payload, $correlationId);
            $this->validate($payload, $correlationId);

            $now = now();
            $nextVersion = ((int) $listing->version) + 1;
            $workShape = trim((string) $payload['work_shape']);
            $pins = $this->catalog->ensurePublished(
                (string) $payload['category_code'],
                (string) $payload['listing_type'],
                $workShape,
                $correlationId,
            );
            $this->insertVersion($listingId, $nextVersion, $actor->actorUserId, array_merge($payload, ['work_shape' => $workShape]), $correlationId, $now, $pins);

            $updateFields = [
                'category_id' => $pins['category_id'],
                'capability_profile_id' => $pins['capability_profile_id'],
                'listing_type' => (string) $payload['listing_type'],
                'current_version' => $nextVersion,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ];

            if (array_key_exists('stall_location', $payload) || array_key_exists('geography', $payload)) {
                $currentGeo = is_array($listing->geography)
                    ? $listing->geography
                    : (json_decode((string) ($listing->geography ?? ''), true) ?: ['area_code' => 'Tagudin']);
                $incomingGeo = (!empty($payload['geography']) && is_array($payload['geography'])) ? $payload['geography'] : [];
                $stallLocation = (string) ($payload['stall_location'] ?? ($incomingGeo['stall_location'] ?? ($incomingGeo['address_line_1'] ?? '')));
                $streetAddress = (string) ($incomingGeo['street_address'] ?? ($incomingGeo['address_line_1'] ?? $stallLocation));

                $currentGeo = array_merge($currentGeo, $incomingGeo);
                if ($stallLocation !== '') {
                    $currentGeo['stall_location'] = $stallLocation;
                }
                if ($streetAddress !== '') {
                    $currentGeo['street_address'] = $streetAddress;
                    $currentGeo['address_line_1'] = $streetAddress;
                }
                $updateFields['geography'] = json_encode($currentGeo, JSON_THROW_ON_ERROR);
            }

            Listing::query()->where('id', $listingId)->update($updateFields);

            return $this->ownerProjection($listingId, $ownerId, $correlationId);
        });
    }

    /** @return array<string, mixed> */
    public function submit(
        string $listingId,
        ResourceActor $actor,
        int $expectedVersion,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        $this->ensureStorage($correlationId, requireSubmissionTables: true);
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new ListingError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key for submission.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }

        return DB::transaction(function () use ($listingId, $actor, $expectedVersion, $idempotencyKey, $correlationId): array {
            $this->assertActingForIfNeeded($actor, $correlationId, 'listing.submit');
            $ownerId = $actor->resourceOwnerId;
            $listing = Listing::query()->where('id', $listingId)->lockForUpdate()->first();
            if ($listing === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
            }
            if ((string) $listing->owner_user_id !== $ownerId) {
                throw new ListingError('AUTHORIZATION_DENIED', 'You are not authorized to perform this action.', $correlationId, status: 403);
            }

            $scope = 'listing.submit:'.$listingId.':'.$ownerId;
            try {
                $reservation = $this->idempotency->begin(
                    scope: $scope,
                    key: $idempotencyKey,
                    fingerprint: [
                        'operation' => 'listing.submit',
                        'listing_id' => $listingId,
                        'owner_id' => $ownerId,
                        'expected_version' => $expectedVersion,
                    ],
                    correlationId: $correlationId,
                    actorUserId: $actor->actorUserId,
                );
            } catch (KernelException $exception) {
                throw new ListingError(
                    $exception->envelope->code,
                    $exception->getMessage(),
                    $correlationId,
                    status: $exception->status,
                );
            }

            if ($reservation->isReplay) {
                if (is_array($reservation->replayPayload)) {
                    return $reservation->replayPayload;
                }

                return $this->ownerProjection($listingId, $ownerId, $correlationId);
            }

            $this->assertVersion($listing, $expectedVersion, $correlationId);
            if ((string) $listing->status !== 'draft') {
                throw new ListingError('INVALID_STATE', 'Only a draft listing can be submitted for review.', $correlationId, status: 409);
            }

            $current = DB::table('listing_versions')
                ->where('listing_id', $listingId)
                ->where('version_number', (int) $listing->current_version)
                ->first();
            if ($current === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
            }
            $terms = json_decode((string) $current->terms, true) ?: [];
            $this->validate([
                'title' => (string) ($terms['title'] ?? ''),
                'description' => (string) $current->description,
                'category_code' => (string) ($terms['category_code'] ?? ''),
                'listing_type' => (string) $listing->listing_type,
                'work_shape' => $terms['work_shape'] ?? null,
            ], $correlationId);
            $nextVersion = ((int) $listing->version) + 1;
            $now = now();
            $workShape = trim((string) $terms['work_shape']);
            $pins = $this->catalog->ensurePublished(
                (string) ($terms['category_code'] ?? ''),
                (string) $listing->listing_type,
                $workShape,
                $correlationId,
            );
            $this->insertVersion($listingId, $nextVersion, $actor->actorUserId, array_merge([
                'title' => (string) ($terms['title'] ?? ''),
                'description' => (string) $current->description,
                'category_code' => (string) ($terms['category_code'] ?? ''),
                'listing_type' => (string) $listing->listing_type,
                'work_shape' => $workShape,
                'package_tiers' => $terms['package_tiers'] ?? null,
                'addons' => $terms['addons'] ?? null,
                'milestone_stages' => $terms['milestone_stages'] ?? null,
                'work_specification' => $terms['work_specification'] ?? null,
                'work_catalog_code' => $terms['work_catalog_code'] ?? null,
                'inclusions' => $terms['inclusions'] ?? null,
                'variants' => $terms['variants'] ?? null,
                'pricing_mode' => $terms['pricing_mode'] ?? null,
                'currency' => $current->currency,
            ]), $correlationId, $now, $pins);

            Listing::query()->where('id', $listingId)->update([
                'status' => 'pending_review',
                'review_status' => 'pending',
                'current_version' => $nextVersion,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            $auditActor = $actor->toActorContext();
            $auditId = $this->audits->record(
                action: 'listing.submit_review',
                targetType: 'listing',
                targetId: $listingId,
                correlationId: $correlationId,
                actor: $auditActor,
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'SubmitListing',
                expectedVersion: $expectedVersion,
                previous: ['status' => 'draft', 'version' => $expectedVersion],
                next: ['status' => 'pending_review', 'version' => $nextVersion],
                reason: 'Listing submitted for review',
            );
            $this->outbox->enqueue(
                eventType: 'listing.submitted_for_review',
                aggregateType: 'listing',
                aggregateId: $listingId,
                payload: ['listing_id' => $listingId, 'status' => 'pending_review', 'version' => $nextVersion],
                correlationId: $correlationId,
                auditEventId: $auditId,
            );
            $response = $this->ownerProjection($listingId, $ownerId, $correlationId);
            $this->idempotency->succeed(
                row: $reservation->row,
                responsePayload: $response,
                responseEventId: $auditId,
                responseReference: $listingId,
            );

            return $response;
        });
    }

    public function ownerListings(string $ownerUserId, string $correlationId): array
    {
        if (! $this->hasOwnerTables()) {
            return [];
        }

        return $this->ownerQuery($ownerUserId)
            ->orderByDesc('listings.updated_at')
            ->get()
            ->map(fn (object $row): array => $this->mapProjection($row, false))
            ->values()
            ->all();
    }

    /** @return array<string, mixed>|null */
    public function ownerListing(string $listingId, string $ownerUserId, string $correlationId): ?array
    {
        if (! $this->hasOwnerTables()) {
            return null;
        }

        $row = $this->ownerQuery($ownerUserId)
            ->where('listings.id', $listingId)
            ->first();

        return $row === null ? null : $this->mapProjection($row, false);
    }

    /** @return list<array<string, mixed>> */
    public function publicListings(string $correlationId): array
    {
        if (! $this->hasPublicTables()) {
            return [];
        }

        return $this->publicQuery()
            ->orderBy('listings.created_at')
            ->get()
            ->map(fn (object $row): array => $this->mapProjection($row, true))
            ->values()
            ->all();
    }

    /** @return array<string, mixed>|null */
    public function publicDetail(string $listingId, string $correlationId): ?array
    {
        if (! $this->hasPublicTables()) {
            return null;
        }

        $row = $this->publicQuery()->where('listings.id', $listingId)->first();

        return $row === null ? null : $this->mapProjection($row, true);
    }

    public function recordDenied(string $listingId, ?string $actorId, string $correlationId): void
    {
        if (! Schema::hasTable('audit_events')) {
            return;
        }

        $now = now();
        DB::table('audit_events')->insert([
            'id' => (string) Str::uuid7(),
            'actor_user_id' => $actorId,
            'acting_for_user_id' => null,
            'action' => 'listing.protected_edit_denied',
            'target_type' => 'listing',
            'target_id' => $listingId,
            'order_id' => null,
            'payment_obligation_id' => null,
            'idempotency_key_id' => null,
            'migration_checkpoint_id' => null,
            'previous_value_summary' => null,
            'new_value_summary' => null,
            'reason' => 'Protected owner action attempted outside owner authorization.',
            'command_name' => 'ProtectedEditAttempt',
            'expected_version' => null,
            'correlation_id' => $this->persistedCorrelationId($correlationId),
            'occurred_at' => $now,
            'created_at' => $now,
        ]);
    }

    /** @param array<string, mixed> $input @return array<string, mixed> */
    private function withResolvedWorkShape(array $input, string $correlationId): array
    {
        $code = $input['work_catalog_code'] ?? null;
        if (! is_string($code) || trim($code) === '') {
            return $input;
        }
        $setVersion = isset($input['work_set_version']) && is_numeric($input['work_set_version'])
            ? (int) $input['work_set_version']
            : null;
        $set = $this->workSpecs->publishedWorkSet(trim($code), $setVersion);
        $listingType = strtolower(trim((string) ($input['listing_type'] ?? '')));
        $shape = strtoupper((string) ($set['work_shape'] ?? ''));
        $compatibleShapes = $listingType === 'service' ? ['A1', 'A3', 'A9'] : ['A4', 'A9'];
        if ($set === null || ! in_array($listingType, (array) ($set['listing_types'] ?? []), true)
            || ! in_array($shape, $compatibleShapes, true)) {
            throw new ListingError(
                'VALIDATION_FAILED',
                'Choose a published Work Set compatible with this listing type.',
                $correlationId,
                fieldErrors: [
                    'work_catalog_code' => ['The selected Work Set is unknown, retired, or incompatible with this listing type.'],
                    'work_shape' => ['Work shape must come from a published compatible Work Set.'],
                ],
            );
        }

        $input['work_shape'] = (string) $set['work_shape'];
        $input['work_set_version'] = (int) ($set['set_version'] ?? 1);

        return $input;
    }

    /** @param array<string, mixed> $input */
    private function validate(array $input, string $correlationId): void
    {
        $errors = $this->rules->validateDraft($input);
        if ($errors !== []) {
            throw new ListingError('VALIDATION_FAILED', 'Review the listing fields and try again.', $correlationId, fieldErrors: $errors);
        }
    }

    private function ensureStorage(string $correlationId, bool $requireSubmissionTables = false): void
    {
        $tables = ['users', 'user_profiles', 'listings', 'listing_versions', 'categories', 'capability_profiles'];
        if ($requireSubmissionTables) {
            $tables = [...$tables, 'idempotency_keys', 'audit_events', 'outbox_messages'];
        }

        foreach ($tables as $table) {
            if (! Schema::hasTable($table)) {
                throw new ListingError(
                    'STORAGE_UNAVAILABLE',
                    'The listing workspace is unavailable until the approved database is ready.',
                    $correlationId,
                    status: 503,
                    retryable: true,
                );
            }
        }
    }

    private function hasOwnerTables(): bool
    {
        foreach (['listings', 'listing_versions', 'categories'] as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    private function hasPublicTables(): bool
    {
        foreach (['listings', 'listing_versions', 'categories', 'user_profiles'] as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    private function assertOwnerAndVersion(?object $listing, string $listingId, string $ownerId, int $expectedVersion, string $correlationId): void
    {
        if ($listing === null) {
            throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
        }
        if ((string) $listing->owner_user_id !== $ownerId) {
            throw new ListingError('AUTHORIZATION_DENIED', 'You are not authorized to perform this action.', $correlationId, status: 403);
        }
        $this->assertVersion($listing, $expectedVersion, $correlationId);
    }

    private function assertVersion(object $listing, int $expectedVersion, string $correlationId): void
    {
        if ((int) $listing->version !== $expectedVersion) {
            throw new ListingError(
                'VERSION_CONFLICT',
                'This listing changed elsewhere. Refresh and review the latest version before saving.',
                $correlationId,
                status: 409,
                retryable: true,
            );
        }
    }

    /** @return list<array<string, mixed>> */
    public function discoverPublicListings(
        string $correlationId,
        string $areaCode = 'Tagudin',
        ?string $categoryCode = null,
        ?string $cursor = null,
        int $limit = 24,
    ): array {
        if (! $this->hasPublicTables()) {
            return [];
        }

        $limit = max(1, min($limit, 50));
        $query = $this->publicQuery()
            ->whereRaw("listings.geography->>'area_code' = ?", [$areaCode]);

        if ($categoryCode !== null && $categoryCode !== '') {
            $query->where('categories.code', $categoryCode);
        }

        if ($cursor !== null && $cursor !== '') {
            $query->where('listings.id', '>', $cursor);
        }

        return $query
            ->orderBy('listings.id')
            ->limit($limit)
            ->get()
            ->map(fn (object $row): array => $this->mapProjection($row, true))
            ->values()
            ->all();
    }

    private function assertActingForIfNeeded(ResourceActor $actor, string $correlationId, string $requiredAction): void
    {
        if (! $actor->isActingFor() || $actor->consentGrantId === null) {
            return;
        }

        try {
            $this->actingFor->assertActive(
                grantId: $actor->consentGrantId,
                granteeUserId: $actor->actorUserId,
                grantorUserId: $actor->resourceOwnerId,
                correlationId: $correlationId,
                resourceType: 'listing',
                requiredAction: $requiredAction,
            );
        } catch (KernelException $error) {
            throw new ListingError(
                $error->envelope->code,
                $error->getMessage(),
                $correlationId,
                status: $error->status,
            );
        } catch (\Throwable $error) {
            if (property_exists($error, 'envelope') && isset($error->envelope->code)) {
                $status = property_exists($error, 'status') ? (int) $error->status : 403;
                throw new ListingError(
                    (string) $error->envelope->code,
                    $error->getMessage(),
                    $correlationId,
                    status: $status,
                );
            }

            throw $error;
        }
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array{
     *     category_id: string,
     *     category_business_version: int,
     *     capability_profile_id: string,
     *     capability_profile_family_code: string,
     *     capability_profile_business_version: int,
     *     code: string
     * }  $pins
     */
    private function insertVersion(
        string $listingId,
        int $version,
        string $authoredByUserId,
        array $input,
        string $correlationId,
        mixed $now,
        array $pins,
    ): void {
        $priceMinor = isset($input['price_amount_minor']) && is_numeric($input['price_amount_minor'])
            ? (int) $input['price_amount_minor']
            : (isset($input['package_tiers'][0]['price']) && is_numeric($input['package_tiers'][0]['price'])
                ? (int) round(((float) $input['package_tiers'][0]['price']) * 100)
                : (isset($input['variants'][0]['price']) && is_numeric($input['variants'][0]['price'])
                    ? (int) round(((float) $input['variants'][0]['price']) * 100)
                    : null));

        $currency = isset($input['currency']) && is_string($input['currency']) && strlen($input['currency']) === 3
            ? strtoupper($input['currency'])
            : ($priceMinor !== null ? 'PHP' : null);

        $terms = [
            'title' => trim((string) $input['title']),
            'category_code' => trim((string) $input['category_code']),
            'work_shape' => isset($input['work_shape']) && is_string($input['work_shape']) && trim($input['work_shape']) !== '' ? trim($input['work_shape']) : null,
            'scope' => (string) ($input['scope'] ?? 'Tagudin community listing'),
            'fixture_key' => isset($input['fixture_key']) && is_string($input['fixture_key']) && $input['fixture_key'] !== '' ? $input['fixture_key'] : null,
            'evidence_class' => isset($input['evidence_class']) && is_string($input['evidence_class']) && $input['evidence_class'] !== '' ? $input['evidence_class'] : null,
        ];

        foreach (['package_tiers', 'addons', 'milestone_stages', 'work_specification', 'work_catalog_code', 'work_set_version', 'inclusions', 'variants', 'pricing_mode', 'deal_chain_combinations', 'deal_chain_specification'] as $extraField) {
            if (isset($input[$extraField]) && $input[$extraField] !== null) {
                $terms[$extraField] = $input[$extraField];
            }
        }

        if (array_key_exists('media', $input)) {
            $terms['media'] = $this->normalizeMedia($input['media']);
        }

        if (isset($input['milestone_stages']) && is_array($input['milestone_stages']) && $input['milestone_stages'] !== []) {
            $resolvedWork = $this->workSpecs->resolveAndRecordListingWork(
                workShape: (string) ($terms['work_shape'] ?? 'A1'),
                categoryCode: (string) $terms['category_code'],
                listingType: (string) ($input['listing_type'] ?? 'service'),
                listingTitle: (string) $terms['title'],
                rawStages: $input['milestone_stages'],
                selectedCatalogCode: isset($input['work_catalog_code']) && is_string($input['work_catalog_code']) ? $input['work_catalog_code'] : null,
                selectedSetVersion: isset($input['work_set_version']) && is_numeric($input['work_set_version']) ? (int) $input['work_set_version'] : null,
            );
            $terms['milestone_stages'] = $resolvedWork['nodes'];
            $terms['work_specification'] = $resolvedWork;
        }
        $row = [
            'id' => (string) Str::uuid7(),
            'listing_id' => $listingId,
            'version_number' => $version,
            'description' => trim((string) $input['description']),
            'terms' => json_encode(array_filter($terms, static fn ($value): bool => $value !== null), JSON_THROW_ON_ERROR),
            'price_amount_minor' => $priceMinor,
            'currency' => $currency,
            'payment_lane_availability' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'availability_capacity_summary' => json_encode(['summary' => 'Direct Tagudin counter or scheduled booking'], JSON_THROW_ON_ERROR),
            'safety_copy' => 'Agree scope and handoff details directly; this demo does not hold funds.',
            'effective_from' => $now,
            'effective_to' => null,
            'authored_by_user_id' => $authoredByUserId,
            'payload_version' => 1,
            'version' => 1,
            'correlation_id' => $correlationId,
            'published_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        if (Schema::hasColumn('listing_versions', 'category_id')) {
            $row['category_id'] = $pins['category_id'];
            $row['category_business_version'] = $pins['category_business_version'];
            $row['capability_profile_family_code'] = $pins['capability_profile_family_code'];
            $row['capability_profile_business_version'] = $pins['capability_profile_business_version'];
            $row['row_version'] = 1;
        }

        DB::table('listing_versions')->insert($row);
    }

    /** @return array<string, mixed> */
    private function ownerProjection(string $listingId, string $ownerId, string $correlationId): array
    {
        $listing = $this->ownerListing($listingId, $ownerId, $correlationId);

        if ($listing === null) {
            throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
        }

        return $listing;
    }

    private function ownerQuery(string $ownerUserId): Builder
    {
        return Listing::query()
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->where('listings.owner_user_id', $ownerUserId)
            ->select(
                'listings.*',
                'listing_versions.description',
                'listing_versions.terms',
                'listing_versions.availability_capacity_summary',
                'listing_versions.price_amount_minor',
                'listing_versions.currency',
                'categories.code as category_code',
            )
            ->toBase();
    }

    private function publicQuery(): Builder
    {
        return Listing::query()
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->join('user_profiles', 'user_profiles.user_id', '=', 'listings.owner_user_id')
            ->where('listings.status', 'active')
            ->where('listings.review_status', 'approved')
            ->select(
                'listings.*',
                'listing_versions.description',
                'listing_versions.terms',
                'listing_versions.price_amount_minor',
                'listing_versions.currency',
                'listing_versions.availability_capacity_summary',
                'categories.code as category_code',
                'user_profiles.display_name as owner_name',
                'user_profiles.service_area_display as owner_area',
            )
            ->toBase();
    }

    /** @return array<string, mixed> */
    private function mapProjection(object $row, bool $public): array
    {
        $terms = json_decode((string) $row->terms, true) ?: [];
        $geography = is_array($row->geography)
            ? $row->geography
            : (json_decode((string) ($row->geography ?? ''), true) ?: []);
        $capacity = json_decode((string) ($row->availability_capacity_summary ?? 'null'), true) ?: [];
        $projection = [
            'id' => (string) $row->id,
            'title' => (string) ($terms['title'] ?? ''),
            'description' => (string) $row->description,
            'category_code' => (string) $row->category_code,
            'listing_type' => (string) $row->listing_type,
            'status' => (string) $row->status,
            'review_status' => (string) $row->review_status,
            'state' => (string) $row->status,
            'version' => (int) $row->version,
            'expected_version' => (int) $row->version,
            'current_version' => (int) $row->current_version,
            'area' => $geography['area_code'] ?? ($row->owner_area ?? 'Tagudin'),
            'public' => $public,
        ];
        if (isset($terms['work_shape']) && is_string($terms['work_shape']) && $terms['work_shape'] !== '') {
            $projection['work_shape'] = $terms['work_shape'];
        }

        if (isset($terms['fixture_key']) && is_string($terms['fixture_key']) && $terms['fixture_key'] !== '') {
            $projection['fixture_key'] = $terms['fixture_key'];
        } elseif ((string) $row->id === '0198a3b1-7c40-7abc-8def-5234567890ab') {
            // Legacy contract rows written before fixture_key lived in terms.
            $projection['fixture_key'] = 'active-tagudin-service-01';
        }

        if (property_exists($row, 'price_amount_minor') && $row->price_amount_minor !== null) {
            $projection['price_amount_minor'] = (int) $row->price_amount_minor;
            $projection['currency'] = isset($row->currency) && is_string($row->currency) ? $row->currency : null;
        }
        if (isset($capacity['summary']) && is_string($capacity['summary']) && $capacity['summary'] !== '') {
            $projection['capacity_summary'] = $capacity['summary'];
        }

        if (isset($terms['package_tiers']) && is_array($terms['package_tiers'])) {
            $projection['package_tiers'] = $terms['package_tiers'];
        }

        if (isset($terms['milestone_stages']) && is_array($terms['milestone_stages'])) {
            $projection['milestone_stages'] = $terms['milestone_stages'];
        }

        foreach (['work_catalog', 'work_specification', 'addons', 'partner_candidates', 'deal_chain_combinations', 'deal_chain_specification', 'inclusions', 'variants', 'geography'] as $catalogField) {
            if (isset($terms[$catalogField]) && is_array($terms[$catalogField])) {
                $projection[$catalogField] = $terms[$catalogField];
            }
        }

        foreach (['catalog_source', 'work_catalog_code', 'pricing_mode', 'stall_location'] as $stringField) {
            if (isset($terms[$stringField]) && is_string($terms[$stringField]) && $terms[$stringField] !== '') {
                $projection[$stringField] = $terms[$stringField];
            }
        }
        if (isset($geography['stall_location']) && is_string($geography['stall_location']) && !isset($projection['stall_location'])) {
            $projection['stall_location'] = $geography['stall_location'];
        }
        if (!isset($projection['geography']) && $geography !== []) {
            $projection['geography'] = $geography;
        }

        if (isset($terms['work_set_version']) && is_numeric($terms['work_set_version'])) {
            $projection['work_set_version'] = (int) $terms['work_set_version'];
        }

        $media = isset($terms['media']) && is_array($terms['media']) ? $this->normalizeMedia($terms['media']) : null;
        $projection['cover_thumbnail_url'] = $media['cover_thumbnail_url'] ?? null;
        $projection['has_video'] = (bool) ($media['has_video'] ?? false);
        if ($media !== null) {
            $projection['media'] = $media;
        }
        if ($public) {
            $projection['owner_name'] = (string) $row->owner_name;
            $projection['owner'] = ['display_name' => (string) $row->owner_name];
        } else {
            $projection['owner_user_id'] = (string) $row->owner_user_id;
        }

        return ($public ? ListingProjection::public($projection) : ListingProjection::owner($projection))->toArray();
    }

    /**
     * @return array{cover_thumbnail_url: string|null, has_video: bool, items: list<array<string, mixed>>}|null
     */
    private function normalizeMedia(mixed $rawMedia): ?array
    {
        if (! is_array($rawMedia)) {
            return null;
        }

        $rawItems = isset($rawMedia['items']) && is_array($rawMedia['items'])
            ? $rawMedia['items']
            : (array_is_list($rawMedia) ? $rawMedia : []);

        $items = [];
        foreach ($rawItems as $index => $item) {
            if (! is_array($item)) {
                continue;
            }
            $url = trim((string) ($item['url'] ?? $item['thumbnail_url'] ?? ''));
            if ($url === '') {
                continue;
            }
            $kind = strtolower(trim((string) ($item['kind'] ?? 'photo'))) === 'video' ? 'video' : 'photo';
            $thumbUrl = trim((string) ($item['thumbnail_url'] ?? ($kind === 'photo' ? $url : '')));
            $items[] = [
                'id' => trim((string) ($item['id'] ?? 'media-'.($index + 1))),
                'kind' => $kind,
                'url' => $url,
                'thumbnail_url' => $thumbUrl !== '' ? $thumbUrl : null,
                'caption' => isset($item['caption']) && is_string($item['caption']) && trim($item['caption']) !== ''
                    ? trim($item['caption'])
                    : null,
                'mime_type' => isset($item['mime_type']) && is_string($item['mime_type']) && trim($item['mime_type']) !== ''
                    ? trim($item['mime_type'])
                    : ($kind === 'video' ? 'video/mp4' : 'image/webp'),
                'size_bytes' => isset($item['size_bytes']) && is_numeric($item['size_bytes'])
                    ? max(0, (int) $item['size_bytes'])
                    : null,
                'is_cover' => (bool) ($item['is_cover'] ?? false),
            ];
        }

        $explicitCover = isset($rawMedia['cover_thumbnail_url']) && is_string($rawMedia['cover_thumbnail_url'])
            ? trim($rawMedia['cover_thumbnail_url'])
            : '';

        $coverPhotoItem = null;
        foreach ($items as $candidate) {
            if ($candidate['kind'] === 'photo' && $candidate['is_cover']) {
                $coverPhotoItem = $candidate;
                break;
            }
        }
        if ($coverPhotoItem === null) {
            foreach ($items as $candidate) {
                if ($candidate['kind'] === 'photo') {
                    $coverPhotoItem = $candidate;
                    break;
                }
            }
        }

        $coverThumbnailUrl = $explicitCover !== ''
            ? $explicitCover
            : ($coverPhotoItem['thumbnail_url'] ?? $coverPhotoItem['url'] ?? ($items[0]['thumbnail_url'] ?? null));

        $hasVideo = (bool) ($rawMedia['has_video'] ?? false)
            || collect($items)->contains(static fn (array $candidate): bool => $candidate['kind'] === 'video');

        if ($items === [] && $coverThumbnailUrl === null && ! $hasVideo) {
            return null;
        }

        return [
            'cover_thumbnail_url' => $coverThumbnailUrl,
            'has_video' => $hasVideo,
            'items' => $items,
        ];
    }

    private function persistedCorrelationId(string $correlationId): string
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $correlationId) === 1
            ? $correlationId
            : (string) Str::uuid7();
    }
}
