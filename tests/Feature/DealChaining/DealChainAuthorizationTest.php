<?php

declare(strict_types=1);

namespace Tests\Feature\DealChaining;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\AuthenticatesWithPhoneOtp;

uses(DatabaseTransactions::class, AuthenticatesWithPhoneOtp::class);

beforeEach(function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        $this->markTestSkipped('Deal chain authorization tests require PostgreSQL.');
    }

    $this->bootPhoneOtpAuth();
});

it('redirects unauthenticated users to phone auth when authorizing deal chain', function (): void {
    $this->post(route('deal-chains.authorize'), [
        'payment_method' => 'escrow',
        'items' => [
            ['id' => '0198a3b1-7c40-7abc-8def-5234567890b8', 'title' => 'Inverter Split AC Deep Clean', 'price' => 450, 'quantity' => 1],
        ],
        'total_amount' => 450,
    ])->assertRedirect(route('auth.sign-in'));
});

it('authorizes a multi-need deal chain and persists parent deal_chains and deal_needs records in PostgreSQL', function (): void {
    $buyerUserId = $this->authenticateBuyer();

    $response = $this->post(route('deal-chains.authorize'), [
        'payment_method' => 'escrow',
        'items' => [
            [
                'id' => '0198a3b1-7c40-7abc-8def-5234567890b8',
                'title' => 'Inverter Split AC Deep Clean',
                'price' => 450,
                'quantity' => 1,
                'deal_chain' => 'turnkey_parts',
            ],
            [
                'id' => '0198a3b1-7c40-7abc-8def-5234567890ba',
                'title' => 'AC Run Capacitor (35uF 450V)',
                'price' => 180,
                'quantity' => 1,
                'deal_chain' => null,
            ],
        ],
        'total_amount' => 630,
    ]);

    $response->assertRedirect();

    $chain = DB::table('deal_chains')
        ->where('coordinator_user_id', $buyerUserId)
        ->orderByDesc('created_at')
        ->first();

    expect($chain)->not->toBeNull()
        ->and($chain->status)->toBe('sourcing')
        ->and($chain->title)->toContain('Tagudin Deal Chain');
    $needs = DB::table('deal_needs')
        ->where('deal_chain_id', $chain->id)
        ->orderBy('ordinal')
        ->get();

    expect($needs)->toHaveCount(2)
        ->and($needs[0]->title)->toBe('Inverter Split AC Deep Clean')
        ->and($needs[0]->status)->toBe('open')
        ->and($needs[1]->title)->toBe('AC Run Capacitor (35uF 450V)')
        ->and($needs[1]->status)->toBe('open');
});
