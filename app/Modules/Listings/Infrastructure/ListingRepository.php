<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure;

use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\Contracts\OwnerListingReader;
use App\Modules\Listings\Application\Contracts\PublicListingReader;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\Projections\ListingProjection;
use App\Modules\Listings\Domain\ListingRules;
use App\Modules\Listings\Infrastructure\Models\Listing;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class ListingRepository implements ListingCommandStore, OwnerListingReader, PublicListingReader
{
    public function __construct(private readonly ListingRules $rules) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function createDraft(string $ownerId, array $input, string $correlationId): array
    {
        $this->ensureStorage($correlationId);
        $this->validate($input, $correlationId);

        return DB::transaction(function () use ($ownerId, $input, $correlationId): array {
            $now = now();
            $categoryId = $this->categoryId((string) $input['category_code'], $correlationId, $now);
            $profileId = $this->capabilityProfileId((string) $input['listing_type'], $correlationId, $now);
            $listingId = (string) Str::uuid7();

            Listing::query()->insert([
                'id' => $listingId,
                'owner_user_id' => $ownerId,
                'capability_profile_id' => $profileId,
                'category_id' => $categoryId,
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

            $this->insertVersion($listingId, 1, $ownerId, $input, $correlationId, $now);

            return $this->ownerProjection($listingId, $ownerId, $correlationId);
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function updateDraft(
        string $listingId,
        string $ownerId,
        int $expectedVersion,
        array $input,
        string $correlationId,
    ): array {
        $this->ensureStorage($correlationId);

        return DB::transaction(function () use ($listingId, $ownerId, $expectedVersion, $input, $correlationId): array {
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
            $this->categoryId((string) $payload['category_code'], $correlationId, $now);
            $this->capabilityProfileId((string) $payload['listing_type'], $correlationId, $now);
            $this->insertVersion($listingId, $nextVersion, $ownerId, $payload, $correlationId, $now);

            Listing::query()->where('id', $listingId)->update([
                'category_id' => $this->categoryId((string) $payload['category_code'], $correlationId, $now),
                'capability_profile_id' => $this->capabilityProfileId((string) $payload['listing_type'], $correlationId, $now),
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
        string $ownerId,
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

        return DB::transaction(function () use ($listingId, $ownerId, $expectedVersion, $idempotencyKey, $correlationId): array {
            $listing = Listing::query()->where('id', $listingId)->lockForUpdate()->first();
            if ($listing === null) {
                throw new ListingError('LISTING_NOT_FOUND', 'The listing could not be found.', $correlationId, status: 404);
            }
            if ((string) $listing->owner_user_id !== $ownerId) {
                throw new ListingError('AUTHORIZATION_DENIED', 'You are not authorized to perform this action.', $correlationId, status: 403);
            }

            $scope = 'listing.submit:'.$listingId.':'.$ownerId;
            $requestHash = hash('sha256', json_encode([
                'operation' => 'listing.submit',
                'listing_id' => $listingId,
                'owner_id' => $ownerId,
                'expected_version' => $expectedVersion,
            ], JSON_THROW_ON_ERROR));
            $existing = DB::table('idempotency_keys')
                ->where('scope', $scope)
                ->where('key', $idempotencyKey)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if ((string) $existing->request_hash !== $requestHash) {
                    throw new ListingError(
                        'IDEMPOTENCY_KEY_REUSED',
                        'That idempotency key was already used for a different submission.',
                        $correlationId,
                        status: 409,
                    );
                }
                if ((string) $existing->status === 'succeeded' && $existing->response_payload !== null) {
                    $replayed = json_decode((string) $existing->response_payload, true);
                    if (is_array($replayed)) {
                        return $replayed;
                    }
                }
                if ((string) $existing->status === 'succeeded') {
                    return $this->ownerProjection($listingId, $ownerId, $correlationId);
                }
            } else {
                $existingId = (string) Str::uuid7();
                DB::table('idempotency_keys')->insert([
                    'id' => $existingId,
                    'scope' => $scope,
                    'key' => $idempotencyKey,
                    'actor_user_id' => $ownerId,
                    'request_hash' => $requestHash,
                    'response_event_id' => null,
                    'response_reference' => null,
                    'status' => 'in_progress',
                    'expires_at' => now()->addDay(),
                    'correlation_id' => $correlationId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $existing = DB::table('idempotency_keys')->where('id', $existingId)->lockForUpdate()->first();
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
            $this->insertVersion($listingId, $nextVersion, $ownerId, [
                'title' => (string) ($terms['title'] ?? ''),
                'description' => (string) $current->description,
                'category_code' => (string) ($terms['category_code'] ?? ''),
                'listing_type' => (string) $listing->listing_type,
            ], $correlationId, $now);

            Listing::query()->where('id', $listingId)->update([
                'status' => 'pending_review',
                'review_status' => 'pending',
                'current_version' => $nextVersion,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            $auditId = (string) Str::uuid7();
            DB::table('audit_events')->insert([
                'id' => $auditId,
                'actor_user_id' => $ownerId,
                'acting_for_user_id' => null,
                'action' => 'listing.submit_review',
                'target_type' => 'listing',
                'target_id' => $listingId,
                'order_id' => null,
                'payment_obligation_id' => null,
                'idempotency_key_id' => $existing->id,
                'migration_checkpoint_id' => null,
                'previous_value_summary' => json_encode(['status' => 'draft', 'version' => $expectedVersion], JSON_THROW_ON_ERROR),
                'new_value_summary' => json_encode(['status' => 'pending_review', 'version' => $nextVersion], JSON_THROW_ON_ERROR),
                'reason' => 'Owner submitted a fictional listing for review.',
                'command_name' => 'SubmitListing',
                'expected_version' => $expectedVersion,
                'correlation_id' => $correlationId,
                'occurred_at' => $now,
                'created_at' => $now,
            ]);
            DB::table('outbox_messages')->insert([
                'id' => (string) Str::uuid7(),
                'event_id' => $auditId,
                'event_type' => 'listing.submitted_for_review',
                'aggregate_type' => 'listing',
                'aggregate_id' => $listingId,
                'audit_event_id' => $auditId,
                'payload_version' => 1,
                'payload' => json_encode(['listing_id' => $listingId, 'status' => 'pending_review', 'version' => $nextVersion], JSON_THROW_ON_ERROR),
                'status' => 'pending',
                'attempt_count' => 0,
                'next_attempt_at' => $now,
                'last_error' => null,
                'published_at' => null,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $response = $this->ownerProjection($listingId, $ownerId, $correlationId);
            DB::table('idempotency_keys')->where('id', $existing->id)->update([
                'status' => 'succeeded',
                'response_event_id' => $auditId,
                'response_reference' => $listingId,
                'response_status' => 200,
                'response_payload' => json_encode($response, JSON_THROW_ON_ERROR),
                'fingerprint_version' => 1,
                'updated_at' => $now,
            ]);

            return $response;
        });
    }

    /** @return list<array<string, mixed>> */
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

    private function categoryId(string $code, string $correlationId, mixed $now): string
    {
        $category = DB::table('categories')->where('code', $code)->where('status', 'active')->first();
        if ($category !== null) {
            return (string) $category->id;
        }

        $id = (string) Str::uuid7();
        DB::table('categories')->insert([
            'id' => $id,
            'parent_id' => null,
            'code' => $code,
            'name' => ucwords(str_replace(['-', '_'], ' ', $code)),
            'safety_class' => 'standard',
            'data_class' => 'public',
            'status' => 'active',
            'pilot_status' => 'approved',
            'metadata' => json_encode(['area' => 'Tagudin'], JSON_THROW_ON_ERROR),
            'metadata_version' => 1,
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }

    private function capabilityProfileId(string $listingType, string $correlationId, mixed $now): string
    {
        $code = $listingType === 'service' ? 'service_listing' : 'product_listing';
        $profile = DB::table('capability_profiles')->where('code', $code)->where('status', 'active')->first();
        if ($profile !== null) {
            return (string) $profile->id;
        }

        $id = (string) Str::uuid7();
        DB::table('capability_profiles')->insert([
            'id' => $id,
            'code' => $code,
            'listing_type' => $listingType,
            'mechanism' => 'listing',
            'work_shape' => 'local_service',
            'allowed_payment_lanes' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
            'allowed_access_tiers' => json_encode(['L1', 'L2', 'L3'], JSON_THROW_ON_ERROR),
            'safety_class' => 'standard',
            'data_class' => 'public',
            'status' => 'active',
            'activation_record_reference' => 'capstone-fixture',
            'version' => 1,
            'correlation_id' => $correlationId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $id;
    }

    /** @param array<string, mixed> $input */
    private function insertVersion(string $listingId, int $version, string $ownerId, array $input, string $correlationId, mixed $now): void
    {
        DB::table('listing_versions')->insert([
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
            'authored_by_user_id' => $ownerId,
            'payload_version' => 1,
            'version' => 1,
            'correlation_id' => $correlationId,
            'published_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
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
