<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface DealChainRecipeCatalogPort
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public function published(): array;
}
