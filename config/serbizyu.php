<?php

declare(strict_types=1);

return [
    'environment' => env('SERBIZYU_ENV', env('APP_ENV', 'local')),
    'validate_on_boot' => filter_var(env('SERBIZYU_VALIDATE_ENV', true), FILTER_VALIDATE_BOOL),
    'public_environment' => env('SERBIZYU_ENV', env('APP_ENV', 'local')),
    'evidence_class' => env('SERBIZYU_EVIDENCE_CLASS', 'TEAM_TRAINING'),
    'providers' => [
        'payment' => [
            'mode' => env('SERBIZYU_PAYMENT_PROVIDER_MODE', 'disabled'),
            'credentials' => env('SERBIZYU_PAYMENT_PROVIDER_CREDENTIALS', ''),
        ],
        'notifications' => [
            'mode' => env('SERBIZYU_NOTIFICATION_PROVIDER_MODE', 'disabled'),
            'credentials' => env('SERBIZYU_NOTIFICATION_PROVIDER_CREDENTIALS', ''),
        ],
        'evidence' => [
            'mode' => env('SERBIZYU_EVIDENCE_PROVIDER_MODE', 'local'),
            'credentials' => env('SERBIZYU_EVIDENCE_PROVIDER_CREDENTIALS', ''),
        ],
    ],
    'identity' => [
        'live_government_id_collection' => filter_var(
            env('SERBIZYU_LIVE_GOVERNMENT_ID_COLLECTION', false),
            FILTER_VALIDATE_BOOL
        ),
        'google_oauth_enabled' => filter_var(
            env('SERBIZYU_GOOGLE_OAUTH_ENABLED', false),
            FILTER_VALIDATE_BOOL
        ),
    ],
    'approved_live_environments' => ['pilot', 'production-connected'],
    'live_modes' => ['live', 'connected', 'production'],
    'health' => [
        'database_required' => filter_var(env('SERBIZYU_HEALTH_DATABASE_REQUIRED', false), FILTER_VALIDATE_BOOL),
        'redis_required' => filter_var(env('SERBIZYU_HEALTH_REDIS_REQUIRED', false), FILTER_VALIDATE_BOOL),
    ],
];
