<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use Tests\TestCase;

final class DynamicSlotCandidatesTest extends TestCase
{
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
}
