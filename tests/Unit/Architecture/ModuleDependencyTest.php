<?php

declare(strict_types=1);

namespace Tests\Unit\Architecture;

use App\Modules\Catalogs\Module as CatalogsModule;
use App\Modules\IdentityAccess\Module as IdentityAccessModule;
use App\Modules\Listings\Module;
use App\Shared\Contracts\ModuleContract;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Tests\Support\ArchitectureCheck;

final class ModuleDependencyTest extends TestCase
{
    public function test_current_module_and_controller_dependencies_obey_the_policy(): void
    {
        $check = new ArchitectureCheck(dirname(__DIR__, 3));

        self::assertSame([], $check->moduleViolations());
        self::assertSame([], $check->controllerViolations());
    }

    public function test_a_forbidden_cross_module_import_is_detected_mechanically(): void
    {
        $check = new ArchitectureCheck(dirname(__DIR__, 3));
        $source = "<?php\nuse App\\Modules\\OrdersWork\\Domain\\Order;\n";

        self::assertNotSame([], $check->forbiddenModuleImports($source, 'Listings'));
    }

    #[DataProvider('moduleProvider')]
    public function test_each_module_exposes_only_a_marker_contract(string $moduleClass): void
    {
        self::assertTrue(is_subclass_of($moduleClass, ModuleContract::class));
    }

    /** @return array<string,array{class-string}> */
    public static function moduleProvider(): array
    {
        return [
            'identity/access' => [IdentityAccessModule::class],
            'catalogs' => [CatalogsModule::class],
            'listings' => [Module::class],
            'orders/work' => [\App\Modules\OrdersWork\Module::class],
            'payment obligations' => [\App\Modules\PaymentObligations\Module::class],
            'trust/support' => [\App\Modules\TrustSupport\Module::class],
            'operations' => [\App\Modules\Operations\Module::class],
        ];
    }
}
