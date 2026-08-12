<?php

declare(strict_types=1);

use App\Models\User;
use App\Modules\IdentityAccess\Application\ConsentGrantService;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\IdentityAccess\Application\IdentityVerificationGate;
use App\Modules\IdentityAccess\Application\ResourceActorResolver;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ActorContext;
use App\Shared\Application\ResourceActor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function t1aPgsqlOrSkip(): void
{
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('T1A identity proofs require PostgreSQL.');
    }
}

it('grants additive buy and provide role assignments', function (): void {
    t1aPgsqlOrSkip();

    $user = User::factory()->create();
    $roles = app(RoleAssignmentService::class);
    $correlationId = (string) Str::uuid7();

    $roles->ensureActive($user->id, 'buy', $correlationId, ['source' => 'test']);
    $roles->ensureActive($user->id, 'provide', $correlationId, ['source' => 'test']);
    $roles->ensureActive($user->id, 'buy', $correlationId, ['source' => 'test']);

    expect($roles->activeRoleCodes($user->id))->toBe(['buy', 'provide']);
    expect(DB::table('role_assignments')->where('user_id', $user->id)->where('status', 'active')->count())->toBe(2);
});

it('allows acting-for only while consent grant is active', function (): void {
    t1aPgsqlOrSkip();

    $owner = User::factory()->create();
    $agent = User::factory()->create();
    $consents = app(ConsentGrantService::class);
    $correlationId = (string) Str::uuid7();

    $grantId = $consents->grant(
        grantorUserId: $owner->id,
        granteeUserId: $agent->id,
        resourceType: 'listing',
        resourceId: null,
        permissionScope: ['actions' => ['listing.update']],
        correlationId: $correlationId,
    );

    $actor = ActorContext::actingFor($agent->id, $owner->id, $grantId);
    expect($actor->actingForUserId)->toBe($owner->id);
    expect($actor->grantReference)->toBe($grantId);

    DB::transaction(function () use ($consents, $grantId, $agent, $owner, $correlationId): void {
        $consents->assertActiveForActingFor($grantId, $agent->id, $owner->id, $correlationId, 'listing', 'listing.update');
    });

    $consents->revoke($grantId, $owner->id, $correlationId);

    expect(fn () => DB::transaction(function () use ($consents, $grantId, $agent, $owner, $correlationId): void {
        $consents->assertActiveForActingFor($grantId, $agent->id, $owner->id, $correlationId, 'listing', 'listing.update');
    }))->toThrow(IdentityAccessError::class);
});

it('denies live government-id collection when activation is off', function (): void {
    t1aPgsqlOrSkip();

    config()->set('serbizyu.identity.live_government_id_collection', false);
    $gate = app(IdentityVerificationGate::class);

    expect(fn () => $gate->assertLiveCollectionAllowed((string) Str::uuid7()))
        ->toThrow(IdentityAccessError::class);
});

it('lets an agent update a listing draft only with an active consent grant', function (): void {
    t1aPgsqlOrSkip();

    $owner = User::factory()->create();
    $agent = User::factory()->create();
    $correlationId = (string) Str::uuid7();
    $consents = app(ConsentGrantService::class);

    $ownerActor = new ResourceActor($owner->id, $owner->id);
    $listing = app(CreateListingDraft::class)->handle($ownerActor, [
        'title' => 'Agent assisted draft',
        'description' => 'Owned by the provider; edited by an agent under consent.',
        'category_code' => 'home-help',
        'listing_type' => 'service',
    ], $correlationId);

    $grantId = $consents->grant(
        grantorUserId: $owner->id,
        granteeUserId: $agent->id,
        resourceType: 'listing',
        resourceId: null,
        permissionScope: ['actions' => ['listing.update']],
        correlationId: $correlationId,
    );

    $agentActor = new ResourceActor($owner->id, $agent->id, $grantId);
    $saved = app(UpdateListingDraft::class)->handle(
        (string) $listing['id'],
        $agentActor,
        (int) $listing['version'],
        ['title' => 'Agent revised title'],
        $correlationId,
    );

    expect($saved['title'])->toBe('Agent revised title');
    expect(DB::table('listings')->where('id', $listing['id'])->value('owner_user_id'))->toBe($owner->id);
    expect(DB::table('listing_versions')->where('listing_id', $listing['id'])->orderByDesc('version_number')->value('authored_by_user_id'))
        ->toBe($agent->id);

    $consents->revoke($grantId, $owner->id, $correlationId);

    expect(fn () => app(UpdateListingDraft::class)->handle(
        (string) $listing['id'],
        $agentActor,
        (int) $saved['version'],
        ['title' => 'Should fail'],
        $correlationId,
    ))->toThrow(ListingError::class);
});

it('denies partial acting-for headers without a consent grant', function (): void {
    t1aPgsqlOrSkip();

    $agent = User::factory()->create();
    $owner = User::factory()->create();
    $request = Request::create('/listings', 'POST', [
        'acting_for_user_id' => $owner->id,
    ]);
    $request->setUserResolver(fn () => $agent);

    expect(fn () => app(ResourceActorResolver::class)->resolve(
        $request,
        $agent->id,
        (string) Str::uuid7(),
        'listing',
        'listing.update',
    ))->toThrow(IdentityAccessError::class);
});
