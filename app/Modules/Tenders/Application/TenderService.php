<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
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
        private readonly RoleAssignmentService $roles,
    ) {}

    /**
     * @param array{
     *     amount_minor: int,
     *     currency?: string,
     *     message: string,
     *     estimated_duration?: string|null,
     *     work_shape?: string,
     *     listing_id?: string|null,
     *     idempotency_key?: string|null
     * } $input
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

            // Validate listing ownership if listing_id is supplied
            $listingId = $input['listing_id'] ?? null;
            if ($listingId !== null) {
                $ownsListing = DB::table('listings')
                    ->where('id', $listingId)
                    ->where('owner_user_id', $userId)
                    ->exists();

                if (! $ownsListing) {
                    throw new IdentityAccessError('INVALID_LISTING_OWNER', 'You may only quote with a listing you own.', $correlationId, status: 422);
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
                // Update existing quote lineage idempotently
                DB::table('quotes')
                    ->where('id', $existingQuote->id)
                    ->update([
                        'amount_minor' => $amountMinor,
                        'currency' => $currency,
                        'amount_components' => json_encode(['base' => $amountMinor], JSON_THROW_ON_ERROR),
                        'scope' => json_encode([
                            'message' => $message,
                            'proposal' => $message,
                            'estimated_duration' => $input['estimated_duration'] ?? null,
                        ], JSON_THROW_ON_ERROR),
                        'quote_version' => ((int) $existingQuote->quote_version) + 1,
                        'correlation_id' => $correlationId,
                        'updated_at' => $now,
                    ]);

                return [
                    'id' => (string) $existingQuote->id,
                    'request_id' => $requestId,
                    'provider_user_id' => $userId,
                    'amount_minor' => $amountMinor,
                    'currency' => $currency,
                    'status' => 'submitted',
                    'quote_version' => ((int) $existingQuote->quote_version) + 1,
                ];
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
                'scope' => json_encode([
                    'message' => $message,
                    'proposal' => $message,
                    'estimated_duration' => $input['estimated_duration'] ?? null,
                ], JSON_THROW_ON_ERROR),
                'inclusions' => null,
                'exclusions' => null,
                'expires_at' => now()->addDays(7),
                'work_shape' => $input['work_shape'] ?? 'A1',
                'payment_lane_options' => json_encode(['external_cash'], JSON_THROW_ON_ERROR),
                'status' => 'submitted',
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

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
     * @return array{order_id: string, quote_id: string}
     */
    public function acceptQuote(string $userId, string $requestId, string $quoteId, string $correlationId): array
    {
        return DB::transaction(function () use ($userId, $requestId, $quoteId, $correlationId): array {
            // Lock request row to serialize against other acceptances
            $request = DB::table('requests')
                ->where('id', $requestId)
                ->lockForUpdate()
                ->first();

            if ($request === null) {
                throw new IdentityAccessError('REQUEST_NOT_FOUND', 'The requested tender could not be found.', $correlationId, status: 404);
            }

            if ((string) $request->requester_user_id !== $userId) {
                throw new IdentityAccessError('AUTHORIZATION_DENIED', 'Only the requester can accept a quote.', $correlationId, status: 403);
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

            if ((string) $quote->status !== 'submitted') {
                throw new IdentityAccessError('INVALID_STATE', 'Quote cannot be accepted because it is not submitted.', $correlationId, status: 422);
            }

            // Enforce synchronous expiry guard
            if ($quote->expires_at !== null && now()->greaterThan($quote->expires_at)) {
                throw new IdentityAccessError('QUOTE_EXPIRED', 'This quote has expired.', $correlationId, status: 422);
            }

            $orderId = (string) Str::uuid7();
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

            // 4. Create Order in orders
            DB::table('orders')->insert([
                'id' => $orderId,
                'origin' => 'request',
                'mechanism' => 'quote_tender',
                'listing_id' => $quote->listing_id,
                'request_id' => $requestId,
                'quote_id' => $quoteId,
                'buyer_user_id' => $userId,
                'provider_user_id' => $quote->provider_user_id,
                'status' => 'accepted',
                'geography' => is_string($request->location) ? $request->location : json_encode($request->location),
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 5. Provision order_parties
            DB::table('order_parties')->insert([
                [
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'user_id' => $userId,
                    'party_type' => 'buyer',
                    'responsibility' => 'ordering_and_payment',
                    'scope' => json_encode(['role' => 'buyer'], JSON_THROW_ON_ERROR),
                    'consent_grant_id' => null,
                    'status' => 'active',
                    'effective_at' => $now,
                    'ended_at' => null,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'id' => (string) Str::uuid7(),
                    'order_id' => $orderId,
                    'user_id' => $quote->provider_user_id,
                    'party_type' => 'provider',
                    'responsibility' => 'fulfillment_and_service',
                    'scope' => json_encode(['role' => 'provider'], JSON_THROW_ON_ERROR),
                    'consent_grant_id' => null,
                    'status' => 'active',
                    'effective_at' => $now,
                    'ended_at' => null,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);

            // 6. Provision order_terms_snapshots
            $scopeData = is_string($quote->scope) ? json_decode($quote->scope, true) : (array) $quote->scope;
            if (! is_array($scopeData)) {
                $scopeData = ['details' => (string) $quote->scope];
            }
            if (! isset($scopeData['title'])) {
                $items = is_string($request->item_list) ? json_decode($request->item_list, true) : (array) $request->item_list;
                $scopeData['title'] = is_array($items) && isset($items['title']) ? $items['title'] : 'Tagudin Service Order';
            }

            DB::table('order_terms_snapshots')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'snapshot_version' => 1,
                'source_listing_version_id' => null,
                'source_quote_id' => $quoteId,
                'scope' => json_encode($scopeData, JSON_THROW_ON_ERROR),
                'scope_payload_version' => 1,
                'amount_minor' => $quote->amount_minor,
                'currency' => $quote->currency,
                'payment_lane_options' => is_string($quote->payment_lane_options)
                    ? $quote->payment_lane_options
                    : json_encode($quote->payment_lane_options, JSON_THROW_ON_ERROR),
                'payment_lane_options_payload_version' => 1,
                'cancellation_rules' => json_encode(['policy' => 'direct_agree'], JSON_THROW_ON_ERROR),
                'cancellation_rules_payload_version' => 1,
                'review_rules' => json_encode(['eligible_after' => 'work_completed'], JSON_THROW_ON_ERROR),
                'review_rules_payload_version' => 1,
                'policy_version_id' => null,
                'accepted_by_user_id' => $userId,
                'accepted_at' => $now,
                'correlation_id' => $correlationId,
                'created_at' => $now,
            ]);

            // 7. Provision work_instances (status not_started)
            $workId = (string) Str::uuid7();
            DB::table('work_instances')->insert([
                'id' => $workId,
                'order_id' => $orderId,
                'capability_profile_id' => $request->capability_profile_id,
                'work_shape' => $quote->work_shape ?: 'A1',
                'status' => 'not_started',
                'scheduled_at' => null,
                'started_at' => null,
                'completion_proposed_at' => null,
                'completed_at' => null,
                'structure' => null,
                'structure_payload_version' => null,
                'completion_evidence_id' => null,
                'correlation_id' => $correlationId,
                'version' => 1,
                'shape_contract_version' => 1,
                'payload_schema_version' => 1,
                'row_version' => 1,
                'revisions_allowed' => 0,
                'revisions_used' => 0,
                'awaiting_signoff_at' => null,
                'cancelled_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // 8. Provision payment_obligations
            DB::table('payment_obligations')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $orderId,
                'work_instance_id' => $workId,
                'purpose' => 'primary_consideration',
                'amount_minor' => $quote->amount_minor,
                'currency' => $quote->currency,
                'lane' => 'external_cash',
                'status' => 'created',
                'due_condition' => 'on_acceptance',
                'policy_version_id' => null,
                'platform_fee_amount_minor' => 0,
                'processor_cost_amount_minor' => 0,
                'payer_user_id' => $userId,
                'recipient_user_id' => $quote->provider_user_id,
                'correlation_id' => $correlationId,
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'order_id' => $orderId,
                'quote_id' => $quoteId,
            ];
        });
    }
}
