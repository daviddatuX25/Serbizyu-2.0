<?php

declare(strict_types=1);

namespace Tests\Unit\FirstSlice;

use App\Modules\Listings\Application\Projections\ListingProjection;
use PHPUnit\Framework\TestCase;

final class ListingProjectionTest extends TestCase
{
    public function test_public_projection_excludes_owner_private_identity(): void
    {
        $projection = ListingProjection::public([
            ...$this->baseAttributes(),
            'owner_user_id' => 'user-private',
            'owner_name' => 'Maria Santos',
            'owner' => ['display_name' => 'Maria Santos'],
        ])->toArray();

        self::assertTrue($projection['public']);
        self::assertArrayNotHasKey('owner_user_id', $projection);
        self::assertSame(['display_name' => 'Maria Santos'], $projection['owner']);
    }

    public function test_owner_projection_excludes_public_owner_shape(): void
    {
        $projection = ListingProjection::owner([
            ...$this->baseAttributes(),
            'owner_user_id' => 'user-private',
            'owner_name' => 'Maria Santos',
            'owner' => ['display_name' => 'Maria Santos'],
        ])->toArray();

        self::assertFalse($projection['public']);
        self::assertSame('user-private', $projection['owner_user_id']);
        self::assertArrayNotHasKey('owner_name', $projection);
        self::assertArrayNotHasKey('owner', $projection);
    }

    /** @return array<string, mixed> */
    private function baseAttributes(): array
    {
        return [
            'id' => 'listing-1',
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'status' => 'active',
            'review_status' => 'approved',
            'state' => 'active',
            'version' => 2,
            'expected_version' => 2,
            'current_version' => 2,
            'area' => 'Tagudin',
        ];
    }
}
