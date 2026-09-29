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
        if (! Schema::hasTable('orders') || ! Schema::hasTable('reviews')) {
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
            $order = DB::table('orders')->where('id', $orderId)->first();
            if ($order === null) {
                throw new TrustSupportError('ORDER_NOT_FOUND', 'The order for this review does not exist.', $correlationId, status: 404);
            }

            $isBuyer = $order->buyer_user_id === $authorUserId;
            $isProvider = $order->provider_user_id === $authorUserId;

            if (! $isBuyer && ! $isProvider) {
                throw new TrustSupportError('UNAUTHORIZED', 'You are not a party to this order.', $correlationId, status: 403);
            }

            $subjectUserId = $isBuyer ? (string) $order->provider_user_id : (string) $order->buyer_user_id;
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

            // Check 72h window from order updated_at
            $orderFinished = CarbonImmutable::parse($order->updated_at ?? now());
            if ($orderFinished->addHours(72)->isPast()) {
                throw new TrustSupportError('REVIEW_WINDOW_EXPIRED', 'The 72-hour review ceremony window has closed.', $correlationId);
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
            $willUnblind = $counterpartyReview !== null;
            $moderationStatus = $willUnblind ? 'approved' : 'sealed';
            $unblindedAt = $willUnblind ? $now : null;
            $sealedUntil = $willUnblind ? null : $now->addHours(72);

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
            if ($isBuyer && $cascade && ! empty($order->deal_chain_id)) {
                $siblingOrders = DB::table('orders')
                    ->where('deal_chain_id', $order->deal_chain_id)
                    ->where('id', '!=', $orderId)
                    ->where('buyer_user_id', $authorUserId)
                    ->whereIn('status', ['completed', 'accepted', 'agreed'])
                    ->get();

                foreach ($siblingOrders as $sib) {
                    $siblingSubjectId = (string) $sib->provider_user_id;
                    $sibExisting = DB::table('reviews')
                        ->where('order_id', $sib->id)
                        ->where('author_user_id', $authorUserId)
                        ->exists();

                    if (! $sibExisting) {
                        DB::table('reviews')->insert([
                            'id' => (string) Str::uuid7(),
                            'order_id' => $sib->id,
                            'work_instance_id' => null,
                            'author_user_id' => $authorUserId,
                            'subject_user_id' => $siblingSubjectId,
                            'author_role' => 'buyer',
                            'rating' => $effectiveRating,
                            'content' => $content,
                            'attribute_chips' => json_encode($validChips, JSON_THROW_ON_ERROR),
                            'eligibility_evidence_file_id' => $evidenceFileId,
                            'moderation_status' => 'sealed',
                            'sealed_until' => $now->addHours(72),
                            'unblinded_at' => null,
                            'correlation_id' => $correlationId,
                            'version' => 1,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
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
