<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealChainCurrentChildrenPort;
use App\Shared\Contracts\DealChildFinancialStatePort;
use App\Shared\Contracts\ReviewOrderReaderPort;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class SubmitReviewCommand
{
    private const ALLOWED_BUYER_CHIPS = [
        'on_time',
        'clean_workspace',
        'expert_fix',
        'fair_pricing',
        'respectful',
    ];

    private const ALLOWED_PROVIDER_CHIPS = [
        'cash_ready_on_site',
        'site_accessible',
        'respectful_communication',
    ];

    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly DealChainCurrentChildrenPort $currentChildren,
        private readonly ReviewOrderReaderPort $orders,
        private readonly DealChildFinancialStatePort $financialState,
    ) {}

    /**
     * @param  list<string>  $attributeChips
     * @return array{id: string, status: string, unblinded: bool, cascaded_count: int}
     */
    public function handle(
        string $orderId,
        string $authorUserId,
        int $rating,
        ?string $content,
        array $attributeChips,
        bool $cascade,
        ?string $evidenceFileId,
        string $correlationId,
    ): array {
        if (! Schema::hasTable('reviews')) {
            throw new TrustSupportError('STORAGE_UNAVAILABLE', 'Review subsystem tables are not available.', $correlationId, status: 503);
        }

        return DB::transaction(function () use (
            $orderId,
            $authorUserId,
            $rating,
            $content,
            $attributeChips,
            $cascade,
            $evidenceFileId,
            $correlationId,
        ): array {
            $orderContext = $this->orders->dealChainIdForOrder($orderId);
            if ($orderContext === null) {
                throw new TrustSupportError('ORDER_NOT_FOUND', 'The order for this review does not exist.', $correlationId, status: 404);
            }

            $dealChainId = $orderContext['deal_chain_id'];
            $currentOrderIds = [];
            if ($dealChainId !== null) {
                if (! $this->currentChildren->lockReviewChain($dealChainId)) {
                    throw new TrustSupportError('ORDER_NOT_REVIEWABLE', 'The order references a deal chain that is no longer available.', $correlationId, status: 409);
                }
                $currentOrderIds = $this->currentChildren->currentConfirmedOrderIds($dealChainId);
            }

            $order = $this->orders->findOrderForUpdate($orderId);
            if ($order === null) {
                throw new TrustSupportError('ORDER_NOT_FOUND', 'The order for this review does not exist.', $correlationId, status: 404);
            }
            if ($order['deal_chain_id'] !== $dealChainId) {
                throw new TrustSupportError('ORDER_NOT_REVIEWABLE', 'The order changed while review eligibility was checked.', $correlationId, status: 409);
            }

            $isBuyer = $order['buyer_user_id'] === $authorUserId;
            $isProvider = $order['provider_user_id'] === $authorUserId;
            if (! $isBuyer && ! $isProvider) {
                throw new TrustSupportError('UNAUTHORIZED', 'You are not a party to this order.', $correlationId, status: 403);
            }
            if ($order['status'] !== 'completed') {
                throw new TrustSupportError('ORDER_NOT_REVIEWABLE', 'Only completed orders can be reviewed.', $correlationId, status: 409);
            }
            if ($dealChainId !== null && ! in_array($orderId, $currentOrderIds, true)) {
                throw new TrustSupportError('ORDER_NOT_REVIEWABLE', 'This historical deal child is no longer eligible for review.', $correlationId, status: 409);
            }

            $siblingOrders = [];
            if ($isBuyer && $cascade && $dealChainId !== null) {
                $siblingOrders = $this->orders->completedDealChainChildrenForUpdate($currentOrderIds, $dealChainId, $authorUserId);
            }

            $settlement = $this->financialState->forDealChild($orderId);
            if ($settlement === null || ! $settlement['settled'] || $settlement['settled_at'] === null) {
                throw new TrustSupportError('ORDER_NOT_SETTLED', 'Reviews are available only after verified settlement.', $correlationId, status: 409);
            }
            $settledAt = CarbonImmutable::parse($settlement['settled_at']);
            if ($settledAt->addHours(72)->isPast()) {
                throw new TrustSupportError('REVIEW_WINDOW_EXPIRED', 'The 72-hour review ceremony window has closed.', $correlationId);
            }

            $subjectUserId = $isBuyer ? $order['provider_user_id'] : $order['buyer_user_id'];
            $authorRole = $isBuyer ? 'buyer' : 'provider';

            // Check if active dispute exists
            if (Schema::hasTable('disputes')) {
                $hasDispute = DB::table('disputes')
                    ->where('order_id', $orderId)
                    ->whereNotIn('status', ['resolved', 'closed'])
                    ->exists();
                if ($hasDispute) {
                    throw new TrustSupportError('DISPUTE_ACTIVE', 'Reviews cannot be submitted while an active dispute is open.', $correlationId);
                }
            }

            // Validate chips allowlist
            $allowed = $isBuyer ? self::ALLOWED_BUYER_CHIPS : self::ALLOWED_PROVIDER_CHIPS;
            $validChips = array_values(array_intersect($attributeChips, $allowed));

            // Validate stars (buyers give 1-5; provider gives non-numeric citizen reliability, rating is null)
            $effectiveRating = $isBuyer ? max(1, min(5, $rating)) : null;
            // Check if counterparty has already submitted
            $counterpartyReview = DB::table('reviews')
                ->where('order_id', $orderId)
                ->where('author_user_id', $subjectUserId)
                ->where('subject_user_id', $authorUserId)
                ->lockForUpdate()
                ->first();

            $now = CarbonImmutable::now();
            $hasHold = false;
            if (Schema::hasTable('administrative_holds')) {
                $hasHold = DB::table('administrative_holds')
                    ->where(function ($q) use ($orderId, $settlement): void {
                        $q->where('order_id', $orderId);
                        if (isset($settlement['obligation_id']) && $settlement['obligation_id'] !== null) {
                            $q->orWhere('payment_obligation_id', $settlement['obligation_id']);
                        }
                    })
                    ->whereIn('status', ['active', 'reviewing'])
                    ->where('effective_at', '<=', now())
                    ->exists();
            }
            $willUnblind = $counterpartyReview !== null && ! $hasHold;
            $moderationStatus = $willUnblind ? 'approved' : 'sealed';
            $unblindedAt = $willUnblind ? $now : null;
            $sealedUntil = $willUnblind ? null : $settledAt->addHours(72);

            // Upsert / insert review for this order
            $reviewId = (string) Str::uuid7();
            $existing = DB::table('reviews')
                ->where('order_id', $orderId)
                ->where('author_user_id', $authorUserId)
                ->first();

            if ($existing !== null) {
                $reviewId = (string) $existing->id;
                DB::table('reviews')->where('id', $reviewId)->update([
                    'rating' => $effectiveRating,
                    'content' => $content,
                    'author_role' => $authorRole,
                    'attribute_chips' => json_encode($validChips, JSON_THROW_ON_ERROR),
                    'moderation_status' => $moderationStatus,
                    'sealed_until' => $sealedUntil,
                    'unblinded_at' => $unblindedAt,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('reviews')->insert([
                    'id' => $reviewId,
                    'order_id' => $orderId,
                    'work_instance_id' => null,
                    'author_user_id' => $authorUserId,
                    'subject_user_id' => $subjectUserId,
                    'author_role' => $authorRole,
                    'rating' => $effectiveRating,
                    'content' => $content,
                    'attribute_chips' => json_encode($validChips, JSON_THROW_ON_ERROR),
                    'eligibility_evidence_file_id' => $evidenceFileId,
                    'moderation_status' => $moderationStatus,
                    'sealed_until' => $sealedUntil,
                    'unblinded_at' => $unblindedAt,
                    'correlation_id' => $correlationId,
                    'version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // If unblinding, unblind the counterparty review as well
            if ($willUnblind && $counterpartyReview !== null) {
                DB::table('reviews')->where('id', $counterpartyReview->id)->update([
                    'moderation_status' => 'approved',
                    'sealed_until' => null,
                    'unblinded_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // AD-21 Cascading Deal Chain Reviews
            $cascadedCount = 0;
            if ($isBuyer && $cascade && $dealChainId !== null) {
                foreach ($siblingOrders as $sibling) {
                    $siblingOrderId = $sibling['order_id'];
                    if ($siblingOrderId === $orderId) {
                        continue;
                    }

                    $siblingSettlement = $this->financialState->forDealChild($siblingOrderId);
                    if ($siblingSettlement === null || ! $siblingSettlement['settled'] || $siblingSettlement['settled_at'] === null) {
                        continue;
                    }
                    $siblingSettledAt = CarbonImmutable::parse($siblingSettlement['settled_at']);
                    $siblingSealedUntil = $siblingSettledAt->addHours(72);
                    if ($siblingSealedUntil->isPast()) {
                        continue;
                    }

                    $sibExisting = DB::table('reviews')
                        ->where('order_id', $siblingOrderId)
                        ->where('author_user_id', $authorUserId)
                        ->exists();

                    if (! $sibExisting) {
                        $sibCounterparty = DB::table('reviews')
                            ->where('order_id', $siblingOrderId)
                            ->where('author_user_id', $sibling['provider_user_id'])
                            ->where('subject_user_id', $authorUserId)
                            ->lockForUpdate()
                            ->first();
                        $sibHasHold = false;
                        if (Schema::hasTable('administrative_holds')) {
                            $sibHasHold = DB::table('administrative_holds')
                                ->where(function ($q) use ($siblingOrderId, $siblingSettlement): void {
                                    $q->where('order_id', $siblingOrderId);
                                    if (isset($siblingSettlement['obligation_id']) && $siblingSettlement['obligation_id'] !== null) {
                                        $q->orWhere('payment_obligation_id', $siblingSettlement['obligation_id']);
                                    }
                                })
                                ->whereIn('status', ['active', 'reviewing'])
                                ->where('effective_at', '<=', now())
                                ->exists();
                        }
                        $sibWillUnblind = $sibCounterparty !== null && ! $sibHasHold;
                        $sibModerationStatus = $sibWillUnblind ? 'approved' : 'sealed';
                        $sibUnblindedAt = $sibWillUnblind ? $now : null;
                        $sibSealedUntil = $sibWillUnblind ? null : $siblingSealedUntil;
                        DB::table('reviews')->insert([
                            'id' => (string) Str::uuid7(),
                            'order_id' => $siblingOrderId,
                            'work_instance_id' => null,
                            'author_user_id' => $authorUserId,
                            'subject_user_id' => $sibling['provider_user_id'],
                            'author_role' => 'buyer',
                            'rating' => $effectiveRating,
                            'content' => $content,
                            'attribute_chips' => json_encode($validChips, JSON_THROW_ON_ERROR),
                            'eligibility_evidence_file_id' => $evidenceFileId,
                            'moderation_status' => $sibModerationStatus,
                            'sealed_until' => $sibSealedUntil,
                            'unblinded_at' => $sibUnblindedAt,
                            'correlation_id' => $correlationId,
                            'version' => 1,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        if ($sibWillUnblind && $sibCounterparty !== null) {
                            DB::table('reviews')->where('id', $sibCounterparty->id)->update([
                                'moderation_status' => 'approved',
                                'sealed_until' => null,
                                'unblinded_at' => $now,
                                'updated_at' => $now,
                            ]);
                        }
                        $cascadedCount++;
                    }
                }
            }

            // Audit event
            $auditId = $this->audits->record(
                action: 'review.submitted',
                targetType: 'order',
                targetId: $orderId,
                correlationId: $correlationId,
                actor: ActorContext::human($authorUserId),
                orderId: $orderId,
            );

            // Outbox event
            $this->outbox->enqueue(
                eventType: $willUnblind ? 'review.unblinded' : 'review.submitted',
                aggregateType: 'order',
                aggregateId: $orderId,
                payload: [
                    'review_id' => $reviewId,
                    'order_id' => $orderId,
                    'author_user_id' => $authorUserId,
                    'subject_user_id' => $subjectUserId,
                    'rating' => $effectiveRating,
                    'will_unblind' => $willUnblind,
                    'cascaded_count' => $cascadedCount,
                ],
                correlationId: $correlationId,
                auditEventId: $auditId,
            );

            return [
                'id' => $reviewId,
                'status' => $moderationStatus,
                'unblinded' => $willUnblind,
                'cascaded_count' => $cascadedCount,
            ];
        });
    }
}
