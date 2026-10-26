<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Demo;

final class DealChainExecutionFixtures
{
    // Persona User IDs
    public const BUYER_USER_ID = '0198a3b1-7c40-7abc-8def-7234567890ab';

    public const BUYER_PHONE = '+639172222001';

    public const STORE_USER_ID = '0198a3b1-7c40-7abc-8def-2234567890ab';

    public const STORE_PHONE = '+639171111002';

    public const COURIER_USER_ID = '0198a3b1-7c40-7abc-8def-1234567890ba';

    public const COURIER_PHONE = '+639173333001';

    public const TECH_USER_ID = '0198a3b1-7c40-7abc-8def-1234567890bb';

    public const TECH_PHONE = '+639171111001';

    // Source Listing IDs (from TagudinBrowseCatalog)
    public const LISTING_AC_CLEAN = '0198a3b1-7c40-7abc-8def-5234567890b8';

    public const LISTING_AC_CAPACITOR_INSTALLATION = '0198a3b1-7c40-7abc-8def-5234567890bb';

    public const LISTING_AC_SAFETY_AUDIT = '0198a3b1-7c40-7abc-8def-5234567890bc';

    public const LISTING_AC_CAPACITOR = '0198a3b1-7c40-7abc-8def-5234567890ba';

    public const LISTING_COURIER = '0198a3b1-7c40-7abc-8def-5234567890b9';

    public const LISTING_BIBINGKA = '0198a3b1-7c40-7abc-8def-5234567890b5';

    public const LISTING_SUB_BREAKER = '0198a3b1-7c40-7abc-8def-5234567890b3';

    // Ongoing Active Deal Chain (#DC-892)
    public const CHAIN_ID_ONGOING = '0198a3b1-7c40-7abc-8def-dc0000000892';

    public const NEED_ID_PART = '0198a3b1-7c40-7abc-8def-0eed00000001';

    public const NEED_ID_TRANSIT = '0198a3b1-7c40-7abc-8def-0eed00000002';

    public const NEED_ID_LABOR = '0198a3b1-7c40-7abc-8def-0eed00000003';

    public const ORDER_ID_PART = '0198a3b1-7c40-7abc-8def-0ede00000101';

    public const ORDER_ID_TRANSIT = '0198a3b1-7c40-7abc-8def-0ede00000102';

    public const ORDER_ID_LABOR = '0198a3b1-7c40-7abc-8def-0ede00000103';

    // Coordinated Deal Chain for Tech Persona (#DC-414)
    public const CHAIN_ID_TECH_DEMO = '0198a3b1-7c40-7abc-8def-dc0000000414';

    // Standalone Ongoing Orders
    public const ORDER_ID_PENDING_DIRECT = '0198a3b1-7c40-7abc-8def-0ede00000702';

    public const ORDER_ID_AWAITING_SIGNOFF = '0198a3b1-7c40-7abc-8def-0ede00000803';

    // Historical Completed Orders
    public const ORDER_ID_HIST_1 = '0198a3b1-7c40-7abc-8def-0ede00000619';

    public const ORDER_ID_HIST_2 = '0198a3b1-7c40-7abc-8def-0ede00000504';

    public const ORDER_ID_HIST_3 = '0198a3b1-7c40-7abc-8def-0ede00000412';
}
