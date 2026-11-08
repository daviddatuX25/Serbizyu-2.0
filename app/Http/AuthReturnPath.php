<?php

declare(strict_types=1);

namespace App\Http;

final class AuthReturnPath
{
    public static function safe(mixed $value): string
    {
        $fallback = route('home', absolute: false);

        if (! is_string($value) || $value === '' || $value[0] !== '/' || str_starts_with($value, '//')) {
            return $fallback;
        }

        if (str_contains($value, '\\') || preg_match('/[\x00-\x1f\x7f]/', $value) === 1
            || preg_match('/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i', $value) === 1) {
            return $fallback;
        }

        $path = strtolower((string) parse_url($value, PHP_URL_PATH));
        $path = rtrim($path, '/') ?: '/';
        if ($path === '/auth' || str_starts_with($path, '/auth/')) {
            return $fallback;
        }

        return $value;
    }
}
