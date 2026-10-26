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
        Schema::create('work_dependency_source_facts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('source_event_id')->unique('uq_work_dependency_source_facts_event');
            $table->text('event_type');
            $table->uuid('deal_chain_id');
            $table->uuid('deal_need_id');
            $table->uuid('confirmation_id');
            $table->uuid('order_id');
            $table->uuid('work_instance_id');
            $table->unsignedInteger('aggregate_version');
            $table->unsignedInteger('payload_version');
            $table->uuid('correlation_id');
            $table->timestampTz('occurred_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['deal_need_id', 'event_type', 'occurred_at'], 'idx_work_dependency_source_fact_need_event');
            $table->foreign(['deal_chain_id', 'deal_need_id'], 'fk_work_dependency_source_facts_need')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign('confirmation_id', 'fk_work_dependency_source_facts_confirmation')
                ->references('id')->on('deal_need_confirmations')->restrictOnDelete();
            $table->foreign('order_id', 'fk_work_dependency_source_facts_order')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_work_dependency_source_facts_work')
                ->references('id')->on('work_instances')->restrictOnDelete();
        });

        Schema::create('work_step_dependency_gates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('deal_chain_id');
            $table->uuid('dependency_id');
            $table->unsignedInteger('dependency_version');
            $table->text('condition_code');
            $table->uuid('predecessor_need_id');
            $table->uuid('successor_need_id');
            $table->uuid('source_confirmation_id');
            $table->uuid('source_order_id');
            $table->uuid('source_work_instance_id');
            $table->uuid('successor_confirmation_id');
            $table->uuid('successor_order_id');
            $table->uuid('successor_work_instance_id');
            $table->text('status')->default('blocked');
            $table->uuid('source_fact_id')->nullable();
            $table->timestampTz('cleared_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['dependency_id', 'dependency_version', 'successor_work_instance_id'], 'uq_work_step_dependency_gate_target');
            $table->index(['successor_work_instance_id', 'status'], 'idx_work_step_dependency_gate_work_status');
            $table->index(['source_work_instance_id', 'condition_code', 'status'], 'idx_work_step_dependency_gate_source');
            $table->foreign('deal_chain_id', 'fk_work_step_dependency_gates_chain')
                ->references('id')->on('deal_chains')->restrictOnDelete();
            $table->foreign('dependency_id', 'fk_work_step_dependency_gates_dependency')
                ->references('id')->on('deal_dependencies')->restrictOnDelete();
            $table->foreign(['deal_chain_id', 'predecessor_need_id'], 'fk_work_step_dependency_gates_predecessor')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign(['deal_chain_id', 'successor_need_id'], 'fk_work_step_dependency_gates_successor')
                ->references(['deal_chain_id', 'id'])->on('deal_needs')->restrictOnDelete();
            $table->foreign('source_confirmation_id', 'fk_work_step_dependency_gates_source_confirmation')
                ->references('id')->on('deal_need_confirmations')->restrictOnDelete();
            $table->foreign('source_order_id', 'fk_work_step_dependency_gates_source_order')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('source_work_instance_id', 'fk_work_step_dependency_gates_source_work')
                ->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('successor_confirmation_id', 'fk_work_step_dependency_gates_successor_confirmation')
                ->references('id')->on('deal_need_confirmations')->restrictOnDelete();
            $table->foreign('successor_order_id', 'fk_work_step_dependency_gates_successor_order')
                ->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('successor_work_instance_id', 'fk_work_step_dependency_gates_successor_work')
                ->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('source_fact_id', 'fk_work_step_dependency_gates_source_fact')
                ->references('id')->on('work_dependency_source_facts')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE work_dependency_source_facts ADD CONSTRAINT ck_work_dependency_source_facts_event_type CHECK (event_type IN ('work.ready_for_collection', 'work.delivered_to_site'))");
        DB::statement('ALTER TABLE work_dependency_source_facts ADD CONSTRAINT ck_work_dependency_source_facts_versions CHECK (aggregate_version > 0 AND payload_version > 0)');
        DB::statement("ALTER TABLE work_step_dependency_gates ADD CONSTRAINT ck_work_step_dependency_gates_condition CHECK (condition_code IN ('part_ready', 'delivery_signed'))");
        DB::statement("ALTER TABLE work_step_dependency_gates ADD CONSTRAINT ck_work_step_dependency_gates_status CHECK (status IN ('blocked', 'cleared', 'stale'))");
        DB::statement("ALTER TABLE work_step_dependency_gates ADD CONSTRAINT ck_work_step_dependency_gates_clearance CHECK ((status = 'cleared' AND source_fact_id IS NOT NULL AND cleared_at IS NOT NULL) OR (status <> 'cleared' AND source_fact_id IS NULL AND cleared_at IS NULL))");

        $confirmedWorks = DB::table('deal_dependencies as dependency')
            ->join('deal_need_confirmations as source_confirmation', function ($join): void {
                $join->on('source_confirmation.deal_chain_id', '=', 'dependency.deal_chain_id')
                    ->on('source_confirmation.deal_need_id', '=', 'dependency.predecessor_need_id');
            })
            ->join('work_instances as source_work', 'source_work.order_id', '=', 'source_confirmation.order_id')
            ->join('deal_need_confirmations as successor_confirmation', function ($join): void {
                $join->on('successor_confirmation.deal_chain_id', '=', 'dependency.deal_chain_id')
                    ->on('successor_confirmation.deal_need_id', '=', 'dependency.successor_need_id');
            })
            ->join('work_instances as successor_work', 'successor_work.order_id', '=', 'successor_confirmation.order_id')
            ->join('deal_needs as predecessor', function ($join): void {
                $join->on('predecessor.deal_chain_id', '=', 'dependency.deal_chain_id')
                    ->on('predecessor.id', '=', 'dependency.predecessor_need_id');
            })
            ->join('deal_needs as successor', function ($join): void {
                $join->on('successor.deal_chain_id', '=', 'dependency.deal_chain_id')
                    ->on('successor.id', '=', 'dependency.successor_need_id');
            })
            ->where('dependency.status', 'active')
            ->where('dependency.dependency_type', 'blocks')
            ->whereIn('dependency.condition_code', ['part_ready', 'delivery_signed'])
            ->whereNotIn('predecessor.status', ['superseded', 'cancelled', 'replacement_needed'])
            ->whereNotIn('successor.status', ['superseded', 'cancelled', 'replacement_needed'])
            ->select([
                'dependency.id as dependency_id', 'dependency.deal_chain_id', 'dependency.version as dependency_version',
                'dependency.condition_code', 'dependency.predecessor_need_id', 'dependency.successor_need_id',
                'source_confirmation.id as source_confirmation_id', 'source_confirmation.order_id as source_order_id',
                'source_work.id as source_work_instance_id', 'successor_confirmation.id as successor_confirmation_id',
                'successor_confirmation.order_id as successor_order_id', 'successor_work.id as successor_work_instance_id',
            ])->get();

        foreach ($confirmedWorks as $row) {
            DB::table('work_step_dependency_gates')->insertOrIgnore([
                'id' => (string) Str::uuid7(),
                'deal_chain_id' => (string) $row->deal_chain_id,
                'dependency_id' => (string) $row->dependency_id,
                'dependency_version' => (int) $row->dependency_version,
                'condition_code' => (string) $row->condition_code,
                'predecessor_need_id' => (string) $row->predecessor_need_id,
                'successor_need_id' => (string) $row->successor_need_id,
                'source_confirmation_id' => (string) $row->source_confirmation_id,
                'source_order_id' => (string) $row->source_order_id,
                'source_work_instance_id' => (string) $row->source_work_instance_id,
                'successor_confirmation_id' => (string) $row->successor_confirmation_id,
                'successor_order_id' => (string) $row->successor_order_id,
                'successor_work_instance_id' => (string) $row->successor_work_instance_id,
                'status' => 'blocked',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('work_step_dependency_gates');
        Schema::dropIfExists('work_dependency_source_facts');
    }
};
