<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;

final class DemoFixtureService
{
    public function __construct(private readonly FixtureRepository $fixtures) {}

    public function ensure(): void
    {
        $this->fixtures->ensure();
    }
}
