<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Local/capstone demo seed path.
 *
 * Contract fixtures stay tiny and deterministic for Pest.
 * Browse catalog expands public supply without inventing payment/Activity chrome.
 */
final class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CapstoneContractSeeder::class,
            TagudinBrowseCatalogSeeder::class,
        ]);
    }
}
