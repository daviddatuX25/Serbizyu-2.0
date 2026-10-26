<?php

declare(strict_types=1);

namespace App\Shared\Application;

/** Single server-side role taxonomy shared by the candidate picker and replacement command. */
final class DealChainCandidateRoleClassifier
{
    public static function classify(string $listingType, string $categoryCode, string $title, string $fixtureKey = ''): ?string
    {
        $listingType = strtolower(trim($listingType));
        $category = strtolower(trim($categoryCode));
        $title = strtolower(trim($title));

        if ($listingType === 'product' || in_array($fixtureKey, [
            'active-tagudin-ac-capacitor-01',
            'active-tagudin-bibingka-01',
            'active-tagudin-greens-bag-01',
        ], true)) {
            return 'STORE';
        }
        if (in_array($category, ['courier', 'delivery', 'logistics'], true)
            || $fixtureKey === 'active-tagudin-courier-01'
            || str_contains($title, 'courier')
            || str_contains($title, 'delivery')) {
            return 'COURIER';
        }
        if ($fixtureKey === 'active-tagudin-safety-audit-01'
            || str_contains($title, 'audit')
            || str_contains($category, 'safety')
            || str_contains($category, 'audit')) {
            return 'AUDIT';
        }
        if (str_contains($title, 'recycle')
            || str_contains($title, 'scrap')
            || str_contains($category, 'recycle')) {
            return 'RECYCLE';
        }
        if ($listingType === 'service') {
            return 'LABOR';
        }

        return null;
    }

    public static function matchesNeedRole(string $needRole, string $listingType, string $categoryCode, string $title, string $fixtureKey = ''): bool
    {
        $expectedRole = match (strtolower(trim($needRole))) {
            'store' => 'STORE',
            'courier' => 'COURIER',
            'audit' => 'AUDIT',
            'recycle' => 'RECYCLE',
            'labor' => 'LABOR',
            default => null,
        };

        return $expectedRole !== null
            && self::classify($listingType, $categoryCode, $title, $fixtureKey) === $expectedRole;
    }
}
