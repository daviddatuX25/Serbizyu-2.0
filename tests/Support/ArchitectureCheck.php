<?php

declare(strict_types=1);

namespace Tests\Support;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RegexIterator;
use RuntimeException;
use SplFileInfo;

final class ArchitectureCheck
{
    /** @var list<string> */
    private array $moduleNames;

    public function __construct(private readonly string $root)
    {
        $modulesPath = $this->root.'/app/Modules';
        $names = [];

        foreach (scandir($modulesPath) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            if (is_dir($modulesPath.'/'.$entry)) {
                $names[] = $entry;
            }
        }

        sort($names);
        $this->moduleNames = $names;
    }

    /** @return list<string> */
    public function moduleViolations(): array
    {
        $violations = [];

        foreach ($this->moduleNames as $module) {
            foreach ($this->phpFiles($this->root.'/app/Modules/'.$module) as $file) {
                $source = (string) file_get_contents($file);
                foreach ($this->forbiddenModuleImports($source, $module) as $violation) {
                    $violations[] = $file.': '.$violation;
                }
            }
        }

        return array_values(array_unique($violations));
    }

    /** @return list<string> */
    public function controllerViolations(): array
    {
        $violations = [];
        $controllersPath = $this->root.'/app/Http/Controllers';

        if (! is_dir($controllersPath)) {
            return [];
        }

        foreach ($this->phpFiles($controllersPath) as $file) {
            $source = (string) file_get_contents($file);

            if (preg_match('/use\\s+App\\\\Modules\\\\[A-Za-z0-9_]+\\\\(?:Infrastructure|Domain)\\\\/', $source) === 1) {
                $violations[] = $file.': controllers must not import module Infrastructure or Domain types.';
            }
        }

        return array_values(array_unique($violations));
    }

    /**
     * @return list<string>
     */
    public function forbiddenModuleImports(string $source, string $module): array
    {
        $violations = [];

        foreach ($this->moduleNames as $other) {
            if ($other === $module) {
                continue;
            }

            $pattern = '/use\\s+App\\\\Modules\\\\'.$other.'\\\\/';
            if (preg_match($pattern, $source) === 1) {
                $violations[] = sprintf('Module [%s] must not import [%s].', $module, $other);
            }
        }

        return $violations;
    }

    public static function activeWebRoutesAvoidDemoAuthMiddleware(string $root): void
    {
        $web = (string) file_get_contents($root.'/routes/web.php');

        if (! str_contains($web, 'EnsureAuthenticated::class')) {
            throw new RuntimeException('Protected product routes must use EnsureAuthenticated.');
        }

        if (str_contains($web, 'EnsureMockAuthenticated::class')) {
            throw new RuntimeException('EnsureMockAuthenticated must not protect active product routes.');
        }

        if (str_contains($web, "middleware('mock.auth')") || str_contains($web, 'middleware("mock.auth")')) {
            throw new RuntimeException('mock.auth middleware must not be attached to active product routes.');
        }
    }

    /** @return list<string> */
    private function phpFiles(string $directory): array
    {
        if (! is_dir($directory)) {
            return [];
        }

        $iterator = new RegexIterator(
            new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory)),
            '/\\.php$/',
        );

        $files = [];
        /** @var SplFileInfo $file */
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $files[] = $file->getPathname();
            }
        }

        sort($files);

        return $files;
    }
}
