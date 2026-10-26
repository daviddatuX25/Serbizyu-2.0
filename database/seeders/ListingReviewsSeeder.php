<?php

declare(strict_types=1);

namespace Database\Seeders;

use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

final class ListingReviewsSeeder extends Seeder
{
    private const LISTING_ID = '0198a3b1-7c40-7abc-8def-5234567890ab';

    private const CORRELATION_ID = '0198a3b1-7c40-7abc-8def-c01100000004';

    /**
     * @var list<array{
     *     user_id: string,
     *     display_name: string,
     *     phone: string,
     *     rating: int,
     *     content: string,
     *     chips: list<string>,
     *     photo: string,
     * }>
     */
    private const REVIEWS = [
        [
            'user_id' => '0198a3b1-7c40-7abc-8def-723456789101',
            'display_name' => 'Maria Santos',
            'phone' => '+639171000101',
            'rating' => 5,
            'content' => 'The technician cleaned our split-type aircon thoroughly and explained how to keep the filter clear. The room cooled much faster afterward.',
            'chips' => ['Thorough cleaning', 'Clear explanation', 'On time'],
            'photo' => 'ac-clean.jpg',
        ],
        [
            'user_id' => '0198a3b1-7c40-7abc-8def-723456789102',
            'display_name' => 'Ramon Dela Cruz',
            'phone' => '+639171000102',
            'rating' => 5,
            'content' => 'Our unit had a musty smell and weak airflow. Kuya Ben checked it carefully, cleaned the coil, and left the work area tidy.',
            'chips' => ['Problem solved', 'Careful work', 'Tidy workspace'],
            'photo' => 'ac-capacitor.jpg',
        ],
        [
            'user_id' => '0198a3b1-7c40-7abc-8def-723456789103',
            'display_name' => 'Liza Manalo',
            'phone' => '+639171000103',
            'rating' => 4,
            'content' => 'Good service and fair pricing. He found a worn capacitor, showed me the part before replacing it, and tested the unit before leaving.',
            'chips' => ['Fair pricing', 'Showed old part', 'Tested after repair'],
            'photo' => 'req-electrician.jpg',
        ],
        [
            'user_id' => '0198a3b1-7c40-7abc-8def-723456789104',
            'display_name' => 'Joel Reyes',
            'phone' => '+639171000104',
            'rating' => 5,
            'content' => 'He arrived within the agreed window and repaired a small drain leak during the cleaning. Clear updates from booking through completion.',
            'chips' => ['Reliable', 'Good communication', 'Careful inspection'],
            'photo' => 'req-cement.jpg',
        ],
    ];

    public function run(): void
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'local'));
        if (! in_array($environment, ['local', 'test', 'testing', 'capstone', 'team', 'training'], true)) {
            return;
        }

        $this->call(CapstoneContractSeeder::class);

        $listing = DB::table('listings')->where('id', self::LISTING_ID)->first();
        if ($listing === null) {
            return;
        }

        $now = CarbonImmutable::parse('2026-09-21T08:00:00Z');
        DB::transaction(function () use ($listing, $now): void {
            foreach (self::REVIEWS as $index => $review) {
                $userId = $review['user_id'];
                $sequence = sprintf('%02d', $index + 1);
                $orderId = '0198a3b1-7c40-7abc-8def-0f01000000'.$sequence;
                $evidenceId = '0198a3b1-7c40-7abc-8def-0f02000000'.$sequence;
                $reviewId = '0198a3b1-7c40-7abc-8def-0f03000000'.$sequence;
                $createdAt = $now->subDays(8 - $index * 2);

                $eligibleOrder = DB::table('orders as orders')
                    ->join('order_proposals as proposals', function ($join): void {
                        $join->on('proposals.id', '=', 'orders.current_proposal_id')
                            ->on('proposals.order_id', '=', 'orders.id');
                    })
                    ->join('order_terms_snapshots as terms', function ($join): void {
                        $join->on('terms.id', '=', 'orders.current_terms_snapshot_id')
                            ->on('terms.order_id', '=', 'orders.id');
                    })
                    ->join('work_instances as work', 'work.order_id', '=', 'orders.id')
                    ->join('payment_obligations as obligations', 'obligations.order_id', '=', 'orders.id')
                    ->where('orders.id', $orderId)
                    ->where('orders.listing_id', self::LISTING_ID)
                    ->where('orders.buyer_user_id', $userId)
                    ->where('orders.provider_user_id', (string) $listing->owner_user_id)
                    ->where('orders.status', 'completed')
                    ->whereNotNull('orders.completed_at')
                    ->where('proposals.status', 'accepted')
                    ->where('work.status', 'completed')
                    ->whereIn('obligations.status', ['due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'settled'])
                    ->whereRaw("NULLIF(BTRIM(terms.scope->>'title'), '') IS NOT NULL")
                    ->exists();

                if (! $eligibleOrder) {
                    DB::table('reviews')->where('id', $reviewId)->delete();
                    DB::table('evidence_files')->where('id', $evidenceId)->delete();
                    DB::table('orders')
                        ->where('id', $orderId)
                        ->where('status', 'completed')
                        ->whereNull('current_terms_snapshot_id')
                        ->whereNull('current_proposal_id')
                        ->update([
                            'status' => 'cancelled',
                            'completed_at' => null,
                            'cancelled_at' => $now,
                            'updated_at' => $now,
                        ]);

                    continue;
                }

                DB::table('users')->updateOrInsert(['id' => $userId], [
                    'phone_e164' => $review['phone'],
                    'status' => 'active',
                    'primary_access_tier' => 'L1',
                    'locale' => 'fil',
                    'timezone' => 'Asia/Manila',
                    'version' => 1,
                    'correlation_id' => self::CORRELATION_ID,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                DB::table('user_profiles')->updateOrInsert(['user_id' => $userId], [
                    'display_name' => $review['display_name'],
                    'public_bio' => 'Demo resident customer in Tagudin.',
                    'service_area_display' => 'Tagudin Centro',
                    'accessibility_preferences' => '{}',
                    'language_preferences' => '{"primary":"fil"}',
                    'version' => 1,
                    'correlation_id' => self::CORRELATION_ID,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('evidence_files')->updateOrInsert(['id' => $evidenceId], [
                    'owner_user_id' => $userId,
                    'storage_key' => $review['photo'],
                    'media_type' => 'image/jpeg',
                    'size_bytes' => 245760,
                    'content_hash' => hash('sha256', $review['photo']),
                    'evidence_type' => 'review_photo',
                    'data_class' => 'public',
                    'scan_status' => 'clean',
                    'visibility' => 'public',
                    'retention_policy' => 'standard',
                    'deleted_at' => null,
                    'version' => 1,
                    'correlation_id' => self::CORRELATION_ID,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);

                DB::table('reviews')->updateOrInsert(['id' => $reviewId], [
                    'order_id' => $orderId,
                    'work_instance_id' => null,
                    'author_user_id' => $userId,
                    'subject_user_id' => (string) $listing->owner_user_id,
                    'author_role' => 'buyer',
                    'rating' => $review['rating'],
                    'content' => $review['content'],
                    'attribute_chips' => json_encode($review['chips'], JSON_THROW_ON_ERROR),
                    'eligibility_evidence_file_id' => $evidenceId,
                    'moderation_status' => 'approved',
                    'sealed_until' => null,
                    'unblinded_at' => $createdAt,
                    'correlation_id' => self::CORRELATION_ID,
                    'version' => 1,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        });

        if ($this->command !== null) {
            $this->command->info('Seeded 4 verified reviews and evidence photos for Kuya Ben Aircon Cleaning.');
        }
    }
}
