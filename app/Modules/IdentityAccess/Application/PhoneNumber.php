<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

final class PhoneNumber
{
    public static function normalizePhilippineMobile(string $phone): string
    {
        $phone = preg_replace('/[\s().-]+/', '', trim($phone)) ?? '';

        if (preg_match('/^09\d{9}$/', $phone) === 1) {
            $phone = '+63'.substr($phone, 1);
        }

        if (preg_match('/^\+639\d{9}$/', $phone) !== 1) {
            throw new \RuntimeException('Use a valid Philippine mobile number.');
        }

        return $phone;
    }
}
