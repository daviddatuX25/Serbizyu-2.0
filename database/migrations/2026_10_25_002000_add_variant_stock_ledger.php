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
        Schema::table('listing_capacity', function (Blueprint $table): void {
            $table->string('stock_policy')->nullable();
            $table->string('availability_status')->default('open');
            $table->unsignedBigInteger('low_stock_threshold')->default(0);
        });

        DB::statement('DROP INDEX IF EXISTS uq_listing_capacity_bucket');
        DB::statement("CREATE UNIQUE INDEX uq_listing_capacity_variant_bucket ON listing_capacity (listing_id, resource_key) WHERE capacity_type = 'quantity' AND resource_key <> ''");
        DB::statement("CREATE UNIQUE INDEX uq_listing_capacity_default_bucket ON listing_capacity (listing_id, listing_version_id, capacity_type, resource_key) WHERE capacity_type = 'quantity' AND resource_key = ''");
        DB::statement('ALTER TABLE listing_capacity DROP CONSTRAINT IF EXISTS ck_listing_capacity_quantities');
        DB::statement("ALTER TABLE listing_capacity ADD CONSTRAINT ck_listing_capacity_quantities CHECK ((quantity IS NULL OR quantity >= 0) AND (remaining_quantity IS NULL OR remaining_quantity >= 0 OR availability_status = 'shortage') AND (quantity IS NULL OR remaining_quantity IS NULL OR remaining_quantity <= quantity OR availability_status = 'shortage'))");
        DB::statement("ALTER TABLE listing_capacity ADD CONSTRAINT ck_listing_capacity_stock_policy CHECK (stock_policy IS NULL OR stock_policy IN ('tracked'))");
        DB::statement("ALTER TABLE listing_capacity ADD CONSTRAINT ck_listing_capacity_availability_status CHECK (availability_status IN ('open', 'out_of_stock', 'shortage', 'paused'))");

        Schema::table('listing_capacity_reservations', function (Blueprint $table): void {
            $table->unsignedBigInteger('fulfilled_quantity')->default(0);
            $table->unsignedBigInteger('released_quantity')->default(0);
            $table->timestampTz('fulfilled_at')->nullable();
            $table->foreignUuid('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('owner_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('consent_grant_id')->nullable()->constrained('consent_grants')->restrictOnDelete();
        });
        DB::statement('ALTER TABLE listing_capacity_reservations DROP CONSTRAINT IF EXISTS fk_listing_capacity_reservations_capacity_version');
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT fk_listing_capacity_reservations_listing_version FOREIGN KEY (listing_version_id) REFERENCES listing_versions(id) ON DELETE RESTRICT');
        DB::statement('ALTER TABLE listing_capacity_reservations DROP CONSTRAINT IF EXISTS ck_listing_capacity_reservations_status');
        DB::statement("ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_status CHECK (status IN ('held', 'committed', 'fulfilled', 'released', 'expired'))");
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_stock_quantities CHECK (fulfilled_quantity >= 0 AND released_quantity >= 0 AND fulfilled_quantity + released_quantity <= quantity)');
        DB::statement('CREATE INDEX idx_stock_reservations_capacity_status ON listing_capacity_reservations (listing_capacity_id, status, order_id)');

        Schema::create('stock_movements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('listing_capacity_id')->constrained('listing_capacity')->restrictOnDelete();
            $table->foreignUuid('source_listing_version_id')->nullable()->constrained('listing_versions')->restrictOnDelete();
            $table->foreignUuid('reservation_id')->nullable()->constrained('listing_capacity_reservations')->restrictOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->restrictOnDelete();
            $table->string('movement_type');
            $table->bigInteger('delta_on_hand')->default(0);
            $table->bigInteger('delta_held')->default(0);
            $table->bigInteger('delta_committed')->default(0);
            $table->bigInteger('balance_on_hand');
            $table->bigInteger('balance_held');
            $table->bigInteger('balance_committed');
            $table->bigInteger('balance_available');
            $table->unsignedBigInteger('counted_quantity')->nullable();
            $table->text('reason')->nullable();
            $table->string('reference')->nullable();
            $table->foreignUuid('evidence_file_id')->nullable()->constrained('evidence_files')->restrictOnDelete();
            $table->foreignUuid('actor_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('owner_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('consent_grant_id')->nullable()->constrained('consent_grants')->restrictOnDelete();
            $table->string('command_scope')->nullable();
            $table->string('idempotency_key')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('occurred_at');
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['command_scope', 'idempotency_key'], 'uq_stock_movements_command');
            $table->index(['listing_capacity_id', 'occurred_at', 'id'], 'idx_stock_movements_history');
        });
        DB::statement("ALTER TABLE stock_movements ADD CONSTRAINT ck_stock_movements_type CHECK (movement_type IN ('opening_balance', 'receiving', 'damaged', 'recount', 'hold', 'commit', 'release', 'fulfillment'))");
        DB::statement('ALTER TABLE stock_movements ADD CONSTRAINT ck_stock_movements_balances CHECK (balance_on_hand >= 0 AND balance_held >= 0 AND balance_committed >= 0 AND balance_available = balance_on_hand - balance_held - balance_committed)');
        DB::unprepared(<<<'SQL'
            CREATE FUNCTION prevent_stock_movement_mutation() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'stock_movements is append-only';
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER trg_stock_movements_append_only
            BEFORE UPDATE OR DELETE ON stock_movements
            FOR EACH ROW EXECUTE FUNCTION prevent_stock_movement_mutation();
            SQL);

        $this->provisionCurrentProductVariants();
    }

    private function provisionCurrentProductVariants(): void
    {
        $rows = DB::table('listings')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')
                    ->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->where('listings.listing_type', 'product')
            ->select('listings.id as listing_id', 'listings.owner_user_id', 'listing_versions.id as listing_version_id', 'listing_versions.terms', 'listing_versions.authored_by_user_id', 'listing_versions.correlation_id')
            ->get();

        foreach ($rows as $row) {
            $terms = is_array($row->terms) ? $row->terms : json_decode((string) $row->terms, true);
            foreach (($terms['variants'] ?? []) as $variant) {
                $resourceKey = trim((string) ($variant['id'] ?? ''));
                if ($resourceKey === '') {
                    continue;
                }

                $existing = DB::table('listing_capacity')
                    ->where('listing_id', $row->listing_id)
                    ->where('capacity_type', 'quantity')
                    ->where('resource_key', $resourceKey)
                    ->first();
                if ($existing !== null) {
                    continue;
                }

                $quantity = max(0, (int) ($variant['stock'] ?? 0));
                $capacityId = (string) Str::uuid7();
                $available = $quantity;
                $status = $available === 0 ? 'out_of_stock' : 'open';
                DB::table('listing_capacity')->insert([
                    'id' => $capacityId,
                    'listing_id' => $row->listing_id,
                    'listing_version_id' => $row->listing_version_id,
                    'capacity_type' => 'quantity',
                    'quantity' => $quantity,
                    'remaining_quantity' => $available,
                    'slot_start' => null,
                    'slot_end' => null,
                    'reservation_status' => $available === 0 ? 'held' : 'open',
                    'version' => 1,
                    'resource_key' => $resourceKey,
                    'row_version' => 1,
                    'stock_policy' => 'tracked',
                    'availability_status' => $status,
                    'low_stock_threshold' => 0,
                    'correlation_id' => $row->correlation_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('stock_movements')->insert([
                    'id' => (string) Str::uuid7(),
                    'listing_capacity_id' => $capacityId,
                    'source_listing_version_id' => $row->listing_version_id,
                    'reservation_id' => null,
                    'order_id' => null,
                    'movement_type' => 'opening_balance',
                    'delta_on_hand' => $quantity,
                    'delta_held' => 0,
                    'delta_committed' => 0,
                    'balance_on_hand' => $quantity,
                    'balance_held' => 0,
                    'balance_committed' => 0,
                    'balance_available' => $available,
                    'counted_quantity' => null,
                    'reason' => 'Opening stock provisioned from the published product variant.',
                    'reference' => null,
                    'evidence_file_id' => null,
                    'actor_user_id' => $row->authored_by_user_id,
                    'owner_user_id' => $row->owner_user_id,
                    'consent_grant_id' => null,
                    'command_scope' => 'stock.opening:'.$row->listing_id.':'.$resourceKey,
                    'idempotency_key' => 'stock-open:'.$row->listing_id.':'.$resourceKey,
                    'correlation_id' => $row->correlation_id,
                    'occurred_at' => now(),
                    'created_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_stock_movements_append_only ON stock_movements');
        DB::unprepared('DROP FUNCTION IF EXISTS prevent_stock_movement_mutation()');
        Schema::dropIfExists('stock_movements');
        DB::statement('DROP INDEX IF EXISTS idx_stock_reservations_capacity_status');
        DB::statement('ALTER TABLE listing_capacity_reservations DROP CONSTRAINT IF EXISTS ck_listing_capacity_reservations_stock_quantities');
        DB::statement('ALTER TABLE listing_capacity_reservations DROP CONSTRAINT IF EXISTS fk_listing_capacity_reservations_listing_version');
        DB::statement('ALTER TABLE listing_capacity_reservations ADD CONSTRAINT fk_listing_capacity_reservations_capacity_version FOREIGN KEY (listing_capacity_id, listing_version_id) REFERENCES listing_capacity(id, listing_version_id) ON DELETE RESTRICT');
        DB::statement('ALTER TABLE listing_capacity_reservations DROP CONSTRAINT IF EXISTS ck_listing_capacity_reservations_status');
        DB::statement("ALTER TABLE listing_capacity_reservations ADD CONSTRAINT ck_listing_capacity_reservations_status CHECK (status IN ('held', 'committed', 'released', 'expired'))");
        Schema::table('listing_capacity_reservations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('consent_grant_id');
            $table->dropConstrainedForeignId('owner_user_id');
            $table->dropConstrainedForeignId('actor_user_id');
            $table->dropColumn(['fulfilled_quantity', 'released_quantity', 'fulfilled_at']);
        });
        DB::statement('DROP INDEX IF EXISTS uq_listing_capacity_variant_bucket');
        DB::statement('CREATE UNIQUE INDEX uq_listing_capacity_bucket ON listing_capacity (listing_id, listing_version_id, capacity_type, resource_key)');
        DB::statement('ALTER TABLE listing_capacity DROP CONSTRAINT IF EXISTS ck_listing_capacity_stock_policy');
        DB::statement('ALTER TABLE listing_capacity DROP CONSTRAINT IF EXISTS ck_listing_capacity_availability_status');
        DB::statement('ALTER TABLE listing_capacity DROP CONSTRAINT IF EXISTS ck_listing_capacity_quantities');
        DB::statement('ALTER TABLE listing_capacity ADD CONSTRAINT ck_listing_capacity_quantities CHECK ((quantity IS NULL OR quantity >= 0) AND (remaining_quantity IS NULL OR remaining_quantity >= 0) AND (quantity IS NULL OR remaining_quantity IS NULL OR remaining_quantity <= quantity))');
        Schema::table('listing_capacity', function (Blueprint $table): void {
            $table->dropColumn(['stock_policy', 'availability_status', 'low_stock_threshold']);
        });
    }
};
