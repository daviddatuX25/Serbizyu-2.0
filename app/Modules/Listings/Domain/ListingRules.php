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

        if (! array_key_exists('work_shape', $payload) || $payload['work_shape'] === null || trim((string) $payload['work_shape']) === '') {
            $errors['work_shape'] = ['Choose a canonical work shape (A1, A3, A4, or A9).'];
        } else {
            $workShape = trim((string) $payload['work_shape']);
            if (! in_array($workShape, ['A1', 'A3', 'A4', 'A9'], true)) {
                $errors['work_shape'] = ['Choose a canonical work shape (A1, A3, A4, or A9).'];
            } elseif ($listingType === 'service' && ! in_array($workShape, ['A1', 'A3', 'A9'], true)) {
                $errors['work_shape'] = ['Service listings support only A1, A3, or A9 work shapes.'];
            } elseif ($listingType === 'product' && ! in_array($workShape, ['A4', 'A9'], true)) {
                $errors['work_shape'] = ['Product listings support only A4 or A9 work shapes.'];
            }
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
