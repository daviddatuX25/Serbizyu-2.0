<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

final class OrderProposalMigrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cutover_preserves_legacy_terms_proposal_amount_currency_hash_and_current_pointers(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order proposal migration regression requires PostgreSQL.');
        }

        $this->prepareLegacySchema();

        $acceptedOrder = DB::table('orders')->where('id', Fix::ORDER_ID_AWAITING_SIGNOFF)->first();
        $snapshot = DB::table('order_terms_snapshots')->where('order_id', $acceptedOrder->id)->first();
        $snapshotId = (string) $snapshot->id;
        $snapshotAmount = (int) $snapshot->amount_minor;
        $snapshotCurrency = (string) $snapshot->currency;
        $snapshotScope = json_decode((string) $snapshot->scope, true, flags: JSON_THROW_ON_ERROR);

        $proposedOrder = DB::table('orders')->where('id', Fix::ORDER_ID_PENDING_DIRECT)->first();
        $buyerParty = DB::table('order_parties')->where('order_id', $proposedOrder->id)->where('party_type', 'buyer')->first();
        $legacyProposal = json_decode((string) $buyerParty->scope, true, flags: JSON_THROW_ON_ERROR)['proposal'];
        $legacyProposalJson = json_encode($legacyProposal, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $this->migration()->up();

        $accepted = DB::table('orders')->where('id', Fix::ORDER_ID_AWAITING_SIGNOFF)->first();
        $acceptedProposal = DB::table('order_proposals')->where('id', $accepted->current_proposal_id)->first();
        self::assertSame($snapshotId, (string) $accepted->current_terms_snapshot_id);
        self::assertSame((string) $accepted->current_proposal_id, (string) $acceptedProposal->id);
        self::assertSame((string) $accepted->id, (string) $acceptedProposal->order_id);
        self::assertSame(25000, (int) $acceptedProposal->amount_minor);
        self::assertSame($snapshotAmount, (int) $acceptedProposal->amount_minor);
        self::assertSame($snapshotCurrency, (string) $acceptedProposal->currency);
        self::assertSame($snapshotScope, json_decode((string) $acceptedProposal->scope, true, flags: JSON_THROW_ON_ERROR));
        self::assertSame(hash('sha256', json_encode($snapshotScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)), (string) $acceptedProposal->terms_hash);

        $proposed = DB::table('orders')->where('id', Fix::ORDER_ID_PENDING_DIRECT)->first();
        $proposal = DB::table('order_proposals')->where('id', $proposed->current_proposal_id)->first();
        self::assertSame('proposed', $proposed->status);
        self::assertNull($proposed->current_terms_snapshot_id);
        self::assertSame(4500, (int) $proposal->amount_minor);
        self::assertSame((int) $legacyProposal['amount_minor'], (int) $proposal->amount_minor);
        self::assertSame(strtoupper((string) $legacyProposal['currency']), (string) $proposal->currency);
        self::assertSame(hash('sha256', $legacyProposalJson), (string) $proposal->terms_hash);
        self::assertNotSame(md5($legacyProposalJson), (string) $proposal->terms_hash);
        self::assertSame($legacyProposal, json_decode((string) $proposal->scope, true, flags: JSON_THROW_ON_ERROR));
        self::assertSame('completed', DB::table('orders')->where('id', Fix::ORDER_ID_HIST_1)->value('status'));

        try {
            DB::transaction(fn () => DB::table('orders')->where('id', $accepted->id)->update([
                'current_proposal_id' => (string) Str::uuid7(),
            ]));
            self::fail('An Order must not reference a missing current proposal.');
        } catch (QueryException $exception) {
            self::assertStringContainsString('fk_orders_current_proposal', $exception->getMessage());
        }

        try {
            DB::transaction(fn () => DB::table('order_proposals')->insert([
                'id' => (string) Str::uuid7(),
                'order_id' => $accepted->id,
                'proposal_version' => 2,
                'parent_proposal_id' => (string) Str::uuid7(),
                'kind' => 'counter',
                'status' => 'declined',
                'proposed_by_user_id' => Fix::BUYER_USER_ID,
                'scope' => '{}',
                'amount_minor' => 25000,
                'currency' => 'PHP',
                'terms_hash' => str_repeat('a', 64),
                'correlation_id' => $accepted->correlation_id,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
            self::fail('A proposal must not reference a missing parent proposal.');
        } catch (QueryException $exception) {
            self::assertStringContainsString('fk_order_proposals_parent', $exception->getMessage());
        }
    }

    public function test_only_the_four_named_snapshotless_demo_orders_are_cancelled(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order proposal migration regression requires PostgreSQL.');
        }

        $this->prepareLegacySchema();
        $demoIds = [
            '0198a3b1-7c40-7abc-8def-0f0100000001',
            '0198a3b1-7c40-7abc-8def-0f0100000002',
            '0198a3b1-7c40-7abc-8def-0f0100000003',
            '0198a3b1-7c40-7abc-8def-0f0100000004',
        ];
        foreach ($demoIds as $index => $id) {
            $this->insertLegacyOrder($id, $index < 2 ? 'accepted' : 'closed');
        }

        $this->migration()->up();

        foreach ($demoIds as $id) {
            self::assertSame('cancelled', DB::table('orders')->where('id', $id)->value('status'));
            self::assertSame(0, DB::table('order_proposals')->where('order_id', $id)->count());
            self::assertNull(DB::table('orders')->where('id', $id)->value('current_proposal_id'));
        }
    }

    public function test_unknown_accepted_order_without_authoritative_terms_fails_and_rolls_back_cutover(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order proposal migration regression requires PostgreSQL.');
        }

        $this->prepareLegacySchema();
        $id = (string) Str::uuid7();
        $this->insertLegacyOrder($id, 'accepted');

        try {
            DB::transaction(fn () => $this->migration()->up());
            self::fail('Cutover accepted an Order without authoritative terms.');
        } catch (QueryException $exception) {
            self::assertStringContainsString('Cannot migrate accepted Order without authoritative terms snapshot', $exception->getMessage());
        }

        self::assertFalse(Schema::hasTable('order_proposals'));
        self::assertSame('accepted', DB::table('orders')->where('id', $id)->value('status'));
    }

    public function test_unresolved_cancel_request_blocks_cutover_without_changing_legacy_state(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Order proposal migration regression requires PostgreSQL.');
        }

        $this->prepareLegacySchema();
        $id = (string) Str::uuid7();
        $this->insertLegacyOrder($id, 'cancel_requested');

        try {
            DB::transaction(fn () => $this->migration()->up());
            self::fail('Cutover must not resolve a pending cancellation unilaterally.');
        } catch (QueryException $exception) {
            self::assertStringContainsString('resolve pending cancellation under bilateral policy', $exception->getMessage());
        }

        self::assertFalse(Schema::hasTable('order_proposals'));
        self::assertSame('cancel_requested', DB::table('orders')->where('id', $id)->value('status'));
    }

    private function prepareLegacySchema(): void
    {
        $this->seed(DealChainExecutionSeeder::class);
        $this->migration()->down();
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_10_25_002100_version_order_proposals_and_current_terms.php');
    }

    private function insertLegacyOrder(string $id, string $status): void
    {
        $now = now();
        DB::table('orders')->updateOrInsert(
            ['id' => $id],
            [
                'origin' => 'listing',
                'mechanism' => 'direct_booking',
                'listing_id' => null,
                'request_id' => null,
                'quote_id' => null,
                'buyer_user_id' => Fix::BUYER_USER_ID,
                'provider_user_id' => Fix::STORE_USER_ID,
                'status' => $status,
                'geography' => null,
                'deal_chain_id' => null,
                'deal_need_id' => null,
                'correlation_id' => (string) Str::uuid7(),
                'version' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );

        $partyScope = json_encode(['role' => 'buyer'], JSON_THROW_ON_ERROR);
        DB::table('order_parties')
            ->where('order_id', $id)
            ->where('party_type', 'buyer')
            ->update(['scope' => $partyScope]);
        $buyerParty = DB::table('order_parties')
            ->where('order_id', $id)
            ->where('party_type', 'buyer')
            ->where('responsibility', 'primary')
            ->where('status', 'active')
            ->first();
        $partyValues = [
            'user_id' => Fix::BUYER_USER_ID,
            'responsibility' => 'primary',
            'scope' => $partyScope,
            'status' => 'active',
            'effective_at' => $now,
            'version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'updated_at' => $now,
        ];
        if ($buyerParty !== null) {
            DB::table('order_parties')->where('id', $buyerParty->id)->update($partyValues);
        } else {
            DB::table('order_parties')->insert([
                ...$partyValues,
                'id' => (string) Str::uuid7(),
                'order_id' => $id,
                'party_type' => 'buyer',
                'created_at' => $now,
            ]);
        }

    }
}
