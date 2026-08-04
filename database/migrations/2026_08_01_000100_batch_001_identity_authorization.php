<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('phone_e164');
            $table->text('status');
            $table->text('primary_access_tier');
            $table->string('locale', 16)->default('en');
            $table->string('timezone', 64)->default('UTC');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique('phone_e164', 'uq_users_phone_e164');
            $table->index(['status', 'phone_e164'], 'idx_users_active_login');
        });

        Schema::create('evidence_files', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('owner_user_id');
            $table->text('storage_key');
            $table->text('media_type');
            $table->unsignedBigInteger('size_bytes');
            $table->char('content_hash', 64);
            $table->text('evidence_type');
            $table->text('data_class');
            $table->text('scan_status');
            $table->text('visibility');
            $table->text('retention_policy');
            $table->timestampTz('deleted_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique('storage_key', 'uq_evidence_files_storage_key');
            $table->index(['content_hash', 'data_class'], 'idx_evidence_files_hash_class');
            $table->index(['owner_user_id', 'data_class', 'retention_policy'], 'idx_evidence_files_owner_class_retention');
            $table->foreign('owner_user_id', 'fk_evidence_files_owner')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('user_profiles', function (Blueprint $table): void {
            $table->uuid('user_id')->primary();
            $table->text('display_name');
            $table->text('public_bio')->nullable();
            $table->uuid('avatar_file_id')->nullable();
            $table->text('service_area_display')->nullable();
            $table->jsonb('accessibility_preferences')->nullable();
            $table->jsonb('language_preferences')->nullable();
            $table->jsonb('emergency_contact_policy')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('user_id', 'fk_user_profiles_user')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('avatar_file_id', 'fk_user_profiles_avatar_file')
                ->references('id')->on('evidence_files')->restrictOnDelete();
        });

        Schema::create('role_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->text('role_code');
            $table->text('status');
            $table->uuid('granted_by_user_id');
            $table->timestampTz('effective_at');
            $table->timestampTz('expires_at')->nullable();
            $table->jsonb('scope')->default('{}');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['user_id', 'status'], 'idx_role_assignments_user_status');
            $table->index(['expires_at', 'status'], 'idx_role_assignments_expiry_status');
            $table->foreign('user_id', 'fk_role_assignments_user')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('granted_by_user_id', 'fk_role_assignments_granted_by')
                ->references('id')->on('users')->restrictOnDelete();
        });

        Schema::create('identity_verifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->text('verification_type');
            $table->text('status');
            $table->text('provider')->nullable();
            $table->uuid('reviewed_by_user_id')->nullable();
            $table->uuid('evidence_file_id')->nullable();
            $table->text('reason')->nullable();
            $table->timestampTz('reviewed_at')->nullable();
            $table->text('retention_class');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['user_id', 'status'], 'idx_identity_verifications_user_status');
            $table->index(['evidence_file_id', 'retention_class'], 'idx_identity_verifications_evidence_retention');
            $table->foreign('user_id', 'fk_identity_verifications_user')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('reviewed_by_user_id', 'fk_identity_verifications_reviewer')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_identity_verifications_evidence')
                ->references('id')->on('evidence_files')->restrictOnDelete();
        });

        Schema::create('consent_grants', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('grantor_user_id');
            $table->uuid('grantee_user_id');
            $table->text('resource_type');
            $table->uuid('resource_id')->nullable();
            $table->jsonb('permission_scope');
            $table->text('status');
            $table->timestampTz('starts_at');
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->uuid('consent_evidence_file_id')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['grantor_user_id', 'status', 'expires_at'], 'idx_consent_grants_grantor_status_expiry');
            $table->index(['grantee_user_id', 'status', 'expires_at'], 'idx_consent_grants_grantee_status_expiry');
            $table->foreign('grantor_user_id', 'fk_consent_grants_grantor')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('grantee_user_id', 'fk_consent_grants_grantee')
                ->references('id')->on('users')->restrictOnDelete();
            $table->foreign('consent_evidence_file_id', 'fk_consent_grants_evidence')
                ->references('id')->on('evidence_files')->restrictOnDelete();
        });

        $checks = [
            ['users', 'ck_users_status', "status IN ('pending', 'active', 'suspended', 'closed', 'archived')"],
            ['users', 'ck_users_access_tier', "primary_access_tier IN ('L0', 'L1', 'L2', 'L3', 'L4')"],
            ['users', 'ck_users_version', 'version > 0'],
            ['evidence_files', 'ck_evidence_files_size', 'size_bytes >= 0'],
            ['evidence_files', 'ck_evidence_files_scan_status', "scan_status IN ('pending', 'clean', 'infected', 'failed', 'quarantined')"],
            ['role_assignments', 'ck_role_assignments_status', "status IN ('active', 'suspended', 'revoked', 'expired')"],
            ['role_assignments', 'ck_role_assignments_dates', 'expires_at IS NULL OR expires_at > effective_at'],
            ['identity_verifications', 'ck_identity_verifications_status', "status IN ('pending', 'more_info', 'approved', 'rejected', 'expired')"],
            ['consent_grants', 'ck_consent_grants_status', "status IN ('active', 'revoked', 'suspended', 'expired')"],
            ['consent_grants', 'ck_consent_grants_distinct_users', 'grantor_user_id <> grantee_user_id'],
            ['consent_grants', 'ck_consent_grants_dates', 'expires_at IS NULL OR expires_at > starts_at'],
        ];

        foreach ($checks as [$table, $name, $expression]) {
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$expression})");
        }

        DB::statement(
            'CREATE UNIQUE INDEX uq_role_assignments_active_scope '.
            "ON role_assignments (user_id, role_code, scope) WHERE status = 'active'"
        );

        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '001',
            'status' => 'completed',
            'checksum' => hash_file('sha256', __FILE__),
            'started_at' => now(),
            'completed_at' => now(),
            'operator' => null,
            'version' => 1,
            'correlation_id' => Str::uuid7()->toString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('migration_checkpoints')->where('batch', '001')->delete();

        Schema::dropIfExists('consent_grants');
        Schema::dropIfExists('identity_verifications');
        Schema::dropIfExists('role_assignments');
        Schema::dropIfExists('user_profiles');
        Schema::dropIfExists('evidence_files');
        Schema::dropIfExists('users');
    }
};
