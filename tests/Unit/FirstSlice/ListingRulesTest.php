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
        ]));
        self::assertArrayHasKey('title', $rules->validateDraft([
            'title' => 'x',
            'description' => 'short',
            'category_code' => 'home-help',
            'listing_type' => 'service',
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
