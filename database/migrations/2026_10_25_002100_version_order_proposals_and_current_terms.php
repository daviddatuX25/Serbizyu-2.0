<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('order_proposals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id');
            $table->unsignedInteger('proposal_version');
            $table->uuid('parent_proposal_id')->nullable();
            $table->text('kind');
            $table->text('status');
            $table->uuid('proposed_by_user_id');
            $table->uuid('responded_by_user_id')->nullable();
            $table->timestampTz('responded_at')->nullable();
            $table->uuid('source_listing_version_id')->nullable();
            $table->jsonb('scope');
            $table->unsignedInteger('scope_payload_version')->default(1);
            $table->bigInteger('amount_minor');
            $table->char('currency', 3);
            $table->char('terms_hash', 64);
            $table->text('note')->nullable();
            $table->uuid('capacity_reservation_id')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_order_proposals_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('proposed_by_user_id', 'fk_order_proposals_proposer')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('responded_by_user_id', 'fk_order_proposals_responder')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('source_listing_version_id', 'fk_order_proposals_listing_version')->references('id')->on('listing_versions')->restrictOnDelete();
            $table->foreign('capacity_reservation_id', 'fk_order_proposals_reservation')->references('id')->on('listing_capacity_reservations')->restrictOnDelete();
            $table->unique(['order_id', 'proposal_version'], 'uq_order_proposals_order_version');
            $table->index(['order_id', 'status'], 'idx_order_proposals_order_status');
        });
        DB::statement('ALTER TABLE order_proposals ADD CONSTRAINT fk_order_proposals_parent FOREIGN KEY (parent_proposal_id) REFERENCES order_proposals(id) ON DELETE RESTRICT');

        DB::statement("ALTER TABLE order_proposals ADD CONSTRAINT chk_order_proposals_kind CHECK (kind IN ('initial', 'counter', 'amendment'))");
        DB::statement("ALTER TABLE order_proposals ADD CONSTRAINT chk_order_proposals_status CHECK (status IN ('proposed', 'accepted', 'declined', 'superseded'))");
        DB::statement('ALTER TABLE order_proposals ADD CONSTRAINT chk_order_proposals_amount CHECK (amount_minor >= 0)');

        Schema::table('orders', function (Blueprint $table): void {
            $table->uuid('current_proposal_id')->nullable();
            $table->uuid('current_terms_snapshot_id')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('cancelled_at')->nullable();
        });

        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status');
        DB::statement(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM orders WHERE status = 'cancel_requested') THEN
                    RAISE EXCEPTION 'Order migration blocked: resolve pending cancellation under bilateral policy before lifecycle cutover';
                END IF;
                IF EXISTS (
                    SELECT 1 FROM orders o
                    WHERE o.status IN ('accepted', 'closed', 'in_progress')
                      AND NOT EXISTS (SELECT 1 FROM order_terms_snapshots s WHERE s.order_id = o.id)
                      AND o.id::text NOT IN ('0198a3b1-7c40-7abc-8def-0f0100000001', '0198a3b1-7c40-7abc-8def-0f0100000002', '0198a3b1-7c40-7abc-8def-0f0100000003', '0198a3b1-7c40-7abc-8def-0f0100000004')
                ) THEN
                    RAISE EXCEPTION 'Cannot migrate accepted Order without authoritative terms snapshot';
                END IF;
            END $$;
        SQL);
        DB::statement("UPDATE orders SET status = 'cancelled' WHERE status IN ('accepted', 'closed') AND id::text IN ('0198a3b1-7c40-7abc-8def-0f0100000001', '0198a3b1-7c40-7abc-8def-0f0100000002', '0198a3b1-7c40-7abc-8def-0f0100000003', '0198a3b1-7c40-7abc-8def-0f0100000004') AND NOT EXISTS (SELECT 1 FROM order_terms_snapshots WHERE order_terms_snapshots.order_id = orders.id)");
        DB::table('orders')->where('status', 'pending_acceptance')->update(['status' => 'proposed']);
        DB::table('orders')->where('status', 'draft')->update(['status' => 'cancelled']);
        DB::table('orders')->where('status', 'closed')->update(['status' => 'completed']);
        DB::statement("UPDATE orders SET status = 'cancelled' WHERE status = 'proposed' AND NOT EXISTS (SELECT 1 FROM order_parties p WHERE p.order_id = orders.id AND p.party_type = 'buyer' AND jsonb_exists(p.scope, 'proposal'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_orders_status CHECK (status IN ('proposed', 'accepted', 'in_progress', 'completed', 'cancelled'))");
        DB::statement('DROP INDEX IF EXISTS uq_orders_active_deal_need');
        DB::statement("CREATE UNIQUE INDEX uq_orders_active_deal_need ON orders (deal_need_id) WHERE deal_need_id IS NOT NULL AND status IN ('proposed', 'accepted', 'in_progress')");
        DB::table('orders')->whereNotNull('buyer_user_id')->chunkById(100, function ($orders): void {
            $orderIds = $orders->pluck('id');
            $snapshots = DB::table('order_terms_snapshots')
                ->selectRaw('DISTINCT ON (order_id) *')
                ->whereIn('order_id', $orderIds)
                ->orderBy('order_id')->orderByDesc('snapshot_version')
                ->get()->keyBy('order_id');
            $parties = DB::table('order_parties')
                ->selectRaw('DISTINCT ON (order_id) order_id, scope')
                ->whereIn('order_id', $orderIds)->where('party_type', 'buyer')
                ->orderBy('order_id')->orderBy('created_at')->orderBy('id')
                ->get()->keyBy('order_id');
            foreach ($orders as $order) {
                $snapshot = $snapshots->get($order->id);
                $party = $parties->get($order->id);
                $partyScope = json_decode((string) ($party?->scope ?? '{}'), true);
                $legacyProposal = is_array($partyScope) && is_array($partyScope['proposal'] ?? null) ? $partyScope['proposal'] : null;
                if ($snapshot === null && $legacyProposal === null) {
                    if ((string) $order->status === 'proposed') {
                        DB::table('orders')->where('id', $order->id)->update(['status' => 'cancelled']);
                    }

                    continue;
                }

                $scope = $snapshot !== null
                    ? json_decode((string) $snapshot->scope, true)
                    : $legacyProposal;
                $scope = is_array($scope) ? $scope : [];
                $proposalScope = $snapshot !== null ? $scope : $legacyProposal;
                if ($snapshot === null) {
                    $amountMinor = $legacyProposal['amount_minor'] ?? null;
                    $currency = $legacyProposal['currency'] ?? null;
                    $sourceListingVersionId = $legacyProposal['listing_version_id'] ?? null;
                } else {
                    $amountMinor = $snapshot->amount_minor;
                    $currency = $snapshot->currency;
                    $sourceListingVersionId = $snapshot->source_listing_version_id;
                }
                if (! is_numeric($amountMinor) || ! is_string($currency) || strlen($currency) !== 3) {
                    throw new RuntimeException('Cannot migrate an Order proposal without authoritative amount and currency.');
                }
                $canonicalScope = json_encode($proposalScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $proposalId = (string) Str::uuid7();
                $proposalStatus = in_array((string) $order->status, ['proposed'], true)
                    ? 'proposed'
                    : (in_array((string) $order->status, ['cancelled'], true) ? 'declined' : 'accepted');
                DB::table('order_proposals')->insert([
                    'id' => $proposalId,
                    'order_id' => $order->id,
                    'proposal_version' => 1,
                    'parent_proposal_id' => null,
                    'kind' => 'initial',
                    'status' => $proposalStatus,
                    'proposed_by_user_id' => $order->buyer_user_id,
                    'responded_by_user_id' => $snapshot?->accepted_by_user_id,
                    'responded_at' => $snapshot?->accepted_at,
                    'source_listing_version_id' => $sourceListingVersionId,
                    'scope' => $canonicalScope,
                    'scope_payload_version' => 1,
                    'amount_minor' => (int) $amountMinor,
                    'currency' => strtoupper($currency),
                    'terms_hash' => hash('sha256', $canonicalScope),
                    'note' => null,
                    'capacity_reservation_id' => is_string($legacyProposal['capacity_reservation_id'] ?? null) ? $legacyProposal['capacity_reservation_id'] : null,
                    'expires_at' => null,
                    'correlation_id' => $order->correlation_id,
                    'created_at' => $order->created_at,
                    'updated_at' => $order->updated_at,
                ]);
                DB::table('orders')->where('id', $order->id)->update([
                    'current_proposal_id' => $proposalId,
                    'current_terms_snapshot_id' => $snapshot?->id,
                    'accepted_at' => $snapshot?->accepted_at,
                    'completed_at' => (string) $order->status === 'completed' ? $order->updated_at : null,
                    'cancelled_at' => (string) $order->status === 'cancelled' ? $order->updated_at : null,
                ]);
            }
        });

        DB::statement('ALTER TABLE orders ADD CONSTRAINT fk_orders_current_proposal FOREIGN KEY (current_proposal_id) REFERENCES order_proposals(id) ON DELETE RESTRICT');
        DB::statement('ALTER TABLE orders ADD CONSTRAINT fk_orders_current_terms_snapshot FOREIGN KEY (current_terms_snapshot_id) REFERENCES order_terms_snapshots(id) ON DELETE RESTRICT');
        DB::statement("CREATE UNIQUE INDEX uq_order_proposals_one_current ON order_proposals (order_id) WHERE status = 'proposed'");

    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS uq_order_proposals_one_current');
        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_current_terms_snapshot');
        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_current_proposal');
        DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status');
        DB::statement("UPDATE orders SET status = CASE WHEN status = 'proposed' THEN 'pending_acceptance' WHEN status = 'completed' THEN 'closed' ELSE status END");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_orders_status CHECK (status IN ('draft', 'pending_acceptance', 'accepted', 'cancel_requested', 'cancelled', 'closed'))");
        DB::statement('DROP INDEX IF EXISTS uq_orders_active_deal_need');
        DB::statement("CREATE UNIQUE INDEX uq_orders_active_deal_need ON orders (deal_need_id) WHERE deal_need_id IS NOT NULL AND status NOT IN ('cancelled', 'closed')");
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn(['current_proposal_id', 'current_terms_snapshot_id', 'accepted_at', 'completed_at', 'cancelled_at']);
        });
        Schema::dropIfExists('order_proposals');
    }
};
