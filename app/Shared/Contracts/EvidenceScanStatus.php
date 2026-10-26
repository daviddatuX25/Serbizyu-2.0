<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

enum EvidenceScanStatus: string
{
    case Clean = 'clean';
    case Infected = 'infected';
    case Failed = 'failed';
}
