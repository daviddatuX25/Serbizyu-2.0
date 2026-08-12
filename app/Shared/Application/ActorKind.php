<?php

declare(strict_types=1);

namespace App\Shared\Application;

enum ActorKind: string
{
    case Human = 'human';
    case ServicePrincipal = 'service_principal';
    case System = 'system';
}
