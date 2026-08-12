<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_identities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('provider', 32);
            $table->string('provider_subject');
            $table->timestampTz('linked_at');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->unique(['provider', 'provider_subject'], 'uq_oauth_identities_provider_subject');
            $table->index(['user_id', 'provider'], 'idx_oauth_identities_user_provider');
            $table->foreign('user_id', 'fk_oauth_identities_user')
                ->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_identities');
    }
};
