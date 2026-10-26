<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Facades\DB;

final class PublicReferenceAllocator
{
    /** @var array<string, string> */
    private const PREFIXES = [
        'orders' => 'ORD',
        'payment_obligations' => 'OBL',
        'support_cases' => 'CASE',
        'disputes' => 'CASE',
        'deal_chains' => 'DC',
        'listings' => 'LST',
        'identity_verifications' => 'IDV',
    ];

    /** @var array<string, string> */
    private const SEQUENCES = [
        'orders' => 'orders_public_reference_seq',
        'payment_obligations' => 'payment_obligations_public_reference_seq',
        'support_cases' => 'case_public_reference_seq',
        'disputes' => 'case_public_reference_seq',
        'deal_chains' => 'deal_chains_public_reference_seq',
        'listings' => 'listings_public_reference_seq',
        'identity_verifications' => 'identity_verifications_public_reference_seq',
    ];

    public function allocate(string $table): string
    {
        $prefix = self::PREFIXES[$table] ?? throw new \InvalidArgumentException('Unsupported public reference table.');
        $sequence = self::SEQUENCES[$table];
        $number = DB::scalar("SELECT nextval('{$sequence}')");

        return $prefix.'-'.str_pad((string) $number, 8, '0', STR_PAD_LEFT);
    }
}
