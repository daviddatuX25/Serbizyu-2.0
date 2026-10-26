<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\SubmitListing;
use App\Modules\OrdersWork\Application\FinalizeOrderAgreement;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\ResourceActor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait CreatesAcceptedWorkOrder
{
    /**
     * @param  list<array<string, mixed>>  $milestoneStages
     * @return array{order_id: string, work_id: string, buyer: User, provider: User, listing_id: string, correlation_id: string}
     */
    protected function createAcceptedWorkOrder(string $workShape, array $milestoneStages): array
    {
        $provider = User::factory()->create();
        $buyer = User::factory()->create();
        $correlationId = (string) Str::uuid7();
        $listing = app(CreateListingDraft::class)->handle(
            new ResourceActor((string) $provider->id, (string) $provider->id),
            [
                'title' => 'Authored Work contract test listing',
                'description' => 'Listing used to form a real accepted Work contract in feature tests.',
                'category_code' => 'repairs',
                'listing_type' => 'service',
                'work_shape' => $workShape,
                'price_amount_minor' => 25000,
                'currency' => 'PHP',
                'milestone_stages' => $milestoneStages,
            ],
            $correlationId,
        );
        $submitted = app(SubmitListing::class)->handle(
            listingId: (string) $listing['id'],
            actor: new ResourceActor((string) $provider->id, (string) $provider->id),
            expectedVersion: (int) $listing['expected_version'],
            idempotencyKey: 'accepted-work-listing-'.Str::uuid7(),
            correlationId: $correlationId,
        );
        $reviewer = User::factory()->create(['status' => 'active', 'primary_access_tier' => 'L4']);
        $this->actingAs($reviewer)->post(route('admin.listings.approve', $listing['id']), [
            'expected_version' => $submitted['expected_version'],
        ])->assertRedirect(route('admin.listings.index'));

        $listingVersionNumber = (int) DB::table('listings')->where('id', $listing['id'])->value('current_version');
        $listingVersion = DB::table('listing_versions')
            ->where('listing_id', $listing['id'])
            ->where('version_number', $listingVersionNumber)
            ->firstOrFail();
        $proposal = app(SubmitOrderProposal::class)->handle(
            buyerUserId: (string) $buyer->id,
            listingId: (string) $listing['id'],
            expectedListingVersion: $listingVersionNumber,
            idempotencyKey: 'accepted-work-proposal-'.Str::uuid7(),
            correlationId: $correlationId,
            input: [
                'amount_minor' => 25000,
                'currency' => 'PHP',
                'quantity' => 1,
                'listing_version_id' => (string) $listingVersion->id,
            ],
        );
        app(FinalizeOrderAgreement::class)->handle(
            actorUserId: (string) $provider->id,
            orderId: (string) $proposal['order_id'],
            expectedOrderVersion: (int) $proposal['version'],
            idempotencyKey: 'accepted-work-finalize-'.Str::uuid7(),
            correlationId: $correlationId,
        );

        return [
            'order_id' => (string) $proposal['order_id'],
            'work_id' => (string) DB::table('work_instances')->where('order_id', $proposal['order_id'])->value('id'),
            'buyer' => $buyer,
            'provider' => $provider,
            'listing_id' => (string) $listing['id'],
            'correlation_id' => $correlationId,
        ];
    }
}
