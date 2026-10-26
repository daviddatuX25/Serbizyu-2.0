<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface EvidenceScanPort
{
    public function scan(
        string $storageKey,
        string $expectedMediaType,
        int $expectedSizeBytes,
        string $expectedContentHash,
        string $purpose = 'work_node_photo_proof',
    ): EvidenceScanStatus;
}
