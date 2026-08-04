<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

enum EvidenceClass: string
{
    case CAPSTONE = 'CAPSTONE';
    case SANDBOX = 'SANDBOX';
    case TEAM_TRAINING = 'TEAM_TRAINING';
    case GENUINE_PILOT = 'GENUINE_PILOT';
}
