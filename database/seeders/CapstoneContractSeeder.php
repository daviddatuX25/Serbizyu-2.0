<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\IdentityAccess\Application\DemoFixtureService;
use Illuminate\Database\Seeder;

/**
 * Deterministic first-slice contract identities (users, active Tagudin local help listing).
 */
final class CapstoneContractSeeder extends Seeder
{
    public function run(DemoFixtureService $fixtures): void
    {
        $fixtures->ensure();
    }
}
