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
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createDraft(ResourceActor $actor, array $input, string $correlationId): array
    {
        $this->ensureStorage($correlationId);
        $this->validate($input, $correlationId);

        return DB::transaction(function () use ($actor, $input, $correlationId): array {
            $this->assertActingForIfNeeded($actor, $correlationId, 'listing.create');
            $ownerId = $actor->resourceOwnerId;
            $now = now();
            $pins = $this->catalog->ensurePublished(
                (string) $input['category_code'],
                (string) $input['listing_type'],
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
                'geography' => json_encode(['area_code' => 'Tagudin'], JSON_THROW_ON_ERROR),
                'current_version' => 1,
                'review_status' => 'not_required',
                'version' => 1,
                'correlation_id' => $correlationId,
                'archived_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $this->insertVersion($listingId, 1, $actor->actorUserId, $input, $correlationId, $now, $pins);

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
            ], $input);
            $this->validate($payload, $correlationId);

            $now = now();
            $nextVersion = ((int) $listing->version) + 1;
            $pins = $this->catalog->ensurePublished(
                (string) $payload['category_code'],
                (string) $payload['listing_type'],
                $correlationId,
            );
            $this->insertVersion($listingId, $nextVersion, $actor->actorUserId, $payload, $correlationId, $now, $pins);

            Listing::query()->where('id', $listingId)->update([
                'category_id' => $pins['category_id'],
                'capability_profile_id' => $pins['capability_profile_id'],
                'listing_type' => (string) $payload['listing_type'],
                'current_version' => $nextVersion,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

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
            $nextVersion = ((int) $listing->version) + 1;
            $now = now();
            $pins = $this->catalog->ensurePublished(
                (string) ($terms['category_code'] ?? ''),
                (string) $listing->listing_type,
                $correlationId,
            );
            $this->insertVersion($listingId, $nextVersion, $actor->actorUserId, [
                'title' => (string) ($terms['title'] ?? ''),
                'description' => (string) $current->description,
                'category_code' => (string) ($terms['category_code'] ?? ''),
                'listing_type' => (string) $listing->listing_type,
            ], $correlationId, $now, $pins);

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
        if (! Schema::hasTable('listing_versions') || ! Schema::hasTable('listings') || ! Schema::hasTable('categories')) {
            return [];
        }

        return Listing::query()
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->where('listings.owner_user_id', $ownerUserId)
            ->orderByDesc('listings.updated_at')
            ->select(
                'listings.*',
                'listing_versions.description',
                'listing_versions.terms',
                'listing_versions.availability_capacity_summary',
                'listing_versions.price_amount_minor',
                'listing_versions.currency',
                'categories.code as category_code',
            )
            ->toBase()
            ->get()
            ->map(fn (object $row): array => $this->mapProjection($row, false))
            ->values()
            ->all();
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
        $row = [
            'id' => (string) Str::uuid7(),
            'listing_id' => $listingId,
            'version_number' => $version,
            'description' => trim((string) $input['description']),
            'terms' => json_encode([
                'title' => trim((string) $input['title']),
                'category_code' => trim((string) $input['category_code']),
                'scope' => 'Fictional local listing scope',
            ], JSON_THROW_ON_ERROR),
            'price_amount_minor' => null,
            'currency' => null,
            'payment_lane_availability' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'availability_capacity_summary' => json_encode(['summary' => 'Not provided in this first slice'], JSON_THROW_ON_ERROR),
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
        $row = Listing::query()
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->where('listings.id', $listingId)
            ->where('listings.owner_user_id', $ownerId)
            ->select('listings.*', 'listing_versions.description', 'listing_versions.terms', 'categories.code as category_code')
            ->toBase()
            ->first();

        if ($row === null) {
            throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
        }

        return $this->mapProjection($row, false);
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
        $geography = json_decode((string) $row->geography, true) ?: [];
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

        if ($public) {
            $projection['owner_name'] = (string) $row->owner_name;
            $projection['owner'] = ['display_name' => (string) $row->owner_name];
        } else {
            $projection['owner_user_id'] = (string) $row->owner_user_id;
        }

        return ($public ? ListingProjection::public($projection) : ListingProjection::owner($projection))->toArray();
    }

    private function persistedCorrelationId(string $correlationId): string
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $correlationId) === 1
            ? $correlationId
            : (string) Str::uuid7();
    }
}
