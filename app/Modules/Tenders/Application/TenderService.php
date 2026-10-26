<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use App\Shared\Application\KernelException as IdentityAccessError;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\QuoteAwardOrderFormationPort;
use App\Shared\Contracts\RoleCapabilityReaderPort;
use App\Shared\Contracts\WorkSpecificationPort;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * TenderService:
 * Encapsulates transactional mutations for requests, quotes, and awards with:
 * - Pessimistic row-level locking (FOR UPDATE)
 * - Synchronous deadline/expiry validation
 * - State machine transition guards
 * - Order formation and snapshot generation
 */
final class TenderService
{
    public function __construct(
        private readonly RoleCapabilityReaderPort $roles,
        private readonly QuoteAwardOrderFormationPort $formation,
        private readonly OrderCapacityPort $capacity,
        private readonly OrderListingSourcePort $listings,
        private readonly WorkSpecificationPort $workSpecs,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * @param  array{amount_minor: int, currency?: string, message: string, estimated_duration?: string|null, work_shape?: string, listing_id?: string|null, appointment_duration_minutes?: int|null, milestone_stages?: array<int, array<string, mixed>>|null, idempotency_key?: string|null}  $input
     * @return array<string, mixed>
     */
    public function submitQuote(string $userId, string $requestId, array $input, string $correlationId): array
    {
        if (! $this->roles->hasActive($userId, 'provide')) {
            throw new IdentityAccessError(
                'PREREQUISITE_FAILED',
                'Active provider capability is required to submit a quote.',
                $correlationId,
                status: 403
            );
        }

        return DB::transaction(function () use ($userId, $requestId, $input, $correlationId): array {
            // Lock request row to prevent submission racing with concurrent award
            $request = DB::table('requests')
                ->where('id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                throw new IdentityAccessError('REQUEST_NOT_FOUND', 'The requested tender could not be found.', $correlationId, status: 404);
            }

            if ((string) $request->requester_user_id === $userId) {
                throw new IdentityAccessError('SELF_QUOTE_FORBIDDEN', 'You cannot submit a quote on your own request.', $correlationId, status: 403);
            }

            if (! in_array((string) $request->status, ['published', 'sourcing', 'quoted'], true)) {
                throw new IdentityAccessError('REQUEST_NOT_OPEN', 'This request is no longer accepting quotes.', $correlationId, status: 422);
            }

            // Enforce synchronous deadline guard
            if ($request->expires_at !== null && now()->greaterThan($request->expires_at)) {
                throw new IdentityAccessError('REQUEST_EXPIRED', 'This request has passed its response deadline.', $correlationId, status: 422);
            }

            $listingId = isset($input['listing_id']) ? (string) $input['listing_id'] : null;
            $listingSource = $listingId !== null ? $this->listings->findActiveApproved($listingId) : null;
            if ($listingId !== null && ($listingSource === null || (string) $listingSource['owner_user_id'] !== $userId)) {
                throw new IdentityAccessError('INVALID_LISTING_OWNER', 'You may only quote with an active listing you own.', $correlationId, status: 422);
            }
            $requestedWorkShape = strtoupper((string) ($input['work_shape'] ?? $listingSource['work_shape'] ?? 'A1'));
            $workShape = $listingSource !== null ? (string) $listingSource['work_shape'] : $requestedWorkShape;
            $listingType = $listingSource !== null ? (string) $listingSource['listing_type'] : 'service';
            if ($listingSource !== null && $requestedWorkShape !== $workShape) {
                throw new IdentityAccessError('WORK_SHAPE_MISMATCH', 'Quote work shape must match the selected listing.', $correlationId, status: 422);
            }
            $milestoneStages = $input['milestone_stages'] ?? null;
            if (! is_array($milestoneStages) || $milestoneStages === []) {
                $listingTerms = is_array($listingSource['terms'] ?? null) ? $listingSource['terms'] : [];
                $milestoneStages = $listingSource['milestone_stages']
                    ?? $listingTerms['milestone_stages']
                    ?? $listingTerms['work_specification']['nodes']
                    ?? null;
            }
            if (! is_array($milestoneStages) || $milestoneStages === []) {
                $requestItems = is_string($request->item_list) ? json_decode($request->item_list, true) : (array) $request->item_list;
                $milestoneStages = is_array($requestItems) ? ($requestItems['pipeline']['stages'] ?? null) : null;
            }
            if ($workShape === 'A3' && (! is_array($milestoneStages) || $milestoneStages === [])) {
                throw new IdentityAccessError(
                    'WORK_SPECIFICATION_REQUIRED',
                    'An A3 quote needs an authored Work pipeline with named measurement requirements.',
                    $correlationId,
                    status: 422,
                    fieldErrors: ['milestone_stages' => ['Author the A3 measurement IDs and units or select a complete listing Work specification.']],
                );
            }
            if (is_array($milestoneStages) && $milestoneStages !== []) {
                try {
                    $milestoneStages = $this->workSpecs->normalizeNodes($milestoneStages, $workShape, requireToolDefinitions: true);
                } catch (\InvalidArgumentException $error) {
                    throw new IdentityAccessError(
                        'INVALID_WORK_SPECIFICATION',
                        'Quote Work stages need valid authored checklist and measurement requirements.',
                        $correlationId,
                        status: 422,
                        fieldErrors: ['milestone_stages' => [$error->getMessage()]],
                    );
                }
            }
            $workSpecification = is_array($listingSource['work_specification'] ?? null)
                ? $listingSource['work_specification']
                : null;
            if ($workSpecification !== null) {
                if (is_array($input['milestone_stages'] ?? null) && $input['milestone_stages'] !== []) {
                    $workSpecification['nodes'] = $milestoneStages;
                }
                $requiresSchemaTwo = false;
                foreach ((array) $milestoneStages as $stage) {
                    if (! is_array($stage)) {
                        continue;
                    }
                    $proofs = $stage['required_proofs'] ?? $stage['requiredProofs'] ?? [];
                    $approvalMethod = $stage['approval_method'] ?? $stage['approvalMethod'] ?? null;
                    $handoffParty = $stage['handoff_party'] ?? $stage['handoffParty'] ?? null;
                    if ((is_array($proofs) && array_intersect($proofs, ['checklist_steps', 'metric_reading']) !== [])
                        || (array) ($stage['checklist_items'] ?? $stage['checklistItems'] ?? []) !== []
                        || (array) ($stage['metric_requirements'] ?? $stage['metricRequirements'] ?? []) !== []
                        || in_array($approvalMethod, ['presence_otp', 'worker_dropoff'], true)
                        || $handoffParty === 'worker_dropoff') {
                        $requiresSchemaTwo = true;
                        break;
                    }
                }
                $workSpecification['shape_contract_version'] ??= 1;
                $workSpecification['payload_schema_version'] ??= 1;
                if ($requiresSchemaTwo && (int) $workSpecification['payload_schema_version'] < 2) {
                    $workSpecification['payload_schema_version'] = 2;
                }
            }
            $productSelection = [];
            if ($workShape === 'A4' && $listingType === 'product') {
                $expectedListingVersionId = $input['listing_version_id'] ?? null;
                if (! is_string($expectedListingVersionId) || $expectedListingVersionId !== (string) $listingSource['listing_version_id']) {
                    throw new IdentityAccessError('LISTING_VERSION_CHANGED', 'The selected product listing changed. Refresh before submitting the quote.', $correlationId, status: 409);
                }

                $variantId = $input['variant_id'] ?? null;
                if (! is_string($variantId) || trim($variantId) === '') {
                    throw new IdentityAccessError('PRODUCT_VARIANT_REQUIRED', 'Choose a product variant for this quote.', $correlationId, status: 422);
                }
                $quantity = filter_var($input['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 999]]);
                if ($quantity === false) {
                    throw new IdentityAccessError('PRODUCT_QUANTITY_REQUIRED', 'Choose a valid product quantity for this quote.', $correlationId, status: 422);
                }
                $terms = is_array($listingSource['terms'] ?? null) ? $listingSource['terms'] : [];
                $matchingVariants = array_values(array_filter(
                    is_array($terms['variants'] ?? null) ? $terms['variants'] : [],
                    static fn (mixed $variant): bool => is_array($variant) && (string) ($variant['id'] ?? '') === $variantId,
                ));
                if (count($matchingVariants) !== 1) {
                    throw new IdentityAccessError('PRODUCT_VARIANT_INVALID', 'Choose a variant from the selected product listing.', $correlationId, status: 422);
                }
                $variant = $matchingVariants[0];
                $resourceKey = is_string($variant['resource_key'] ?? null) ? trim($variant['resource_key']) : '';
                if ($resourceKey === '') {
                    $resourceKey = trim((string) ($variant['id'] ?? ''));
                }
                $sourceUnitAmountMinor = isset($variant['price_amount_minor'])
                    ? filter_var($variant['price_amount_minor'], FILTER_VALIDATE_INT)
                    : (is_numeric($variant['price'] ?? null) ? (int) round((float) $variant['price'] * 100) : false);
                if ($resourceKey === '' || $sourceUnitAmountMinor === false || $sourceUnitAmountMinor < 0) {
                    throw new IdentityAccessError('PRODUCT_VARIANT_INVALID', 'The selected variant has no stable stock identity or authored price.', $correlationId, status: 409);
                }

                $productSelection = [
                    'source_listing_version_id' => (string) $listingSource['listing_version_id'],
                    'variant_id' => $variantId,
                    'resource_key' => $resourceKey,
                    'quantity' => (int) $quantity,
                    'source_unit_amount_minor' => (int) $sourceUnitAmountMinor,
                ];
            }
            $appointmentDurationMinutes = null;
            $appointmentListingVersionId = null;
            if ($workShape === 'A3') {
                if ($listingId !== null && $listingType !== 'service') {
                    throw new IdentityAccessError('INVALID_APPOINTMENT_SOURCE', 'A3 appointment quotes must use a service listing.', $correlationId, status: 422);
                }
                if ($listingId !== null) {
                    $appointmentDetails = $this->capacity->appointmentDetailsForListing($listingId, $correlationId);
                    if (
                        $appointmentDetails['provider_user_id'] !== $userId
                        || $appointmentDetails['listing_version_id'] !== $listingSource['listing_version_id']
                    ) {
                        throw new IdentityAccessError('LISTING_VERSION_CHANGED', 'The A3 listing changed. Refresh and submit the quote again.', $correlationId, status: 409);
                    }
                    $appointmentDurationMinutes = $appointmentDetails['duration_minutes'];
                    $appointmentListingVersionId = $appointmentDetails['listing_version_id'];
                } else {
                    $appointmentDurationMinutes = filter_var($input['appointment_duration_minutes'] ?? null, FILTER_VALIDATE_INT);
                    if ($appointmentDurationMinutes === false || $appointmentDurationMinutes < 1 || $appointmentDurationMinutes > 480) {
                        throw new IdentityAccessError('APPOINTMENT_DURATION_REQUIRED', 'An unlinked A3 quote must include a provider-authored duration between 1 and 480 minutes.', $correlationId, status: 422);
                    }
                }
            }

            // Idempotent quote check for this provider and request
            $existingQuote = DB::table('quotes')
                ->where('request_id', $requestId)
                ->where('provider_user_id', $userId)
                ->where('status', 'submitted')
                ->first();

            $amountMinor = (int) $input['amount_minor'];
            $currency = strtoupper((string) ($input['currency'] ?? 'PHP'));
            $message = trim((string) $input['message']);
            $now = now();

            if ($existingQuote !== null) {
                DB::table('quotes')->where('id', $existingQuote->id)->update([
                    'status' => 'superseded',
                    'version' => ((int) $existingQuote->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
            }

            // Allocate next quote version atomically inside locked transaction
            $nextVersion = ((int) DB::table('quotes')->where('request_id', $requestId)->max('quote_version')) + 1;
            $quoteId = (string) Str::uuid7();

            DB::table('quotes')->insert([
                'id' => $quoteId,
                'request_id' => $requestId,
                'listing_id' => $listingId,
                'provider_user_id' => $userId,
                'quote_version' => $nextVersion,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'amount_components' => json_encode(['base' => $amountMinor], JSON_THROW_ON_ERROR),
                'scope' => json_encode(array_filter([
                    'appointment_duration_minutes' => $appointmentDurationMinutes,
                    'appointment_listing_version_id' => $appointmentListingVersionId,
                    'source_listing_version_id' => $listingSource['listing_version_id'] ?? null,
                    'listing_type' => $listingType,
                    ...$productSelection,
                    'message' => $message,
                    'proposal' => $message,
                    'estimated_duration' => $input['estimated_duration'] ?? null,
                    'milestone_stages' => $milestoneStages,
                    'work_specification' => $workSpecification,
                    'supersedes_quote_id' => $existingQuote?->id,
                    'counter_by' => $existingQuote !== null ? 'provider' : null,
                ], static fn ($v) => $v !== null), JSON_THROW_ON_ERROR),
                'inclusions' => null,
                'exclusions' => null,
                'expires_at' => now()->addDays(7),
                'work_shape' => $workShape,
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $recipientUserId = (string) $request->requester_user_id;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'quote',
                eventSourceId: $quoteId,
                eventType: 'tender.quote_submitted',
                attention: NotificationAttention::NeedsAction,
                title: 'A provider sent a quote',
                body: 'Review your request to consider the offer.',
                actionUrl: route('requests.show', ['id' => $requestId], false),
                idempotencyKey: 'tender.quote_submitted:'.$quoteId.':v'.$nextVersion.':'.$recipientUserId,
                correlationId: $correlationId,
            ));

            return [
                'id' => $quoteId,
                'request_id' => $requestId,
                'provider_user_id' => $userId,
                'amount_minor' => $amountMinor,
                'currency' => $currency,
                'status' => 'submitted',
                'quote_version' => $nextVersion,
            ];
        });
    }

    /**
     * @return array{quote_id: string, quote_version: int, request_id: string, provider_user_id: string, customer_user_id: string, duration_minutes: int, listing_id: string|null, listing_version_id: string|null}
     */
    public function appointmentSourceForQuote(string $customerUserId, string $requestId, string $quoteId, int $quoteVersion, string $correlationId): array
    {
        $row = DB::table('quotes')
            ->join('requests', 'requests.id', '=', 'quotes.request_id')
            ->where('quotes.id', $quoteId)
            ->where('quotes.request_id', $requestId)
            ->first(['quotes.id', 'quotes.quote_version', 'quotes.provider_user_id', 'quotes.work_shape', 'quotes.listing_id', 'quotes.scope', 'quotes.status', 'quotes.expires_at', 'requests.requester_user_id', 'requests.status as request_status']);
        if ($row === null || (string) $row->requester_user_id !== $customerUserId) {
            throw new IdentityAccessError('QUOTE_NOT_FOUND', 'The quote could not be found.', $correlationId, status: 404);
        }
        if ((int) $row->quote_version !== $quoteVersion || (string) $row->status !== 'submitted') {
            throw new IdentityAccessError('QUOTE_VERSION_CHANGED', 'This quote changed. Refresh before choosing an appointment time.', $correlationId, status: 409);
        }
        if (! in_array((string) $row->request_status, ['published', 'sourcing', 'quoted'], true)
            || ($row->expires_at !== null && now()->greaterThan($row->expires_at))) {
            throw new IdentityAccessError('QUOTE_EXPIRED', 'This quote is no longer available to accept.', $correlationId, status: 409);
        }
        if (strtoupper((string) $row->work_shape) !== 'A3') {
            throw new IdentityAccessError('INVALID_APPOINTMENT', 'Only A3 quotes require appointment scheduling.', $correlationId, status: 422);
        }
        $scope = is_string($row->scope) ? json_decode($row->scope, true) : (array) $row->scope;
        $duration = is_array($scope) ? filter_var($scope['appointment_duration_minutes'] ?? null, FILTER_VALIDATE_INT) : false;
        if ($duration === false || $duration < 1 || $duration > 480) {
            throw new IdentityAccessError('APPOINTMENT_DURATION_REQUIRED', 'This quote has no valid pinned appointment duration.', $correlationId, status: 409);
        }
        $listingVersionId = is_array($scope) && is_string($scope['appointment_listing_version_id'] ?? null)
            ? $scope['appointment_listing_version_id']
            : null;
        if ($row->listing_id !== null && ($listingVersionId === null || (string) ($scope['listing_type'] ?? '') !== 'service')) {
            throw new IdentityAccessError('LISTING_VERSION_CHANGED', 'The linked A3 listing was not pinned to a service version.', $correlationId, status: 409);
        }

        return [
            'quote_id' => (string) $row->id,
            'quote_version' => (int) $row->quote_version,
            'request_id' => (string) $requestId,
            'provider_user_id' => (string) $row->provider_user_id,
            'customer_user_id' => (string) $row->requester_user_id,
            'duration_minutes' => (int) $duration,
            'listing_id' => $row->listing_id === null ? null : (string) $row->listing_id,
            'listing_version_id' => $listingVersionId,
        ];
    }

    /**
     * @param array{
     *     amount_minor: int,
     *     note?: string|null,
     *     include_hardware?: bool
     * } $input
     * @return array<string, mixed>
     */
    public function counterQuote(string $userId, string $requestId, string $quoteId, array $input, string $correlationId): array
    {
        return DB::transaction(function () use ($userId, $requestId, $quoteId, $input, $correlationId): array {
            $request = DB::table('requests')
                ->where('id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                throw new IdentityAccessError('REQUEST_NOT_FOUND', 'The requested tender could not be found.', $correlationId, status: 404);
            }

            if (! in_array((string) $request->status, ['published', 'sourcing', 'quoted'], true)) {
                throw new IdentityAccessError('REQUEST_NOT_OPEN', 'This request is no longer accepting quote negotiations.', $correlationId, status: 422);
            }

            $quote = DB::table('quotes')
                ->where('id', $quoteId)
                ->where('request_id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($quote === null) {
                throw new IdentityAccessError('QUOTE_NOT_FOUND', 'The quote could not be found.', $correlationId, status: 404);
            }

            $isRequester = (string) $request->requester_user_id === $userId;
            $isQuotingProvider = (string) $quote->provider_user_id === $userId;

            if (! $isRequester && ! $isQuotingProvider) {
                throw new IdentityAccessError('AUTHORIZATION_DENIED', 'Only the requester or the quoting provider can negotiate this quote.', $correlationId, status: 403);
            }

            if ((string) $quote->status !== 'submitted') {
                throw new IdentityAccessError('INVALID_STATE', 'Only submitted quotes can be countered.', $correlationId, status: 422);
            }

            $existingScope = is_string($quote->scope) ? json_decode($quote->scope, true) : (array) $quote->scope;
            $proposer = is_array($existingScope) ? ($existingScope['counter_by'] ?? 'provider') : 'provider';
            if (($isRequester && $proposer === 'requester') || ($isQuotingProvider && $proposer === 'provider')) {
                throw new IdentityAccessError('NEGOTIATION_TURN_REQUIRED', 'Wait for the counterparty to respond to these terms.', $correlationId, status: 403);
            }
            $now = now();
            // 1. Mark current quote as superseded
            DB::table('quotes')
                ->where('id', $quoteId)
                ->update([
                    'status' => 'superseded',
                    'version' => ((int) $quote->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            // 2. Create new immutable quote revision
            $newQuoteId = (string) Str::uuid7();
            $newVersion = ((int) DB::table('quotes')->where('request_id', $requestId)->max('quote_version')) + 1;
            $amountMinor = max(100, (int) $input['amount_minor']);

            $updatedScope = array_merge(is_array($existingScope) ? $existingScope : [], [
                'counter_by' => $isRequester ? 'requester' : 'provider',
                'counter_note' => $input['note'] ?? null,
                'include_hardware' => (bool) ($input['include_hardware'] ?? false),
                'supersedes_quote_id' => $quoteId,
            ]);

            DB::table('quotes')->insert([
                'id' => $newQuoteId,
                'request_id' => $requestId,
                'listing_id' => $quote->listing_id,
                'provider_user_id' => $quote->provider_user_id,
                'quote_version' => $newVersion,
                'amount_minor' => $amountMinor,
                'currency' => $quote->currency,
                'amount_components' => json_encode([
                    'base_fee' => $amountMinor,
                    'include_hardware' => (bool) ($input['include_hardware'] ?? false),
                ], JSON_THROW_ON_ERROR),
                'scope' => json_encode($updatedScope, JSON_THROW_ON_ERROR),
                'inclusions' => $quote->inclusions ?? '[]',
                'exclusions' => $quote->exclusions ?? '[]',
                'work_shape' => $quote->work_shape,
                'payment_lane_options' => $quote->payment_lane_options ?? json_encode(['external_cash']),
                'status' => 'submitted',
                'expires_at' => $quote->expires_at ?? now()->addDays(7),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $recipientUserId = $isRequester
                ? (string) $quote->provider_user_id
                : (string) $request->requester_user_id;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'quote',
                eventSourceId: $newQuoteId,
                eventType: 'tender.quote_countered',
                attention: NotificationAttention::NeedsAction,
                title: 'Quote terms changed',
                body: 'Review the updated quote in your request workspace.',
                actionUrl: route('requests.show', ['id' => $requestId], false),
                idempotencyKey: 'tender.quote_countered:'.$newQuoteId.':v'.$newVersion.':'.$recipientUserId,
                correlationId: $correlationId,
            ));

            return [
                'id' => $newQuoteId,
                'request_id' => $requestId,
                'provider_user_id' => (string) $quote->provider_user_id,
                'quote_version' => $newVersion,
                'amount_minor' => $amountMinor,
                'currency' => $quote->currency,
                'status' => 'submitted',
                'supersedes_quote_id' => $quoteId,
            ];
        });
    }

    /**
     * @return array{order_id: string, quote_id: string}
     */
    public function acceptQuote(string $userId, string $requestId, string $quoteId, string $correlationId, ?string $appointmentReservationId = null, ?int $expectedQuoteVersion = null): array
    {
        return DB::transaction(function () use ($userId, $requestId, $quoteId, $correlationId, $appointmentReservationId, $expectedQuoteVersion): array {
            // Lock request row to serialize against other acceptances
            $request = DB::table('requests')
                ->where('id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                throw new IdentityAccessError('REQUEST_NOT_FOUND', 'The requested tender could not be found.', $correlationId, status: 404);
            }

            if ((string) $request->status !== 'published' && (string) $request->status !== 'quoted') {
                throw new IdentityAccessError('REQUEST_NOT_OPEN', 'This request is no longer available for award.', $correlationId, status: 422);
            }

            // Lock target quote row
            $quote = DB::table('quotes')
                ->where('id', $quoteId)
                ->where('request_id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($quote === null) {
                throw new IdentityAccessError('QUOTE_NOT_FOUND', 'The quote could not be found for this request.', $correlationId, status: 404);
            }
            if ($expectedQuoteVersion !== null && (int) $quote->quote_version !== $expectedQuoteVersion) {
                throw new IdentityAccessError('QUOTE_VERSION_CHANGED', 'This quote changed. Refresh before awarding it.', $correlationId, status: 409);
            }
            $buyerUserId = (string) $request->requester_user_id;
            if (! in_array($userId, [$buyerUserId, (string) $quote->provider_user_id], true)) {
                throw new IdentityAccessError('AUTHORIZATION_DENIED', 'Only a quote participant can accept negotiated terms.', $correlationId, status: 403);
            }
            $scopeData = is_string($quote->scope) ? json_decode($quote->scope, true) : (array) $quote->scope;
            $scopeData = is_array($scopeData) ? $scopeData : [];
            $proposerUserId = ($scopeData['counter_by'] ?? 'provider') === 'requester'
                ? $buyerUserId
                : (string) $quote->provider_user_id;
            if ($proposerUserId === $userId) {
                throw new IdentityAccessError('SELF_ACCEPTANCE_FORBIDDEN', 'Only the counterparty can accept these terms.', $correlationId, status: 403);
            }

            if ((string) $quote->status !== 'submitted') {
                throw new IdentityAccessError('INVALID_STATE', 'Quote cannot be accepted because it is not submitted.', $correlationId, status: 422);
            }

            // Enforce synchronous expiry guard
            if ($quote->expires_at !== null && now()->greaterThan($quote->expires_at)) {
                throw new IdentityAccessError('QUOTE_EXPIRED', 'This quote has expired.', $correlationId, status: 422);
            }
            $workShape = strtoupper((string) ($quote->work_shape ?: 'A1'));
            $appointmentSource = null;
            $appointmentSlot = null;
            if ($workShape === 'A3') {
                if ($appointmentReservationId === null) {
                    throw new IdentityAccessError('APPOINTMENT_HOLD_REQUIRED', 'The customer must choose and hold an appointment before this A3 quote can be accepted.', $correlationId, status: 409);
                }
                $appointmentSource = $this->appointmentSourceForQuote($buyerUserId, $requestId, $quoteId, (int) $quote->quote_version, $correlationId);
                $appointmentSlot = $this->capacity->claimQuoteAppointmentHold(
                    reservationId: $appointmentReservationId,
                    quoteId: $quoteId,
                    quoteVersion: (int) $quote->quote_version,
                    providerUserId: (string) $quote->provider_user_id,
                    customerUserId: $buyerUserId,
                    durationMinutes: $appointmentSource['duration_minutes'],
                    correlationId: $correlationId,
                );
                $scopeData['appointment_slot'] = [
                    'starts_at' => $appointmentSlot['starts_at'],
                    'ends_at' => $appointmentSlot['ends_at'],
                    'duration_minutes' => $appointmentSlot['duration_minutes'],
                ];
            } elseif ($appointmentReservationId !== null) {
                throw new IdentityAccessError('INVALID_APPOINTMENT', 'Appointment holds are only valid for A3 quotes.', $correlationId, status: 422);
            }

            $now = now();

            // 1. Mark accepted quote as accepted
            DB::table('quotes')
                ->where('id', $quoteId)
                ->update([
                    'status' => 'accepted',
                    'version' => ((int) $quote->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);
            $competingQuotes = DB::table('quotes')
                ->where('request_id', $requestId)
                ->where('id', '!=', $quoteId)
                ->whereIn('status', ['submitted', 'draft'])
                ->get(['id', 'provider_user_id', 'version']);


            // 2. Mark competing quotes for this request as not_selected
            DB::table('quotes')
                ->where('request_id', $requestId)
                ->where('id', '!=', $quoteId)
                ->whereIn('status', ['submitted', 'draft'])
                ->update([
                    'status' => 'not_selected',
                    'version' => DB::raw('version + 1'),
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            // 3. Mark request as awarded
            DB::table('requests')
                ->where('id', $requestId)
                ->update([
                    'status' => 'awarded',
                    'version' => ((int) $request->version) + 1,
                    'correlation_id' => $correlationId,
                    'updated_at' => $now,
                ]);

            $items = is_string($request->item_list) ? json_decode($request->item_list, true) : (array) $request->item_list;
            if (! isset($scopeData['title'])) {
                $scopeData['title'] = is_array($items) && isset($items['title']) ? $items['title'] : (string) $request->description;
            }
            if (! isset($scopeData['milestone_stages']) && is_array($items) && isset($items['pipeline']['stages']) && is_array($items['pipeline']['stages'])) {
                $scopeData['milestone_stages'] = $items['pipeline']['stages'];
            }
            $milestoneStages = $scopeData['milestone_stages'] ?? null;
            if (is_array($milestoneStages) && $milestoneStages !== []) {
                try {
                    $scopeData['milestone_stages'] = $this->workSpecs->normalizeNodes(
                        $milestoneStages,
                        $workShape,
                        requireToolDefinitions: true,
                    );
                } catch (\InvalidArgumentException $error) {
                    throw new IdentityAccessError(
                        'INVALID_WORK_SPECIFICATION',
                        'The awarded Work pipeline needs valid authored checklist and measurement requirements.',
                        $correlationId,
                        status: 422,
                        fieldErrors: ['milestone_stages' => [$error->getMessage()]],
                    );
                }
            }

            $formed = $this->formation->formAward($userId, [
                'request_id' => $requestId,
                'quote_id' => $quoteId,
                'buyer_user_id' => $buyerUserId,
                'provider_user_id' => (string) $quote->provider_user_id,
                'listing_id' => $quote->listing_id,
                'capability_profile_id' => $request->capability_profile_id,
                'work_shape' => $workShape,
                'listing_type' => (string) ($scopeData['listing_type'] ?? 'service'),
                'source_listing_version_id' => $appointmentSource['listing_version_id'] ?? ($scopeData['source_listing_version_id'] ?? null),
                'appointment_reservation_id' => $appointmentReservationId,
                'appointment_slot' => $appointmentSlot,
                'amount_minor' => (int) $quote->amount_minor,
                'currency' => (string) $quote->currency,
                'scope' => $scopeData,
                'payment_lane_options' => is_string($quote->payment_lane_options)
                    ? json_decode($quote->payment_lane_options, true, 512, JSON_THROW_ON_ERROR)
                    : (array) $quote->payment_lane_options,
                'geography' => is_string($request->location) ? $request->location : json_encode($request->location, JSON_THROW_ON_ERROR),
            ], $correlationId);

            $orderId = (string) $formed['order_id'];
            $recipientUserId = $userId === $buyerUserId
                ? (string) $quote->provider_user_id
                : $buyerUserId;
            $this->notifications->recordIntent(new NotificationIntent(
                recipientUserId: $recipientUserId,
                eventSourceType: 'order',
                eventSourceId: $orderId,
                eventType: 'order.accepted',
                attention: NotificationAttention::Updates,
                title: 'Negotiated terms accepted',
                body: 'Review the accepted terms in your Order.',
                actionUrl: route('orders.show', ['order' => $orderId], false),
                idempotencyKey: 'order.accepted:'.$orderId.':v1:'.$recipientUserId,
                correlationId: $correlationId,
            ));
            foreach ($competingQuotes as $competingQuote) {
                $competingProviderUserId = (string) $competingQuote->provider_user_id;
                if (in_array($competingProviderUserId, [$buyerUserId, (string) $quote->provider_user_id, $userId], true)) {
                    continue;
                }

                $competingQuoteId = (string) $competingQuote->id;
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $competingProviderUserId,
                    eventSourceType: 'quote',
                    eventSourceId: $competingQuoteId,
                    eventType: 'tender.quote_not_selected',
                    attention: NotificationAttention::Updates,
                    title: 'Another quote was selected',
                    body: 'Review the status of your quote in your request workspace.',
                    actionUrl: route('quotes.mine', [], false),
                    idempotencyKey: 'tender.quote_not_selected:'.$competingQuoteId.':v'.((int) $competingQuote->version + 1).':'.$competingProviderUserId,
                    correlationId: $correlationId,
                ));
            }



            return [...$formed, 'quote_id' => $quoteId];
        });
    }
}
