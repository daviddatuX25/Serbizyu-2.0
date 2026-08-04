<?php

declare(strict_types=1);

namespace App\Modules\Listings\Domain;

final class ListingRules
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, list<string>>
     */
    public function validateDraft(array $payload): array
    {
        $errors = [];
        $title = trim((string) ($payload['title'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $category = trim((string) ($payload['category_code'] ?? ''));
        $listingType = trim((string) ($payload['listing_type'] ?? ''));

        if (mb_strlen($title) < 3 || mb_strlen($title) > 120) {
            $errors['title'] = ['Title must be between 3 and 120 characters.'];
        }
        if (mb_strlen($description) < 10 || mb_strlen($description) > 4000) {
            $errors['description'] = ['Description must be between 10 and 4000 characters.'];
        }
        if (preg_match('/^[a-z0-9][a-z0-9_-]{1,63}$/', $category) !== 1) {
            $errors['category_code'] = ['Choose a valid category code.'];
        }
        if (! in_array($listingType, ['service', 'product'], true)) {
            $errors['listing_type'] = ['Listing type must be service or product.'];
        }

        return $errors;
    }

    /** @param array<string,mixed> $listing */
    public function isPublic(array $listing): bool
    {
        return ($listing['status'] ?? null) === 'active'
            && ($listing['review_status'] ?? null) === 'approved';
    }
}
