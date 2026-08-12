<?php

declare(strict_types=1);

require_once __DIR__.'/support/canonical58_checkpoint.php';

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('integration_clients', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('owner_user_id');
            $table->text('name');
            $table->text('status');
            $table->text('environment');
            $table->text('audience');
            $table->jsonb('granted_scopes')->default('[]');
            $table->unsignedInteger('scope_schema_version')->default(1);
            $table->unsignedInteger('scope_version')->default(1);
            $table->unsignedInteger('row_version')->default(1);
            $table->timestampTz('activated_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampTz('archived_at')->nullable();
            $table->uuid('created_by_user_id')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['id', 'owner_user_id'], 'uq_integration_clients_id_owner');
            $table->index(['owner_user_id', 'status'], 'idx_integration_clients_owner_status');
            $table->foreign('owner_user_id', 'fk_integration_clients_owner')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_integration_clients_creator')
                ->references('id')->on('users')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE integration_clients ADD CONSTRAINT ck_integration_clients_status CHECK (status IN ('draft', 'active', 'suspended', 'revoked', 'archived'))");
        DB::statement('ALTER TABLE integration_clients ADD CONSTRAINT ck_integration_clients_versions CHECK (scope_schema_version > 0 AND scope_version > 0 AND row_version > 0)');
        DB::statement("CREATE UNIQUE INDEX uq_integration_clients_owner_name_active ON integration_clients (owner_user_id, name) WHERE status <> 'archived'");

        Schema::create('integration_credentials', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('integration_client_id');
            $table->text('public_selector');
            $table->char('secret_hash', 64)->nullable();
            $table->text('secret_reference')->nullable();
            $table->text('algorithm')->default('sha256');
            $table->unsignedInteger('secret_version')->default(1);
            $table->text('environment');
            $table->text('audience');
            $table->jsonb('granted_scopes')->default('[]');
            $table->unsignedInteger('scope_schema_version')->default(1);
            $table->unsignedInteger('granted_scope_version');
            $table->text('status');
            $table->uuid('rotates_from_credential_id')->nullable();
            $table->timestampTz('overlap_ends_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampTz('last_used_at')->nullable();
            $table->text('revoke_reason')->nullable();
            $table->timestampTz('issued_at');
            $table->timestampTz('expires_at')->nullable();
            $table->unsignedInteger('row_version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique('public_selector', 'uq_integration_credentials_selector');
            $table->index(['integration_client_id', 'status', 'expires_at'], 'idx_integration_credentials_client_status');
            $table->foreign('integration_client_id', 'fk_integration_credentials_client')
                ->references('id')->on('integration_clients')->restrictOnDelete();
        });

        Schema::table('integration_credentials', function (Blueprint $table): void {
            $table->foreign('rotates_from_credential_id', 'fk_integration_credentials_rotation')
                ->references('id')->on('integration_credentials')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE integration_credentials ADD CONSTRAINT ck_integration_credentials_status CHECK (status IN ('active', 'overlap', 'revoked', 'expired'))");
        DB::statement('ALTER TABLE integration_credentials ADD CONSTRAINT ck_integration_credentials_secret_storage CHECK ((secret_hash IS NOT NULL AND secret_reference IS NULL) OR (secret_hash IS NULL AND secret_reference IS NOT NULL))');
        DB::statement('ALTER TABLE integration_credentials ADD CONSTRAINT ck_integration_credentials_versions CHECK (secret_version > 0 AND scope_schema_version > 0 AND granted_scope_version > 0 AND row_version > 0)');
        DB::statement('ALTER TABLE integration_credentials ADD CONSTRAINT ck_integration_credentials_no_self_rotation CHECK (rotates_from_credential_id IS NULL OR rotates_from_credential_id <> id)');

        Schema::create('integration_object_mappings', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('integration_client_id');
            $table->uuid('owner_user_id');
            $table->text('resource_type');
            $table->text('external_id');
            $table->uuid('internal_id');
            $table->unsignedInteger('expected_sync_version')->default(1);
            $table->text('status');
            $table->unsignedInteger('mapping_schema_version')->default(1);
            $table->timestampTz('archived_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['integration_client_id', 'resource_type', 'external_id'], 'uq_integration_object_mappings_external');
            $table->unique(['integration_client_id', 'resource_type', 'internal_id'], 'uq_integration_object_mappings_internal');
            $table->index(['owner_user_id', 'resource_type', 'status'], 'idx_integration_object_mappings_owner');
            $table->foreign(['integration_client_id', 'owner_user_id'], 'fk_integration_object_mappings_client_owner')
                ->references(['id', 'owner_user_id'])->on('integration_clients')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE integration_object_mappings ADD CONSTRAINT ck_integration_object_mappings_status CHECK (status IN ('active', 'stale', 'archived'))");
        DB::statement('ALTER TABLE integration_object_mappings ADD CONSTRAINT ck_integration_object_mappings_versions CHECK (expected_sync_version > 0 AND mapping_schema_version > 0)');

        Schema::create('integration_webhook_subscriptions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('integration_client_id');
            $table->uuid('owner_user_id');
            $table->text('endpoint_url');
            $table->jsonb('event_allow_list')->default('[]');
            $table->unsignedInteger('filter_schema_version')->default(1);
            $table->text('secret_reference');
            $table->text('environment');
            $table->text('status');
            $table->unsignedInteger('subscription_version')->default(1);
            $table->jsonb('endpoint_verification_evidence')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign(['integration_client_id', 'owner_user_id'], 'fk_integration_webhook_subscriptions_client_owner')
                ->references(['id', 'owner_user_id'])->on('integration_clients')->restrictOnDelete();
            $table->index(['integration_client_id', 'status'], 'idx_integration_webhook_subscriptions_client_status');
        });

        DB::statement("ALTER TABLE integration_webhook_subscriptions ADD CONSTRAINT ck_integration_webhook_subscriptions_status CHECK (status IN ('draft', 'active', 'suspended', 'revoked'))");
        DB::statement("ALTER TABLE integration_webhook_subscriptions ADD CONSTRAINT ck_integration_webhook_subscriptions_https CHECK (endpoint_url ~* '^https://')");
        DB::statement("CREATE UNIQUE INDEX uq_integration_webhook_subscriptions_active_endpoint ON integration_webhook_subscriptions (integration_client_id, endpoint_url) WHERE status IN ('draft', 'active', 'suspended')");

        Schema::create('integration_webhook_deliveries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('subscription_id');
            $table->uuid('integration_client_id');
            $table->uuid('owner_user_id');
            $table->uuid('outbox_message_id');
            $table->unsignedInteger('event_contract_version')->default(1);
            $table->unsignedInteger('payload_contract_version')->default(1);
            $table->text('payload_hash');
            $table->unsignedInteger('attempt_number');
            $table->text('destination_host')->nullable();
            $table->ipAddress('destination_ip')->nullable();
            $table->text('status');
            $table->unsignedSmallInteger('http_response_class')->nullable();
            $table->unsignedInteger('retry_count')->default(0);
            $table->timestampTz('next_attempt_at')->nullable();
            $table->timestampTz('dead_lettered_at')->nullable();
            $table->text('error_code')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['subscription_id', 'outbox_message_id', 'attempt_number'], 'uq_integration_webhook_deliveries_attempt');
            $table->index(['status', 'next_attempt_at'], 'idx_integration_webhook_deliveries_due');
            $table->index(['correlation_id'], 'idx_integration_webhook_deliveries_correlation');
            $table->foreign('subscription_id', 'fk_integration_webhook_deliveries_subscription')
                ->references('id')->on('integration_webhook_subscriptions')->restrictOnDelete();
            $table->foreign(['integration_client_id', 'owner_user_id'], 'fk_integration_webhook_deliveries_client_owner')
                ->references(['id', 'owner_user_id'])->on('integration_clients')->restrictOnDelete();
            $table->foreign('outbox_message_id', 'fk_integration_webhook_deliveries_outbox')
                ->references('id')->on('outbox_messages')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE integration_webhook_deliveries ADD CONSTRAINT ck_integration_webhook_deliveries_status CHECK (status IN ('pending', 'succeeded', 'failed', 'dead_letter'))");
        DB::statement('ALTER TABLE integration_webhook_deliveries ADD CONSTRAINT ck_integration_webhook_deliveries_attempt CHECK (attempt_number > 0 AND retry_count >= 0)');

        Schema::create('integration_sync_cursors', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('integration_client_id');
            $table->uuid('owner_user_id');
            $table->text('resource_stream');
            $table->text('cursor_value');
            $table->unsignedBigInteger('sequence')->default(0);
            $table->unsignedInteger('contract_version')->default(1);
            $table->text('status');
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('reset_at')->nullable();
            $table->text('reset_reason')->nullable();
            $table->unsignedInteger('row_version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['integration_client_id', 'resource_stream'], 'uq_integration_sync_cursors_stream');
            $table->foreign(['integration_client_id', 'owner_user_id'], 'fk_integration_sync_cursors_client_owner')
                ->references(['id', 'owner_user_id'])->on('integration_clients')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE integration_sync_cursors ADD CONSTRAINT ck_integration_sync_cursors_status CHECK (status IN ('active', 'paused', 'reset', 'archived'))");
        DB::statement('ALTER TABLE integration_sync_cursors ADD CONSTRAINT ck_integration_sync_cursors_sequence CHECK (sequence >= 0 AND contract_version > 0 AND row_version > 0)');

        Schema::create('capability_activations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('capability_code');
            $table->unsignedInteger('capability_version')->default(1);
            $table->text('environment');
            $table->text('cohort')->nullable();
            $table->text('geography')->nullable();
            $table->uuid('owner_user_id')->nullable();
            $table->uuid('category_id')->nullable();
            $table->text('profile_family_code')->nullable();
            $table->text('mechanism')->nullable();
            $table->text('work_shape')->nullable();
            $table->text('payment_lane')->nullable();
            $table->text('provider')->nullable();
            $table->uuid('integration_client_id')->nullable();
            $table->text('dimension_fingerprint');
            $table->text('decision');
            $table->uuid('evidence_file_id')->nullable();
            $table->uuid('approval_set_id')->nullable();
            $table->uuid('accountable_owner_user_id');
            $table->timestampTz('effective_at');
            $table->timestampTz('expires_at')->nullable();
            $table->uuid('supersedes_id')->nullable();
            $table->text('rollback_owner')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['capability_code', 'decision', 'effective_at'], 'idx_capability_activations_code_decision');
            $table->index(['dimension_fingerprint', 'effective_at'], 'idx_capability_activations_fingerprint');
            $table->foreign('owner_user_id', 'fk_capability_activations_owner')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('category_id', 'fk_capability_activations_category')
                ->references('id')->on('categories')->restrictOnDelete();
            $table->foreign('integration_client_id', 'fk_capability_activations_client')
                ->references('id')->on('integration_clients')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_capability_activations_evidence')
                ->references('id')->on('evidence_files')->restrictOnDelete();
            $table->foreign('accountable_owner_user_id', 'fk_capability_activations_accountable')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::table('capability_activations', function (Blueprint $table): void {
            $table->foreign('supersedes_id', 'fk_capability_activations_supersedes')
                ->references('id')->on('capability_activations')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE capability_activations ADD CONSTRAINT ck_capability_activations_decision CHECK (decision IN ('enabled', 'disabled'))");
        DB::statement('ALTER TABLE capability_activations ADD CONSTRAINT ck_capability_activations_version CHECK (capability_version > 0)');
        DB::statement('ALTER TABLE capability_activations ADD CONSTRAINT ck_capability_activations_window CHECK (expires_at IS NULL OR effective_at < expires_at)');
        DB::statement(<<<'SQL'
            ALTER TABLE capability_activations
                ADD COLUMN effective_range tstzrange
                GENERATED ALWAYS AS (
                    tstzrange(effective_at, COALESCE(expires_at, 'infinity'::timestamptz), '[)')
                ) STORED
            SQL);
        DB::statement(<<<'SQL'
            ALTER TABLE capability_activations
                ADD CONSTRAINT excl_capability_activations_fingerprint_range
                EXCLUDE USING gist (
                    dimension_fingerprint WITH =,
                    effective_range WITH &&
                )
            SQL);

        Schema::create('command_approvals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('approval_set_id');
            $table->uuid('initiator_user_id');
            $table->uuid('approver_user_id');
            $table->text('required_approver_role');
            $table->text('approver_role');
            $table->uuid('integration_client_id')->nullable();
            $table->text('command_type');
            $table->text('command_fingerprint');
            $table->text('payload_hash');
            $table->jsonb('target_ids')->default('[]');
            $table->jsonb('target_versions')->default('{}');
            $table->jsonb('scopes')->default('[]');
            $table->bigInteger('amount_minor')->nullable();
            $table->char('currency', 3)->nullable();
            $table->unsignedInteger('policy_version')->default(1);
            $table->text('reason');
            $table->uuid('evidence_file_id')->nullable();
            $table->text('status');
            $table->timestampTz('issued_at');
            $table->timestampTz('expires_at');
            $table->timestampTz('consumed_at')->nullable();
            $table->text('idempotency_scope');
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['approval_set_id', 'approver_user_id', 'approver_role'], 'uq_command_approvals_set_approver_role');
            $table->unique(['idempotency_scope', 'idempotency_key'], 'uq_command_approvals_idempotency');
            $table->index(['command_fingerprint', 'status', 'expires_at'], 'idx_command_approvals_fingerprint');
            $table->index(['status', 'expires_at'], 'idx_command_approvals_pending_expiry');
            $table->foreign('initiator_user_id', 'fk_command_approvals_initiator')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approver_user_id', 'fk_command_approvals_approver')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('integration_client_id', 'fk_command_approvals_client')
                ->references('id')->on('integration_clients')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_command_approvals_evidence')
                ->references('id')->on('evidence_files')->restrictOnDelete();
        });

        DB::statement("ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_status CHECK (status IN ('pending', 'approved', 'consumed', 'expired', 'revoked'))");
        DB::statement('ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_window CHECK (issued_at < expires_at)');
        DB::statement('ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_amount CHECK ((amount_minor IS NULL AND currency IS NULL) OR (amount_minor IS NOT NULL AND amount_minor >= 0 AND currency IS NOT NULL))');
        DB::statement('ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_maker_checker CHECK (initiator_user_id <> approver_user_id)');
        DB::statement('ALTER TABLE command_approvals ADD CONSTRAINT ck_command_approvals_policy_version CHECK (policy_version > 0)');

        DB::statement('ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_integration_client FOREIGN KEY (integration_client_id) REFERENCES integration_clients(id) ON DELETE RESTRICT');
        DB::statement('ALTER TABLE idempotency_keys ADD CONSTRAINT fk_idempotency_keys_integration_client FOREIGN KEY (integration_client_id) REFERENCES integration_clients(id) ON DELETE RESTRICT');
        DB::statement('ALTER TABLE outbox_messages ADD CONSTRAINT fk_outbox_messages_integration_client FOREIGN KEY (integration_client_id) REFERENCES integration_clients(id) ON DELETE RESTRICT');

        canonical58_checkpoint_complete('008', __FILE__);
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        canonical58_checkpoint_forget('008');

        DB::statement('ALTER TABLE outbox_messages DROP CONSTRAINT IF EXISTS fk_outbox_messages_integration_client');
        DB::statement('ALTER TABLE idempotency_keys DROP CONSTRAINT IF EXISTS fk_idempotency_keys_integration_client');
        DB::statement('ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS fk_audit_events_integration_client');

        Schema::dropIfExists('command_approvals');
        Schema::dropIfExists('capability_activations');
        Schema::dropIfExists('integration_sync_cursors');
        Schema::dropIfExists('integration_webhook_deliveries');
        Schema::dropIfExists('integration_webhook_subscriptions');
        Schema::dropIfExists('integration_object_mappings');
        Schema::dropIfExists('integration_credentials');
        Schema::dropIfExists('integration_clients');
    }
};
