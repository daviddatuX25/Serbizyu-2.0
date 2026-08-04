<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auth_otps', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->text('phone_e164');
            $table->text('purpose')->default('login');
            $table->char('code_hash', 64);
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestampTz('expires_at');
            $table->timestampTz('consumed_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->index(['phone_e164', 'purpose', 'expires_at'], 'idx_auth_otps_phone_purpose_expiry');
            $table->index(['correlation_id'], 'idx_auth_otps_correlation');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->timestampTz('phone_verified_at')->nullable()->after('phone_e164');
            $table->timestampTz('last_login_at')->nullable()->after('phone_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['phone_verified_at', 'last_login_at']);
        });

        Schema::dropIfExists('auth_otps');
    }
};
