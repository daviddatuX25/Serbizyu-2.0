<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class SubmitDealChainReviewsCommand
{
    private const ALLOWED_BUYER_CHIPS = [
        'on_time',
        'clean_workspace',
        'expert_fix',
        'fair_pricing',
        'respectful',
    ];

    public function __construct(
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /**
     * @param array{
     *     rating?: int,
     *     content?: string|null,
     *     attribute_chips?: list<string>,
     *     evidence_file_id?: string|null,
     * }|null $unifiedReview
     * @param list<array{
     *     order_id: string,
     *     rating: int,
     *     content?: string|null,
     *     attribute_chips?: list<string>,
     *     evidence_file_id?: string|null,
     * }>|null $granularReviews
     * @return array{
     *     submission_id: string,
     *     deal_chain_id: string,
     *     mode: string,
     *     submitted_count: int,
     *     reviews: list<array{
     *         order_id: string,
     *         review_id: string,
     *         status: string,
     *         unblinded: bool,
     *         sealed_until: string|null,
     *         unblinded_at: string|null,
     *     }>,
     * }
     */
    public function handle(
        string $dealChainId,
        string $authorUserId,
        string $submissionId,
        string $mode,
        ?array $unifiedReview,
        ?array $granularReviews,
        string $correlationId,
    ): array {
        if (! Schema::hasTable('deal_chains') || ! Schema::hasTable('orders') || ! Schema::hasTable('reviews')) {
            throw new TrustSupportError('STORAGE_UNAVAILABLE', 'Review subsystem storage is unavailable.', $correlationId, status: 503);
        }

        if (! in_array($mode, ['cascade', 'granular'], true)) {
            throw new TrustSupportError('INVALID_MODE', "Review mode must be 'cascade' or 'granular'.", $correlationId);
        }

        return DB::transaction(function () use (
            $dealChainId,
            $authorUserId,
            $submissionId,
            $mode,
            $unifiedReview,
            $granularReviews,
            $correlationId,
        ): array {
            $chain = DB::table('deal_chains')->where('id', $dealChainId)->first();
            if ($chain === null) {
                throw new TrustSupportError('DEAL_CHAIN_NOT_FOUND', 'The target deal chain was not found.', $correlationId, status: 404);
            }

            // Find all eligible completed child orders in this deal chain
            $childOrders = DB::table('orders')
                ->where('deal_chain_id', $dealChainId)
                ->where('buyer_user_id', $authorUserId)
                ->whereIn('status', ['accepted', 'closed'])
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($childOrders->isEmpty()) {
                throw new TrustSupportError('NO_ELIGIBLE_ORDERS', 'No eligible settled orders found in this deal chain.', $correlationId);
            }

            // Index granular reviews if mode is granular
            $granularMap = [];
            if ($mode === 'granular') {
                if (! is_array($granularReviews) || $granularReviews === []) {
                    throw new TrustSupportError('GRANULAR_REVIEWS_REQUIRED', 'Granular mode requires at least one per-node review.', $correlationId);
                }
                foreach ($granularReviews as $item) {
                    if (isset($item['order_id'])) {
                        $granularMap[(string) $item['order_id']] = $item;
                    }
                }
            } else {
                if (! is_array($unifiedReview) || ! isset($unifiedReview['rating'])) {
                    throw new TrustSupportError('UNIFIED_REVIEW_REQUIRED', 'Cascade mode requires a unified rating.', $correlationId);
                }
            }

            $now = CarbonImmutable::now();
            $results = [];

            foreach ($childOrders as $order) {
                $orderId = (string) $order->id;
                $subjectUserId = (string) $order->provider_user_id;

                // Check for active dispute
                if (Schema::hasTable('disputes')) {
                    $hasDispute = DB::table('disputes')
                        ->where('order_id', $orderId)
                        ->whereNotIn('status', ['resolved', 'closed'])
                        ->exists();
                    if ($hasDispute) {
                        continue; // Skip disputed orders from review ceremony
                    }
                }

                // Determine rating, content, chips, and evidence for this child order
                if ($mode === 'granular') {
                    $entry = $granularMap[$orderId] ?? null;
                    if ($entry === null) {
                        continue; // Buyer opted out of reviewing this specific node
                    }
                    $rating = max(1, min(5, (int) ($entry['rating'] ?? 5)));
                    $content = isset($entry['content']) ? (string) $entry['content'] : null;
                    $rawChips = (array) ($entry['attribute_chips'] ?? []);
                    $evidenceFileId = isset($entry['evidence_file_id']) ? (string) $entry['evidence_file_id'] : null;
                } else {
                    $rating = max(1, min(5, (int) $unifiedReview['rating']));
                    $content = isset($unifiedReview['content']) ? (string) $unifiedReview['content'] : null;
                    $rawChips = (array) ($unifiedReview['attribute_chips'] ?? []);
                    $evidenceFileId = isset($unifiedReview['evidence_file_id']) ? (string) $unifiedReview['evidence_file_id'] : null;
                }

                $validChips = array_values(array_intersect($rawChips, self::ALLOWED_BUYER_CHIPS));

                // Pairwise Independent Unblinding: check if this specific provider has already reviewed
                $counterpartyReview = DB::table('reviews')
                    ->where('order_id', $orderId)
                    ->where('author_user_id', $subjectUserId)
                    ->where('subject_user_id', $authorUserId)
                    ->lockForUpdate()
                    ->first();

                $willUnblind = $counterpartyReview !== null;
                $moderationStatus = $willUnblind ? 'approved' : 'sealed';
                $unblindedAt = $willUnblind ? $now : null;
                $sealedUntil = $willUnblind ? null : $now->addHours(72);

                $existing = DB::table('reviews')
                    ->where('order_id', $orderId)
                    ->where('author_user_id', $authorUserId)
                    ->first();

                $reviewId = (string) Str::uuid7();

                if ($existing !== null) {
                    $reviewId = (string) $existing->id;
                    DB::table('reviews')->where('id', $reviewId)->update([
                        'rating' => $rating,
                        'content' => $content,
                        'author_role' => 'buyer',
                        'deal_chain_id' => $dealChainId,
                        'submission_mode' => $mode,
                        'submission_id' => $submissionId,
                        'attribute_chips' => json_encode($validChips, JSON_THROW_ON_ERROR),
                        'eligibility_evidence_file_id' => $evidenceFileId,
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
                        'deal_chain_id' => $dealChainId,
                        'submission_mode' => $mode,
                        'submission_id' => $submissionId,
                        'author_user_id' => $authorUserId,
                        'subject_user_id' => $subjectUserId,
                        'author_role' => 'buyer',
                        'rating' => $rating,
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

                // Audit event
                $auditId = $this->audits->record(
                    action: 'deal_chain.node_reviewed',
                    targetType: 'order',
                    targetId: $orderId,
                    correlationId: $correlationId,
                    actor: ActorContext::human($authorUserId),
                    orderId: $orderId,
                    next: [
                        'deal_chain_id' => $dealChainId,
                        'mode' => $mode,
                        'rating' => $rating,
                        'status' => $moderationStatus,
                    ],
                );

                // Outbox event
                $this->outbox->enqueue(
                    eventType: $willUnblind ? 'review.unblinded' : 'review.submitted',
                    aggregateType: 'order',
                    aggregateId: $orderId,
                    payload: [
                        'review_id' => $reviewId,
                        'order_id' => $orderId,
                        'deal_chain_id' => $dealChainId,
                        'author_user_id' => $authorUserId,
                        'subject_user_id' => $subjectUserId,
                        'rating' => $rating,
                        'mode' => $mode,
                        'will_unblind' => $willUnblind,
                    ],
                    correlationId: $correlationId,
                    auditEventId: $auditId,
                );

                $results[] = [
                    'order_id' => $orderId,
                    'review_id' => $reviewId,
                    'status' => $moderationStatus,
                    'unblinded' => $willUnblind,
                    'sealed_until' => $sealedUntil?->toISOString(),
                    'unblinded_at' => $unblindedAt?->toISOString(),
                ];
            }

            // Overall Deal Chain audit
            $this->audits->record(
                action: 'deal_chain.reviews_submitted',
                targetType: 'deal_chain',
                targetId: $dealChainId,
                correlationId: $correlationId,
                actor: ActorContext::human($authorUserId),
                next: [
                    'submission_id' => $submissionId,
                    'mode' => $mode,
                    'count' => count($results),
                ],
            );

            return [
                'submission_id' => $submissionId,
                'deal_chain_id' => $dealChainId,
                'mode' => $mode,
                'submitted_count' => count($results),
                'reviews' => $results,
            ];
        });
    }
}
