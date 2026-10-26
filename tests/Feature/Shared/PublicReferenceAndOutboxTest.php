<?php

declare(strict_types=1);

use App\Shared\Application\PublicReferenceAllocator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

uses(DatabaseTransactions::class);

it('allocates unique sequence-backed ORD and OBL references', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('Public reference sequence tests require PostgreSQL.');
    }
    $allocator = app(PublicReferenceAllocator::class);
    expect($allocator->allocate('orders'))->toStartWith('ORD-')
        ->and($allocator->allocate('orders'))->not->toBe($allocator->allocate('orders'))
        ->and($allocator->allocate('payment_obligations'))->toStartWith('OBL-');
});
it('allocates collision-free CASE references across support cases and disputes', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        test()->markTestSkipped('Public reference sequence tests require PostgreSQL.');
    }

    $allocator = app(PublicReferenceAllocator::class);
    expect($allocator->allocate('support_cases'))->toStartWith('CASE-')
        ->and($allocator->allocate('disputes'))->not->toBe($allocator->allocate('support_cases'));
});
