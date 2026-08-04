<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

final class DemoFixtures
{
    public const CHALLENGE_CODE = '246810';

    public const PROVIDER_IDENTIFIER = 'capstone-provider-tagudin-01';

    public const BUYER_IDENTIFIER = 'capstone-buyer-tagudin-01';

    public const ACTIVE_OWNER_IDENTIFIER = 'capstone-active-provider-tagudin-01';

    public const ACTIVE_LISTING_FIXTURE = 'active-tagudin-service-01';

    /** @return array<string,mixed>|null */
    public static function definition(string $identifier): ?array
    {
        return match ($identifier) {
            self::PROVIDER_IDENTIFIER => [
                'display_name' => 'Rosa Demo Provider',
                'role' => 'provider',
                'area' => 'Tagudin, Ilocos Sur',
                'languages' => ['ilo', 'en'],
                'verification_status' => 'pending',
            ],
            self::BUYER_IDENTIFIER => [
                'display_name' => 'Lina Demo Buyer',
                'role' => 'buyer',
                'area' => 'Tagudin, Ilocos Sur',
                'languages' => ['ilo', 'en'],
                'verification_status' => 'pending',
            ],
            self::ACTIVE_OWNER_IDENTIFIER => [
                'display_name' => 'Lorna Active Fixture Provider',
                'role' => 'provider',
                'area' => 'Tagudin, Ilocos Sur',
                'languages' => ['ilo', 'en'],
                'verification_status' => 'approved',
            ],
            default => null,
        };
    }

    public static function loginKey(string $identifier): string
    {
        return 'fixture:'.$identifier;
    }
}
