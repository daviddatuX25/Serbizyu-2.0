<?php

declare(strict_types=1);

namespace App\Shared\Application;

/**
 * Shared Deal Chain recipe eligibility truth.
 *
 * Enforces that recipes only match compatible listing types, work shapes,
 * and categories. In particular, physical courier delivery (courier_delivery)
 * requires physical product handoff (product listing type + A4 work shape)
 * and must never attach to on-site/home-help services.
 */
final class DealChainRecipeEligibility
{
    /**
     * Categories that represent on-site, home-help, or maintenance services
     * that cannot use physical product courier transit.
     *
     * @var list<string>
     */
    public const NON_PHYSICAL_PRODUCT_CATEGORIES = [
        'home-help',
        'local-services',
    ];

    /**
     * Determine whether a deal chain recipe is eligible for a listing context.
     *
     * @param  array<string, mixed>  $recipeDefinition
     */
    public static function isEligible(
        ?string $recipeCode,
        ?string $listingType,
        ?string $workShape,
        ?string $categoryCode,
        array $recipeDefinition = [],
    ): bool {
        $code = $recipeCode !== null && trim($recipeCode) !== ''
            ? strtolower(trim($recipeCode))
            : null;
        $type = $listingType !== null && trim($listingType) !== ''
            ? strtolower(trim($listingType))
            : null;
        $shape = $workShape !== null && trim($workShape) !== ''
            ? strtoupper(trim($workShape))
            : null;
        $category = $categoryCode !== null && trim($categoryCode) !== '' && strtolower(trim($categoryCode)) !== 'all'
            ? strtolower(trim($categoryCode))
            : null;

        // Courier delivery domain truth: strictly physical product handoff (product + A4)
        if ($code === 'courier_delivery') {
            if ($type !== null && $type !== 'product') {
                return false;
            }
            if ($shape !== null && $shape !== 'A4') {
                return false;
            }
            if ($category !== null && (in_array($category, self::NON_PHYSICAL_PRODUCT_CATEGORIES, true) || ($type === 'service' && $category === 'repairs'))) {
                return false;
            }
        }

        // Listing type match
        if ($type !== null) {
            $applicableTypes = array_map(
                'strtolower',
                array_values((array) ($recipeDefinition['listing_types'] ?? $recipeDefinition['applicableListingTypes'] ?? []))
            );
            if ($applicableTypes !== [] && ! in_array($type, $applicableTypes, true)) {
                return false;
            }
        }

        // Work shape match
        if ($shape !== null) {
            $applicableShapes = array_map(
                'strtoupper',
                array_values((array) ($recipeDefinition['work_shapes'] ?? $recipeDefinition['applicableWorkShapes'] ?? []))
            );
            if ($applicableShapes !== [] && ! in_array($shape, $applicableShapes, true)) {
                return false;
            }
        }

        // Category match
        if ($category !== null) {
            $applicableCategories = array_map(
                'strtolower',
                array_values((array) ($recipeDefinition['category_codes'] ?? $recipeDefinition['applicableCategories'] ?? []))
            );
            if ($applicableCategories !== [] && ! in_array($category, $applicableCategories, true)) {
                return false;
            }
        }

        return true;
    }
}
