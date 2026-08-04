<?php

declare(strict_types=1);

return [
    'modules' => [
        'IdentityAccess' => 'App\\Modules\\IdentityAccess',
        'Listings' => 'App\\Modules\\Listings',
        'OrdersWork' => 'App\\Modules\\OrdersWork',
        'PaymentObligations' => 'App\\Modules\\PaymentObligations',
        'TrustSupport' => 'App\\Modules\\TrustSupport',
        'Operations' => 'App\\Modules\\Operations',
    ],
    'shared_namespace' => 'App\\Shared',
    'forbidden_imports' => [
        'App\\Models',
        'App\\Infrastructure',
        'Illuminate\\Database',
    ],
];
