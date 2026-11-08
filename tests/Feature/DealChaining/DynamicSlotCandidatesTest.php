<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DynamicSlotCandidatesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_it_returns_candidates_for_courier_store_and_labor_roles(): void
    {
        $response = $this->getJson('/api/deal-chains/slot-candidates?role=COURIER');
        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'title',
                    'provider_name',
                    'area',
                    'price_minor',
                    'sla_text',
                    'rating',
                    'role',
                    'photo_url',
                ],
            ],
            'meta' => [
                'role',
                'count',
                'locality',
                'open_pool_supported',
            ],
        ]);

        $this->assertSame('COURIER', $response->json('meta.role'));
        $this->assertSame('Tagudin', $response->json('meta.locality'));
        $this->assertTrue($response->json('meta.open_pool_supported'));
    }

    public function test_it_never_leaks_phone_or_sensitive_credentials(): void
    {
        foreach (['STORE', 'COURIER', 'LABOR'] as $role) {
            $response = $this->getJson("/api/deal-chains/slot-candidates?role={$role}");
            $response->assertOk();

            $data = $response->json('data') ?? [];
            foreach ($data as $candidate) {
                $this->assertArrayNotHasKey('phone_e164', $candidate);
                $this->assertArrayNotHasKey('phone', $candidate);
                $this->assertArrayNotHasKey('email', $candidate);
                $this->assertArrayNotHasKey('password', $candidate);
                $this->assertArrayNotHasKey('remember_token', $candidate);
                $this->assertNotEmpty($candidate['provider_name']);
                $this->assertStringContainsString('Tagudin', $candidate['area']);
            }
        }
    }

    public function test_it_returns_empty_data_cleanly_when_no_candidates_match_filter(): void
    {
        $response = $this->getJson('/api/deal-chains/slot-candidates?role=AUDIT&category=non_existent_category_xyz');
        $response->assertOk();
        $response->assertJson([
            'data' => [],
            'meta' => [
                'role' => 'AUDIT',
                'count' => 0,
                'locality' => 'Tagudin',
                'open_pool_supported' => true,
            ],
        ]);
    }

    public function test_it_normalizes_role_aliases_consistently(): void
    {
        $riderRes = $this->getJson('/api/deal-chains/slot-candidates?role=RIDER');
        $riderRes->assertOk();
        $this->assertSame('COURIER', $riderRes->json('meta.role'));

        $techRes = $this->getJson('/api/deal-chains/slot-candidates?role=TECHNICIAN');
        $techRes->assertOk();
        $this->assertSame('LABOR', $techRes->json('meta.role'));

        $partRes = $this->getJson('/api/deal-chains/slot-candidates?role=PART');
        $partRes->assertOk();
        $this->assertSame('STORE', $partRes->json('meta.role'));
    }

    public function test_candidate_api_returns_current_pins_and_truthful_price_and_review_state_for_audit_and_recycle(): void
    {
        $owner = User::factory()->create();
        $actor = new ResourceActor((string) $owner->id, (string) $owner->id);
        $createActiveService = function (string $title, ?int $priceMinor) use ($actor): array {
            $attributes = [
                'title' => $title,
                'description' => 'Live slot candidate API fixture.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => 'A1',
            ];
            if ($priceMinor !== null) {
                $attributes['price_amount_minor'] = $priceMinor;
            }

            $listing = app(CreateListingDraft::class)->handle($actor, $attributes, (string) Str::uuid7());
            DB::table('listings')->where('id', $listing['id'])->update([
                'status' => 'active',
                'review_status' => 'approved',
            ]);
            DB::table('listing_versions')->where('listing_id', $listing['id'])->update(['published_at' => now()]);

            return [
                'id' => (string) $listing['id'],
                'version_id' => (string) DB::table('listing_versions')->where('listing_id', $listing['id'])->value('id'),
            ];
        };
        $audit = $createActiveService('Residential safety audit service', 12500);
        $recycle = $createActiveService('Appliance recycle collection service', 0);
        $unpriced = $createActiveService('Unpriced Tagudin repair service', null);

        $auditData = collect($this->getJson('/api/deal-chains/slot-candidates?role=AUDIT')->assertOk()->json('data'))->keyBy('id');
        $recycleData = collect($this->getJson('/api/deal-chains/slot-candidates?role=RECYCLE')->assertOk()->json('data'))->keyBy('id');
        $unpricedData = collect($this->getJson('/api/deal-chains/slot-candidates?role=LABOR')->assertOk()->json('data'))->keyBy('id');

        $auditCandidate = $auditData[$audit['id']];
        self::assertSame($audit['version_id'], $auditCandidate['listing_version_id']);
        self::assertSame(12500, $auditCandidate['price_minor']);
        self::assertSame(0, $auditCandidate['reviews_count']);
        self::assertNull($auditCandidate['rating']);

        $recycleCandidate = $recycleData[$recycle['id']];
        self::assertSame($recycle['version_id'], $recycleCandidate['listing_version_id']);
        self::assertSame(0, $recycleCandidate['price_minor']);

        self::assertNull($unpricedData[$unpriced['id']]['price_minor']);
        self::assertNull($unpricedData[$unpriced['id']]['rating']);
        $candidateIds = array_merge($auditData->keys()->all(), $recycleData->keys()->all(), $unpricedData->keys()->all());
        self::assertTrue(collect($candidateIds)->every(static fn (string $id): bool => Str::isUuid($id)));
        self::assertSame(
            count($candidateIds),
            DB::table('listings')->whereIn('id', $candidateIds)->count(),
        );
    }
}
