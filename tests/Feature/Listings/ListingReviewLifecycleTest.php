<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function reviewListingFixture(User $owner): array
{
    app(WorkCatalogSeeder::class)->run();

    return app(CreateListingDraft::class)->handle(new ResourceActor((string) $owner->id, (string) $owner->id), [
        'title' => 'Reviewable Tagudin listing',
        'description' => 'A locally authored listing awaiting staff review.',
        'category_code' => 'food',
        'listing_type' => 'product',
        'work_shape' => 'A4',
        'work_catalog_code' => 'set-product-market-handoff',
        'work_set_version' => 1,
        'variants' => [['id' => 'variant-olive', 'name' => 'Olive', 'price' => 120, 'stock' => 4, 'is_default' => true]],
        'media' => ['items' => [['id' => 'cover', 'kind' => 'photo', 'url' => '/olive.jpg', 'is_cover' => true]]],
        'deal_chain_combinations' => [['id' => 'pickup', 'title' => 'Pickup', 'isDefault' => true]],
        'deal_chain_specification' => ['based_on_recipe_code' => 'direct'],
        'prep_lead_time' => 'same_day',
    ], (string) Str::uuid7());
}

it('lets authorized staff approve a pending listing without rewriting its authored terms', function (): void {
    $owner = User::factory()->create(['status' => 'active']);
    $listing = reviewListingFixture($owner);
    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'pending_review',
        'review_status' => 'pending',
    ]);
    $originalTerms = DB::table('listing_versions')->where('listing_id', $listing['id'])->value('terms');
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);

    $this->actingAs($staff)
        ->post(route('admin.listings.approve', $listing['id']), ['expected_version' => $listing['expected_version']])
        ->assertRedirect(route('admin.listings.index'));

    expect(DB::table('listings')->where('id', $listing['id'])->value('status'))->toBe('active')
        ->and(DB::table('listings')->where('id', $listing['id'])->value('review_status'))->toBe('approved')
        ->and(DB::table('listing_versions')->where('listing_id', $listing['id'])->value('terms'))->toBe($originalTerms);
});

it('lets authorized staff reject a pending listing and prevents non-staff decisions', function (): void {
    $owner = User::factory()->create(['status' => 'active']);
    $listing = reviewListingFixture($owner);
    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'pending_review',
        'review_status' => 'pending',
    ]);
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);

    $this->actingAs($staff)
        ->post(route('admin.listings.reject', $listing['id']), [
            'expected_version' => $listing['expected_version'],
            'reason' => 'Please clarify package contents.',
        ])
        ->assertRedirect(route('admin.listings.index'));

    expect(DB::table('listings')->where('id', $listing['id'])->value('status'))->toBe('rejected')
        ->and(DB::table('listings')->where('id', $listing['id'])->value('review_status'))->toBe('rejected');

    $pending = reviewListingFixture(User::factory()->create(['status' => 'active']));
    DB::table('listings')->where('id', $pending['id'])->update([
        'status' => 'pending_review',
        'review_status' => 'pending',
    ]);
    $nonStaff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L1']);

    $this->actingAs($nonStaff)
        ->post(route('admin.listings.approve', $pending['id']), ['expected_version' => $pending['expected_version']])
        ->assertForbidden();

    expect(DB::table('listings')->where('id', $pending['id'])->value('status'))->toBe('pending_review');
});

it('filters the staff listing registry by the actual moderation status', function (): void {
    $listing = reviewListingFixture(User::factory()->create(['status' => 'active']));
    DB::table('listings')->where('id', $listing['id'])->update([
        'status' => 'pending_review',
        'review_status' => 'pending',
    ]);
    $staff = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
    $reference = DB::table('listings')->where('id', $listing['id'])->value('public_reference');

    $this->actingAs($staff)->withHeaders([
        'X-Inertia' => 'true',
        'X-Requested-With' => 'XMLHttpRequest',
        'X-Inertia-Version' => hash_file('xxh128', public_path('build/manifest.json')),
    ])
        ->getJson(route('admin.listings.index', ['status' => 'pending', 'q' => $reference]))
        ->assertOk()
        ->assertJsonPath('props.registry.rows.meta.total', 1)
        ->assertJsonFragment(['id' => $listing['id'], 'title' => $listing['title']]);

    $this->getJson(route('admin.listings.index', ['status' => 'approved', 'q' => $reference]))
        ->assertOk()
        ->assertJsonPath('props.registry.rows.meta.total', 0);
});
