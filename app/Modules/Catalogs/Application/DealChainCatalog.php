<?php

declare(strict_types=1);

namespace App\Modules\Catalogs\Application;

use App\Shared\Contracts\DealChainRecipeCatalogPort;
use App\Shared\Infrastructure\Demo\TagudinDealChainCatalog;
use App\Shared\Infrastructure\Demo\TagudinPartnerCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DealChainCatalog implements DealChainRecipeCatalogPort
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public function published(): array
    {
        $definitions = Schema::hasTable('deal_chain_catalog_versions')
            ? DB::table('deal_chain_catalog_versions')
                ->where('status', 'published')
                ->orderBy('recipe_code')
                ->orderByDesc('catalog_version')
                ->get()
                ->map(fn (object $row): array => $this->fromRow($row))
                ->unique('recipe_code')
                ->keyBy('recipe_code')
                ->all()
            : [];

        if ($definitions !== []) {
            return $definitions;
        }

        return collect(TagudinDealChainCatalog::definitions())
            ->keyBy('recipe_code')
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function frontend(): array
    {
        return array_values(array_map(function (array $definition): array {
            $catalog = (array) ($definition['definition'] ?? []);
            $nodes = array_values(array_map(
                static function (array $node): array {
                    $frontend = (array) ($node['frontend'] ?? []);

                    return [
                        'key' => (string) ($node['key'] ?? ''),
                        'role' => (string) ($frontend['role'] ?? $node['key'] ?? ''),
                        'title' => (string) ($frontend['title'] ?? $node['title'] ?? ''),
                        'sub' => (string) ($frontend['sub'] ?? 'Provider agreement required'),
                        'type' => (string) ($frontend['type'] ?? 'labor'),
                        'listingId' => isset($node['listing_id']) && is_string($node['listing_id']) ? $node['listing_id'] : null,
                        'providerName' => isset($node['provider_name']) && is_string($node['provider_name']) ? $node['provider_name'] : null,
                        'image' => isset($node['image']) && is_string($node['image']) ? $node['image'] : null,
                        'priceMinor' => isset($node['price_minor']) ? (int) $node['price_minor'] : null,
                    ];
                },
                (array) ($catalog['nodes'] ?? []),
            ));

            return [
                'recipeId' => (string) $definition['recipe_code'],
                'catalogVersion' => (int) ($definition['catalog_version'] ?? 1),
                'pattern' => (string) $definition['pattern'],
                'patternCapsule' => array_values((array) ($catalog['pattern_capsule'] ?? [])),
                'title' => (string) $definition['title'],
                'extraFee' => (int) round(((int) $definition['extra_fee_amount_minor']) / 100),
                'extraFeeMinor' => (int) $definition['extra_fee_amount_minor'],
                'rating' => number_format((float) $definition['rating'], 1, '.', ''),
                'bookedCount' => sprintf('%d booked in Tagudin', (int) $definition['booked_count']),
                'desc' => (string) $definition['description'],
                'applicableCategories' => array_values((array) $definition['category_codes']),
                'applicableListingTypes' => array_values((array) $definition['listing_types']),
                'applicableWorkShapes' => array_values((array) $definition['work_shapes']),
                'nodes' => $nodes,
            ];
        }, $this->published()));
    }

    /**
     * @return array{recommended: list<array<string, mixed>>, other_recipes: list<array<string, mixed>>}
     */
    public function optionsFor(
        ?string $categoryCode = null,
        ?string $listingType = null,
        ?string $workShape = null,
    ): array {
        $normalizedCategory = $categoryCode !== null && trim($categoryCode) !== ''
            ? strtolower(trim($categoryCode))
            : null;
        $normalizedType = $listingType !== null && trim($listingType) !== ''
            ? strtolower(trim($listingType))
            : null;
        $normalizedShape = $workShape !== null && trim($workShape) !== ''
            ? strtoupper(trim($workShape))
            : null;

        $recommended = [];
        $other = [];

        foreach ($this->frontend() as $recipe) {
            $types = array_map('strtolower', (array) ($recipe['applicableListingTypes'] ?? []));
            if ($normalizedType !== null && $types !== [] && ! in_array($normalizedType, $types, true)) {
                continue;
            }

            $shapes = array_map('strtoupper', (array) ($recipe['applicableWorkShapes'] ?? []));
            if ($normalizedShape !== null && $shapes !== [] && ! in_array($normalizedShape, $shapes, true)) {
                continue;
            }

            $categories = array_map('strtolower', (array) ($recipe['applicableCategories'] ?? []));
            if ($normalizedCategory === null || in_array($normalizedCategory, $categories, true)) {
                $recommended[] = $recipe;
            } else {
                $other[] = $recipe;
            }
        }

        return [
            'recommended' => $recommended,
            'other_recipes' => $other,
        ];
    }

    /**
     * Return partner listing candidates combining active database listings and curated Tagudin supply.
     *
     * @return list<array<string, mixed>>
     */
    public function partnerListings(): array
    {
        $items = [];
        $seenFixtureKeys = [];

        if (
            Schema::hasTable('listings')
            && Schema::hasTable('listing_versions')
            && Schema::hasTable('categories')
            && Schema::hasTable('user_profiles')
        ) {
            $rows = DB::table('listings')
                ->join('listing_versions', function ($join): void {
                    $join->on('listing_versions.listing_id', '=', 'listings.id')
                        ->on('listing_versions.version_number', '=', 'listings.current_version');
                })
                ->join('categories', 'categories.id', '=', 'listings.category_id')
                ->join('user_profiles', 'user_profiles.user_id', '=', 'listings.owner_user_id')
                ->where('listings.status', 'active')
                ->where('listings.review_status', 'approved')
                ->select(
                    'listings.id',
                    'listings.listing_type',
                    'listings.geography',
                    'listing_versions.description',
                    'listing_versions.terms',
                    'listing_versions.price_amount_minor',
                    'categories.code as category_code',
                    'user_profiles.display_name as owner_name',
                    'user_profiles.service_area_display as owner_area',
                )
                ->orderBy('listings.id')
                ->limit(40)
                ->get();

            foreach ($rows as $row) {
                $terms = json_decode((string) $row->terms, true) ?: [];
                $geography = json_decode((string) $row->geography, true) ?: [];
                $title = (string) ($terms['title'] ?? 'Tagudin Partner Listing');
                $categoryCode = strtolower((string) $row->category_code);
                $listingType = strtolower((string) $row->listing_type);
                $fixtureKey = isset($terms['fixture_key']) && is_string($terms['fixture_key'])
                    ? $terms['fixture_key']
                    : null;
                if ($fixtureKey !== null && $fixtureKey !== '') {
                    $seenFixtureKeys[$fixtureKey] = true;
                }

                $role = match (true) {
                    $listingType === 'product' => 'store',
                    $categoryCode === 'courier' => 'delivery',
                    str_contains(strtolower($title), 'safety') || str_contains(strtolower($title), 'audit') => 'audit',
                    default => 'labor',
                };

                $media = isset($terms['media']) && is_array($terms['media']) ? $terms['media'] : [];
                $coverThumb = isset($media['cover_thumbnail_url']) && is_string($media['cover_thumbnail_url'])
                    ? $media['cover_thumbnail_url']
                    : $this->defaultPartnerPhoto($role, $categoryCode);
                $priceMinor = isset($row->price_amount_minor) && $row->price_amount_minor !== null
                    ? (int) $row->price_amount_minor
                    : 8000;

                $items[] = [
                    'id' => (string) $row->id,
                    'listingId' => (string) $row->id,
                    'fixtureKey' => $fixtureKey,
                    'role' => $role,
                    'name' => $title,
                    'providerName' => (string) ($row->owner_name ?: 'Verified Tagudin Partner'),
                    'barangay' => (string) ($geography['area_code'] ?? $row->owner_area ?? 'Tagudin Centro'),
                    'price' => (int) round($priceMinor / 100),
                    'feeMinor' => $priceMinor,
                    'rating' => '4.9',
                    'badge' => 'Active Listing',
                    'sub' => (string) $row->description,
                    'coverThumbnailUrl' => $coverThumb,
                ];
            }
        }

        foreach (TagudinPartnerCatalog::candidates() as $candidate) {
            $fixtureKey = $candidate['listing_fixture_key'] ?? null;
            if ($fixtureKey !== null && isset($seenFixtureKeys[$fixtureKey])) {
                continue;
            }
            $slotRole = match ($candidate['role']) {
                'courier' => 'delivery',
                'technician' => 'labor',
                'auditor' => 'audit',
                default => 'store',
            };
            $items[] = [
                'id' => $candidate['id'],
                'listingId' => $fixtureKey ?? $candidate['id'],
                'fixtureKey' => $fixtureKey,
                'role' => $slotRole,
                'name' => $candidate['name'],
                'providerName' => $candidate['name'],
                'barangay' => 'Tagudin Centro',
                'price' => (int) round($candidate['fee_amount_minor'] / 100),
                'feeMinor' => (int) $candidate['fee_amount_minor'],
                'rating' => '4.9',
                'badge' => 'Verified Partner',
                'sub' => $candidate['sub'],
                'coverThumbnailUrl' => $this->defaultPartnerPhoto($slotRole, $candidate['category']),
            ];
        }

        return $items;
    }

    private function defaultPartnerPhoto(string $role, string $category): string
    {
        return match (true) {
            $role === 'store' && str_contains($category, 'food') => '/photos/bibingka.jpg',
            $role === 'store' => '/photos/ac-capacitor.jpg',
            $role === 'delivery' => '/photos/courier.jpg',
            $role === 'audit' => '/photos/req-electrician.jpg',
            default => '/photos/ac-clean.jpg',
        };
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function fromRow(object $row): array
    {
        return [
            'id' => (string) $row->id,
            'recipe_code' => (string) $row->recipe_code,
            'catalog_version' => (int) $row->catalog_version,
            'title' => (string) $row->title,
            'pattern' => (string) $row->pattern,
            'description' => (string) $row->description,
            'status' => (string) $row->status,
            'category_codes' => $this->decodeList($row->category_codes),
            'listing_types' => $this->decodeList($row->listing_types),
            'work_shapes' => $this->decodeList($row->work_shapes),
            'extra_fee_amount_minor' => (int) $row->extra_fee_amount_minor,
            'currency' => (string) $row->currency,
            'rating' => (float) $row->rating,
            'booked_count' => (int) $row->booked_count,
            'definition' => $this->decodeObject($row->definition),
        ];
    }

    /** @return list<string> */
    private function decodeList(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }

        return array_values(array_filter((array) $value, static fn (mixed $item): bool => is_string($item)));
    }

    /** @return array<string, mixed> */
    private function decodeObject(mixed $value): array
    {
        if (is_string($value)) {
            $value = json_decode($value, true);
        }

        return is_array($value) ? $value : [];
    }
}
