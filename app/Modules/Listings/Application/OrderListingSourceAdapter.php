<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application;

use App\Shared\Contracts\OrderListingSourcePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class OrderListingSourceAdapter implements OrderListingSourcePort
{
    public function findActiveApproved(string $listingId): ?array
    {
        if (! Schema::hasTable('listings') || ! Schema::hasTable('listing_versions')) {
            return null;
        }

        $row = DB::table('listings')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->where('listings.id', $listingId)
            ->where('listings.status', 'active')
            ->where('listings.review_status', 'approved')
            ->select(
                'listings.id as listing_id',
                'listings.owner_user_id',
                'listings.listing_type',
                'listings.status',
                'listings.review_status',
                'listings.version as listing_row_version',
                'listings.capability_profile_id',
                'listings.geography',
                'listing_versions.id as listing_version_id',
                'listing_versions.version_number as listing_version_number',
                'listing_versions.description',
                'listing_versions.terms',
                'listing_versions.price_amount_minor',
                'listing_versions.currency',
                'listing_versions.category_id as version_category_id',
                'listing_versions.category_business_version',
                'listing_versions.capability_profile_family_code',
                'listing_versions.capability_profile_business_version',
                'categories.code as category_code',
            )
            ->first();

        if ($row === null) {
            return null;
        }

        $terms = json_decode((string) $row->terms, true) ?: [];
        $geography = json_decode((string) $row->geography, true) ?: [];

        return [
            'listing_id' => (string) $row->listing_id,
            'owner_user_id' => (string) $row->owner_user_id,
            'listing_version_id' => (string) $row->listing_version_id,
            'listing_version_number' => (int) $row->listing_version_number,
            'listing_row_version' => (int) $row->listing_row_version,
            'listing_type' => (string) $row->listing_type,
            'status' => (string) $row->status,
            'review_status' => (string) $row->review_status,
            'title' => (string) ($terms['title'] ?? ''),
            'description' => (string) $row->description,
            'category_code' => (string) $row->category_code,
            'geography_area' => (string) ($geography['area_code'] ?? 'Tagudin'),
            'price_amount_minor' => $row->price_amount_minor !== null ? (int) $row->price_amount_minor : null,
            'currency' => is_string($row->currency) ? $row->currency : null,
            'category_id' => $row->version_category_id !== null ? (string) $row->version_category_id : null,
            'category_business_version' => $row->category_business_version !== null ? (int) $row->category_business_version : null,
            'capability_profile_id' => $row->capability_profile_id !== null ? (string) $row->capability_profile_id : '',
            'capability_profile_family_code' => $row->capability_profile_family_code !== null ? (string) $row->capability_profile_family_code : null,
            'capability_profile_business_version' => $row->capability_profile_business_version !== null ? (int) $row->capability_profile_business_version : null,
        ];
    }
}
