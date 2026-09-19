<?php

declare(strict_types=1);

namespace Tests\Unit\FirstSlice;

use App\Modules\Listings\Domain\ListingRules;
use PHPUnit\Framework\TestCase;

final class ListingRulesTest extends TestCase
{
    public function test_draft_rules_require_safe_server_owned_fields(): void
    {
        $rules = new ListingRules;

        self::assertSame([], $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]));
        self::assertArrayHasKey('title', $rules->validateDraft([
            'title' => 'x',
            'description' => 'short',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ]));
        self::assertArrayHasKey('work_shape', $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ]));
        self::assertSame([], $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A1',
        ]));
        self::assertSame([], $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A3',
        ]));
        self::assertSame([], $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A9',
        ]));
        self::assertSame([], $rules->validateDraft([
            'title' => 'Bibingka tray Tagudin',
            'description' => 'Reliable local product for household celebrations.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A4',
        ]));
        self::assertSame([], $rules->validateDraft([
            'title' => 'Digital print Tagudin',
            'description' => 'Reliable local digital product for household needs.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A9',
        ]));
        self::assertArrayHasKey('work_shape', $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'A4', // A4 not supported for service
        ]));
        self::assertArrayHasKey('work_shape', $rules->validateDraft([
            'title' => 'Bibingka tray Tagudin',
            'description' => 'Reliable local product for household celebrations.',
            'category_code' => 'food',
            'listing_type' => 'product',
            'work_shape' => 'A1', // A1 not supported for product
        ]));
        self::assertArrayHasKey('work_shape', $rules->validateDraft([
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'work_shape' => 'INVALID_SHAPE',
        ]));
    }

    public function test_pending_review_is_never_public_even_when_a_version_exists(): void
    {
        $rules = new ListingRules;

        self::assertTrue($rules->isPublic(['status' => 'active', 'review_status' => 'approved']));
        self::assertFalse($rules->isPublic(['status' => 'pending_review', 'review_status' => 'pending']));
        self::assertFalse($rules->isPublic(['status' => 'active', 'review_status' => 'pending']));
        self::assertFalse($rules->isPublic(['status' => 'paused', 'review_status' => 'approved']));
    }
}
