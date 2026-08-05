<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Listings\Application\SeedTagudinBrowseCatalog;
use Illuminate\Database\Seeder;

/**
 * Scalable Tagudin public browse supply for local/capstone demos.
 * Does not replace CapstoneContractSeeder — it extends it.
 */
final class TagudinBrowseCatalogSeeder extends Seeder
{
    public function run(SeedTagudinBrowseCatalog $seed): void
    {
        $result = $seed->handle();

        if ($this->command !== null) {
            $this->command->info(sprintf(
                'Tagudin browse catalog: %d listings (%s)',
                $result['seeded'],
                implode(', ', $result['fixture_keys']),
            ));
        }
    }
}
