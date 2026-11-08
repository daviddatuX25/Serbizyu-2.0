<?php

declare(strict_types=1);

namespace App\Modules\Catalogs\Application;

use App\Shared\Application\DealChainCandidateRoleClassifier;
use App\Shared\Application\DealChainRecipeEligibility;
use App\Shared\Contracts\DealChainRecipeCatalogPort;
use App\Shared\Contracts\ListingReviewReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class DealChainCatalog implements DealChainRecipeCatalogPort
{
    public function __construct(
        private readonly ListingReviewReaderPort $reviews,
    ) {}

    /**
     * @return array<string, array<string, mixed>>
     */
    public function published(): array
    {
        return Schema::hasTable('deal_chain_catalog_versions')
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
                        'isPrimary' => array_key_exists('is_primary', $node)
                            ? (bool) $node['is_primary']
                            : (($node['title_template'] ?? null) === 'primary_listing'
                                || ($node['need_kind_template'] ?? null) === 'primary_listing'
                                || ($node['isPrimary'] ?? false) === true),
                        'needKind' => (string) ($node['need_kind'] ?? 'service'),
                        'role' => (string) ($frontend['role'] ?? $node['key'] ?? ''),
                        'title' => (string) ($frontend['title'] ?? $node['title'] ?? ''),
                        'sub' => (string) ($frontend['sub'] ?? 'Provider agreement required'),
                        'type' => (string) ($frontend['type'] ?? 'labor'),
                        'listingId' => isset($node['listing_id']) && is_string($node['listing_id']) ? $node['listing_id'] : null,
                        'providerName' => isset($node['provider_name']) && is_string($node['provider_name']) ? $node['provider_name'] : null,
                        'image' => isset($node['image']) && is_string($node['image']) ? $node['image'] : null,
                        'priceMinor' => isset($node['price_minor']) ? (int) $node['price_minor'] : null,
                        'slotRequirement' => isset($node['slot_requirement']) && is_array($node['slot_requirement']) ? $node['slot_requirement'] : null,
                        'assignmentMode' => (string) ($node['slot_requirement']['default_assignment_mode'] ?? (! empty($node['listing_id']) ? 'preferred_partner' : 'open_pool')),
                    ];
                },
                (array) ($catalog['nodes'] ?? []),
            ));

            $nodeTypes = array_column($nodes, 'type', 'key');
            $catalog['dependencies'] = array_values(array_map(
                static function (array $dependency) use ($nodeTypes): array {
                    $predecessorId = (string) ($dependency['predecessor'] ?? '');
                    $dependency['condition_code'] = self::canonicalCatalogCondition(
                        (string) ($dependency['condition_code'] ?? ''),
                        (string) ($nodeTypes[$predecessorId] ?? ''),
                    );

                    return $dependency;
                },
                (array) ($catalog['dependencies'] ?? []),
            ));
            $dependencies = array_values(array_map(
                static fn (array $dep): array => [
                    'predecessorId' => (string) ($dep['predecessor'] ?? ''),
                    'successorId' => (string) ($dep['successor'] ?? ''),
                    'conditionCode' => (string) ($dep['condition_code'] ?? ''),
                    'dependencyType' => 'blocks',
                    'status' => 'active',
                    'allowBypass' => (bool) ($dep['allow_bypass'] ?? false),
                ],
                (array) ($catalog['dependencies'] ?? []),
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
                'dependencies' => $dependencies,
                'rawDefinition' => $catalog,
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
        $normalizedCategory = $categoryCode !== null && trim($categoryCode) !== '' && strtolower(trim($categoryCode)) !== 'all'
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
            $recipeCode = (string) ($recipe['recipeId'] ?? '');

            if (! DealChainRecipeEligibility::isEligible($recipeCode, $normalizedType, $normalizedShape, null, $recipe)) {
                continue;
            }

            if ($normalizedCategory !== null) {
                if (DealChainRecipeEligibility::isEligible($recipeCode, $normalizedType, $normalizedShape, $normalizedCategory, $recipe)) {
                    $recommended[] = $recipe;
                } elseif (! in_array($normalizedCategory, DealChainRecipeEligibility::NON_PHYSICAL_PRODUCT_CATEGORIES, true) || $recipeCode !== 'courier_delivery') {
                    $other[] = $recipe;
                }
            } else {
                $recommended[] = $recipe;
            }
        }

        return [
            'recommended' => $recommended,
            'other_recipes' => $other,
        ];
    }

    /**
     * Return active, approved database listing candidates with current terms and real review summaries.
     *
     * @return list<array<string, mixed>>
     */
    public function partnerListings(): array
    {
        $items = [];

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
                    'listings.owner_user_id',
                    'listings.listing_type',
                    'listings.geography',
                    'listing_versions.id as listing_version_id',
                    'listing_versions.description',
                    'listing_versions.terms',
                    'listing_versions.price_amount_minor',
                    'categories.code as category_code',
                    'user_profiles.display_name as owner_name',
                    'user_profiles.service_area_display as owner_area',
                )
                ->orderBy('listings.id')
                ->get();

            foreach ($rows as $row) {
                $terms = json_decode((string) $row->terms, true) ?: [];
                $geography = json_decode((string) $row->geography, true) ?: [];
                $title = (string) ($terms['title'] ?? $row->description ?? '');
                $categoryCode = strtolower((string) $row->category_code);
                $listingType = strtolower((string) $row->listing_type);
                $fixtureKey = isset($terms['fixture_key']) && is_string($terms['fixture_key'])
                    ? $terms['fixture_key']
                    : '';
                $canonicalRole = DealChainCandidateRoleClassifier::classify($listingType, $categoryCode, $title, $fixtureKey);
                $role = match ($canonicalRole) {
                    'STORE' => 'store',
                    'COURIER' => 'delivery',
                    'LABOR' => 'labor',
                    'AUDIT' => 'audit',
                    'RECYCLE' => 'recycle',
                    default => null,
                };
                if ($role === null) {
                    continue;
                }

                $media = isset($terms['media']) && is_array($terms['media']) ? $terms['media'] : [];
                $coverThumb = isset($media['cover_thumbnail_url']) && is_string($media['cover_thumbnail_url'])
                    ? $media['cover_thumbnail_url']
                    : $this->defaultPartnerPhoto($role, $categoryCode);
                $priceMinor = $row->price_amount_minor === null ? null : (int) $row->price_amount_minor;
                if ($priceMinor === null && $listingType === 'product') {
                    foreach (($terms['variants'] ?? []) as $variant) {
                        if (! is_array($variant) || ! ($variant['is_default'] ?? $variant['isDefault'] ?? false)) {
                            continue;
                        }
                        $variantPrice = $variant['price_amount_minor'] ?? null;
                        if ($variantPrice === null && is_numeric($variant['price'] ?? null)) {
                            $variantPrice = (int) round((float) $variant['price'] * 100);
                        }
                        $priceMinor = is_numeric($variantPrice) ? (int) $variantPrice : null;
                        break;
                    }

                }
                $items[] = [
                    'id' => (string) $row->id,
                    'listingId' => (string) $row->id,
                    'listingVersionId' => (string) $row->listing_version_id,
                    'providerUserId' => (string) $row->owner_user_id,
                    'role' => $role,
                    'name' => $title,
                    'providerName' => (string) ($row->owner_name ?? ''),
                    'barangay' => (string) ($geography['area_code'] ?? $row->owner_area ?? ''),
                    'barangayName' => is_string($geography['barangay_name'] ?? null) ? $geography['barangay_name'] : null,
                    'barangayCode' => is_string($geography['barangay_code'] ?? null) ? $geography['barangay_code'] : null,
                    'municipalityName' => is_string($geography['municipality_name'] ?? null) ? $geography['municipality_name'] : null,
                    'municipalityCode' => is_string($geography['municipality_code'] ?? null) ? $geography['municipality_code'] : null,
                    'geographyPresent' => $row->geography !== null,
                    'categoryCode' => $categoryCode,
                    'price' => $priceMinor === null ? null : (int) round($priceMinor / 100),
                    'feeMinor' => $priceMinor,
                    'reviewsCount' => 0,
                    'rating' => null,
                    'ratingLabel' => 'New',
                    'badge' => 'Active Listing',
                    'sub' => (string) $row->description,
                    'coverThumbnailUrl' => $coverThumb,
                ];
            }

        }
        $summaries = $this->reviews->summariesForListings(array_column($items, 'listingId'));
        foreach ($items as &$item) {
            $summary = $summaries[$item['listingId']] ?? null;
            $item['reviewsCount'] = (int) ($summary['reviews_count'] ?? 0);
            if ($item['reviewsCount'] > 0 && isset($summary['rating']) && is_numeric($summary['rating'])) {
                $item['rating'] = (float) $summary['rating'];
                $item['ratingLabel'] = (string) ($summary['rating_label'] ?? number_format($item['rating'], 1));
            }
        }
        unset($item);

        return $items;
    }

    private static function canonicalCatalogCondition(string $condition, string $predecessorType): string
    {
        $role = match (strtolower(trim($predecessorType))) {
            'store', 'parts', 'product' => 'store',
            'labor', 'service', 'installation', 'diagnostic', 'tools' => 'labor',
            'delivery', 'courier' => 'courier',
            'audit' => 'audit',
            'recycle', 'hauling' => 'recycle',
            default => null,
        };

        return match ($condition) {
            'source_ready' => match ($role) {
                'store' => 'part_ready',
                'labor' => 'work_completed',
                default => $condition,
            },
            'labor_ready', 'completed' => 'work_completed',
            'delivered_to_site' => 'delivery_signed',
            default => $condition,
        };
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
     * @return array<string, mixed>
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
