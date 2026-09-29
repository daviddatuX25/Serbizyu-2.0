<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\OutboxWriter;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class UnblindExpiredReviewsCommand extends Command
{
    protected $signature = 'reviews:unblind-expired';
    protected $description = 'Unblind sealed reviews that have passed their 72-hour double-blind window.';

    public function handle(AuditRecorder $audits, OutboxWriter $outbox): int
    {
        if (! Schema::hasTable('reviews')) {
            $this->components->warn('Reviews table does not exist.');

            return self::SUCCESS;
        }

        $now = CarbonImmutable::now();

        $expired = DB::table('reviews')
            ->where('moderation_status', 'sealed')
            ->whereNotNull('sealed_until')
            ->where('sealed_until', '<=', $now)
            ->lockForUpdate()
            ->get();

        if ($expired->isEmpty()) {
            $this->components->info('No expired sealed reviews found.');

            return self::SUCCESS;
        }

        $count = 0;
        foreach ($expired as $review) {
            DB::table('reviews')->where('id', $review->id)->update([
                'moderation_status' => 'approved',
                'sealed_until' => null,
                'unblinded_at' => $now,
                'updated_at' => $now,
            ]);

            $orderId = (string) $review->order_id;
            $correlationId = (string) ($review->correlation_id ?? $review->id);

            $auditId = $audits->record(
                action: 'review.unblinded_by_timeout',
                targetType: 'review',
                targetId: (string) $review->id,
                correlationId: $correlationId,
                actor: ActorContext::system(),
                orderId: $orderId !== '' ? $orderId : null,
                reason: '72-hour double-blind window elapsed',
            );

            $outbox->enqueue(
                eventType: 'review.unblinded',
                aggregateType: 'review',
                aggregateId: (string) $review->id,
                payload: [
                    'review_id' => $review->id,
                    'order_id' => $review->order_id,
                    'unblind_reason' => 'timeout_72h',
                ],
                correlationId: $correlationId,
                auditEventId: $auditId,
            );

            $count++;
        }

        $this->components->info("Successfully unblinded {$count} expired reviews.");

        return self::SUCCESS;
    }
}
