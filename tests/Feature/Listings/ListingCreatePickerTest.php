<?php

declare(strict_types=1);

namespace Tests\Feature\Listings;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

final class ListingCreatePickerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_listings_create_renders_picker_component(): void
    {
        $response = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null,
        ])->get('/listings/create');

        $response->assertOk();
        $this->assertSame('Listings/CreatePicker', $response->json('component'));
        $this->assertNotNull($response->json('props.correlationId'));
    }
    public function test_unauthenticated_request_with_edit_id_is_rejected_with_401(): void
    {
        $response = $this->get('/listings/create/service?edit=' . (string) Str::uuid7());
        $response->assertStatus(401);
    }

    public function test_nonexistent_edit_id_for_authenticated_user_returns_404(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/listings/create/service?edit=' . (string) Str::uuid7());
        $response->assertStatus(404);
    }

    public function test_mismatched_listing_type_for_edit_id_returns_400(): void
    {
        $user = User::factory()->create();
        $actor = new ResourceActor($user->id, $user->id);
        $correlationId = (string) Str::uuid7();

        $created = app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Tagudin Product Listing Sample',
            'description' => 'A physical product draft description that meets validation.',
            'category_code' => 'repairs',
            'listing_type' => 'product',
            'work_shape' => 'A4',
        ], $correlationId);

        $response = $this->actingAs($user)->get('/listings/create/service?edit=' . $created['id']);
        $response->assertStatus(400);
    }

    public function test_valid_edit_id_hydrates_editing_draft(): void
    {
        $user = User::factory()->create();
        $actor = new ResourceActor($user->id, $user->id);
        $correlationId = (string) Str::uuid7();

        $created = app(CreateListingDraft::class)->handle($actor, [
            'title' => 'Tagudin Service Listing Sample',
            'description' => 'A service listing draft description that meets validation.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ], $correlationId);

        $response = $this->actingAs($user)->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => file_exists(public_path('build/manifest.json')) ? hash_file('xxh128', public_path('build/manifest.json')) : null,
        ])->get('/listings/create/service?edit=' . $created['id']);

        $response->assertOk();
        $this->assertSame($created['id'], $response->json('props.editingDraft.id'));
        $this->assertSame('Tagudin Service Listing Sample', $response->json('props.editingDraft.title'));
    }
}
