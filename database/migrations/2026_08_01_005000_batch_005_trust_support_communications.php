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
        Schema::create('disputes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('reporter_user_id');
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('payment_obligation_id')->nullable();
            $table->text('reason');
            $table->text('category');
            $table->text('status');
            $table->text('severity');
            $table->timestampTz('opened_at');
            $table->timestampTz('resolved_at')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('reporter_user_id', 'fk_disputes_reporter')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('order_id', 'fk_disputes_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_disputes_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('payment_obligation_id', 'fk_disputes_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();

            $table->index(['status', 'severity', 'opened_at'], 'idx_disputes_active_severity');
            $table->index(['order_id', 'status'], 'idx_disputes_order_status');
            $table->index(['work_instance_id', 'status'], 'idx_disputes_work_status');
            $table->index(['payment_obligation_id', 'status'], 'idx_disputes_obligation_status');
        });

        DB::statement("ALTER TABLE disputes ADD CONSTRAINT chk_disputes_status CHECK (status IN ('opened', 'evidence_requested', 'under_review', 'resolved', 'rejected', 'withdrawn', 'appealed', 'closed'))");
        DB::statement('ALTER TABLE disputes ADD CONSTRAINT chk_disputes_target CHECK (order_id IS NOT NULL OR work_instance_id IS NOT NULL OR payment_obligation_id IS NOT NULL)');
        DB::statement("ALTER TABLE disputes ADD CONSTRAINT chk_disputes_resolution_time CHECK ((status IN ('resolved', 'rejected', 'withdrawn', 'closed') AND resolved_at IS NOT NULL) OR (status IN ('opened', 'evidence_requested', 'under_review', 'appealed') AND resolved_at IS NULL))");
        DB::statement("CREATE INDEX idx_disputes_active_target ON disputes (order_id, work_instance_id, payment_obligation_id) WHERE status NOT IN ('resolved', 'rejected', 'withdrawn', 'closed')");

        Schema::create('dispute_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('dispute_id');
            $table->text('event_type');
            $table->uuid('actor_user_id')->nullable();
            $table->uuid('evidence_file_id')->nullable();
            $table->text('previous_status')->nullable();
            $table->text('new_status');
            $table->jsonb('payload')->nullable();
            $table->unsignedInteger('payload_version')->nullable();
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->timestampTz('occurred_at');
            $table->timestampTz('effective_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('dispute_id', 'fk_dispute_events_dispute')->references('id')->on('disputes')->restrictOnDelete();
            $table->foreign('actor_user_id', 'fk_dispute_events_actor')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('evidence_file_id', 'fk_dispute_events_evidence')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->unique(['dispute_id', 'idempotency_key'], 'uq_dispute_events_idempotency');
            $table->index(['dispute_id', 'occurred_at'], 'idx_dispute_events_dispute_time');
        });

        DB::statement("ALTER TABLE dispute_events ADD CONSTRAINT chk_dispute_events_new_status CHECK (new_status IN ('opened', 'evidence_requested', 'under_review', 'resolved', 'rejected', 'withdrawn', 'appealed', 'closed'))");
        DB::statement("ALTER TABLE dispute_events ADD CONSTRAINT chk_dispute_events_previous_status CHECK (previous_status IS NULL OR previous_status IN ('opened', 'evidence_requested', 'under_review', 'resolved', 'rejected', 'withdrawn', 'appealed', 'closed'))");
        DB::statement('ALTER TABLE dispute_events ADD CONSTRAINT chk_dispute_events_payload_version CHECK ((payload IS NULL AND payload_version IS NULL) OR (payload IS NOT NULL AND payload_version IS NOT NULL))');

        Schema::create('administrative_holds', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('payment_obligation_id')->nullable();
            $table->text('reason_class');
            $table->text('status');
            $table->uuid('created_by_user_id');
            $table->uuid('approved_by_user_id')->nullable();
            $table->timestampTz('effective_at');
            $table->timestampTz('released_at')->nullable();
            $table->jsonb('release_conditions');
            $table->unsignedInteger('release_conditions_payload_version');
            $table->text('release_reason')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_administrative_holds_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_administrative_holds_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('payment_obligation_id', 'fk_administrative_holds_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_administrative_holds_creator')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('approved_by_user_id', 'fk_administrative_holds_approver')->references('id')->on('users')->restrictOnDelete();

            $table->index(['status', 'effective_at'], 'idx_administrative_holds_status_effective');
            $table->index(['order_id', 'status'], 'idx_administrative_holds_order_status');
            $table->index(['work_instance_id', 'status'], 'idx_administrative_holds_work_status');
            $table->index(['payment_obligation_id', 'status'], 'idx_administrative_holds_obligation_status');
        });

        DB::statement("ALTER TABLE administrative_holds ADD CONSTRAINT chk_administrative_holds_reason CHECK (reason_class IN ('dispute', 'fraud', 'safety', 'legal', 'provider', 'operational'))");
        DB::statement("ALTER TABLE administrative_holds ADD CONSTRAINT chk_administrative_holds_status CHECK (status IN ('active', 'reviewing', 'released', 'converted_to_restriction', 'closed'))");
        DB::statement('ALTER TABLE administrative_holds ADD CONSTRAINT chk_administrative_holds_target CHECK (order_id IS NOT NULL OR work_instance_id IS NOT NULL OR payment_obligation_id IS NOT NULL)');
        DB::statement("ALTER TABLE administrative_holds ADD CONSTRAINT chk_administrative_holds_release CHECK ((status IN ('released', 'converted_to_restriction', 'closed') AND released_at IS NOT NULL AND release_reason IS NOT NULL) OR (status IN ('active', 'reviewing') AND released_at IS NULL))");
        DB::statement("CREATE INDEX idx_administrative_holds_active_target ON administrative_holds (order_id, work_instance_id, payment_obligation_id) WHERE status IN ('active', 'reviewing')");

        Schema::create('support_cases', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('reporter_user_id')->nullable();
            $table->uuid('requester_user_id')->nullable();
            $table->text('category');
            $table->text('severity');
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('payment_obligation_id')->nullable();
            $table->text('status');
            $table->uuid('owner_user_id')->nullable();
            $table->text('resolution')->nullable();
            $table->timestampTz('opened_at');
            $table->timestampTz('first_response_due_at')->nullable();
            $table->timestampTz('resolution_due_at')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('reporter_user_id', 'fk_support_cases_reporter')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('requester_user_id', 'fk_support_cases_requester')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('order_id', 'fk_support_cases_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_support_cases_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('payment_obligation_id', 'fk_support_cases_obligation')->references('id')->on('payment_obligations')->restrictOnDelete();
            $table->foreign('owner_user_id', 'fk_support_cases_owner')->references('id')->on('users')->restrictOnDelete();

            $table->index(['status', 'severity', 'opened_at'], 'idx_support_cases_status_severity');
            $table->index(['owner_user_id', 'status'], 'idx_support_cases_owner_status');
            $table->index(['order_id', 'status'], 'idx_support_cases_order_status');
            $table->index(['resolution_due_at', 'status'], 'idx_support_cases_sla');
        });

        Schema::create('safety_incidents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('reporter_user_id');
            $table->uuid('affected_user_id')->nullable();
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('listing_id')->nullable();
            $table->text('category');
            $table->text('severity');
            $table->text('response_status');
            $table->uuid('escalation_owner_user_id')->nullable();
            $table->text('retention_class');
            $table->timestampTz('reported_at');
            $table->timestampTz('resolved_at')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('reporter_user_id', 'fk_safety_incidents_reporter')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('affected_user_id', 'fk_safety_incidents_affected')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('order_id', 'fk_safety_incidents_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_safety_incidents_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('listing_id', 'fk_safety_incidents_listing')->references('id')->on('listings')->restrictOnDelete();
            $table->foreign('escalation_owner_user_id', 'fk_safety_incidents_owner')->references('id')->on('users')->restrictOnDelete();

            $table->index(['response_status', 'severity', 'reported_at'], 'idx_safety_incidents_response');
            $table->index(['order_id', 'response_status'], 'idx_safety_incidents_order_status');
            $table->index(['work_instance_id', 'response_status'], 'idx_safety_incidents_work_status');
        });

        DB::statement("ALTER TABLE safety_incidents ADD CONSTRAINT chk_safety_incidents_retention CHECK (retention_class = 'P3')");

        Schema::create('reviews', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('author_user_id');
            $table->uuid('subject_user_id');
            $table->smallInteger('rating');
            $table->text('content')->nullable();
            $table->uuid('eligibility_evidence_file_id')->nullable();
            $table->text('moderation_status');
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_reviews_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_reviews_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('author_user_id', 'fk_reviews_author')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('subject_user_id', 'fk_reviews_subject')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('eligibility_evidence_file_id', 'fk_reviews_eligibility_evidence')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->unique(['order_id', 'author_user_id', 'subject_user_id'], 'uq_reviews_order_author_subject');
            $table->index(['subject_user_id', 'moderation_status'], 'idx_reviews_subject_status');
            $table->index(['order_id', 'moderation_status'], 'idx_reviews_order_status');
        });

        DB::statement('ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)');
        DB::statement('ALTER TABLE reviews ADD CONSTRAINT chk_reviews_target CHECK (order_id IS NOT NULL OR work_instance_id IS NOT NULL)');

        Schema::create('conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->jsonb('participants');
            $table->unsignedInteger('participants_payload_version');
            $table->jsonb('access_policy');
            $table->unsignedInteger('access_policy_payload_version');
            $table->uuid('order_id')->nullable();
            $table->uuid('work_instance_id')->nullable();
            $table->uuid('created_by_user_id');
            $table->text('status');
            $table->uuid('correlation_id');
            $table->unsignedInteger('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('order_id', 'fk_conversations_order')->references('id')->on('orders')->restrictOnDelete();
            $table->foreign('work_instance_id', 'fk_conversations_work')->references('id')->on('work_instances')->restrictOnDelete();
            $table->foreign('created_by_user_id', 'fk_conversations_creator')->references('id')->on('users')->restrictOnDelete();

            $table->index(['order_id', 'status'], 'idx_conversations_order_status');
            $table->index(['work_instance_id', 'status'], 'idx_conversations_work_status');
            $table->index(['status', 'updated_at'], 'idx_conversations_status_updated');
        });

        DB::statement('ALTER TABLE conversations ADD CONSTRAINT chk_conversations_payload_versions CHECK (participants_payload_version > 0 AND access_policy_payload_version > 0)');

        Schema::create('messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('conversation_id');
            $table->uuid('actor_user_id');
            $table->text('content');
            $table->uuid('attachment_evidence_file_id')->nullable();
            $table->text('delivery_state');
            $table->jsonb('audit_metadata')->nullable();
            $table->unsignedInteger('audit_metadata_payload_version')->nullable();
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('conversation_id', 'fk_messages_conversation')->references('id')->on('conversations')->restrictOnDelete();
            $table->foreign('actor_user_id', 'fk_messages_actor')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('attachment_evidence_file_id', 'fk_messages_attachment')->references('id')->on('evidence_files')->restrictOnDelete();

            $table->unique(['conversation_id', 'idempotency_key'], 'uq_messages_idempotency');
            $table->index(['conversation_id', 'created_at'], 'idx_messages_conversation_time');
            $table->index(['delivery_state', 'created_at'], 'idx_messages_delivery_time');
        });

        DB::statement('ALTER TABLE messages ADD CONSTRAINT chk_messages_audit_metadata_version CHECK ((audit_metadata IS NULL AND audit_metadata_payload_version IS NULL) OR (audit_metadata IS NOT NULL AND audit_metadata_payload_version IS NOT NULL))');

        Schema::create('notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('recipient_user_id');
            $table->text('event_source_type');
            $table->uuid('event_source_id');
            $table->text('event_type');
            $table->text('priority');
            $table->text('status');
            $table->jsonb('payload');
            $table->unsignedInteger('payload_version');
            $table->text('idempotency_key');
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('recipient_user_id', 'fk_notifications_recipient')->references('id')->on('users')->restrictOnDelete();

            $table->unique(['recipient_user_id', 'idempotency_key'], 'uq_notifications_idempotency');
            $table->index(['recipient_user_id', 'status'], 'idx_notifications_recipient_status');
            $table->index(['event_source_type', 'event_source_id'], 'idx_notifications_source');
        });

        DB::statement('ALTER TABLE notifications ADD CONSTRAINT chk_notifications_payload_version CHECK (payload_version > 0)');

        Schema::create('notification_deliveries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('notification_id');
            $table->text('channel');
            $table->text('provider_reference')->nullable();
            $table->text('status');
            $table->unsignedInteger('retry_count')->default(0);
            $table->unsignedInteger('attempt_number')->default(1);
            $table->text('failure_reason')->nullable();
            $table->timestampTz('delivered_at')->nullable();
            $table->timestampTz('next_attempt_at')->nullable();
            $table->uuid('correlation_id');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('notification_id', 'fk_notification_deliveries_notification')->references('id')->on('notifications')->restrictOnDelete();

            $table->unique(['notification_id', 'channel', 'attempt_number'], 'uq_notification_deliveries_attempt');
            $table->index(['status', 'next_attempt_at'], 'idx_notification_deliveries_retry');
            $table->index(['notification_id', 'status'], 'idx_notification_deliveries_notification_status');
            $table->index(['provider_reference', 'channel'], 'idx_notification_deliveries_provider');
        });

        DB::statement('ALTER TABLE notification_deliveries ADD CONSTRAINT chk_notification_deliveries_retry CHECK (retry_count >= 0 AND attempt_number > 0)');
        DB::table('migration_checkpoints')->insert([
            'id' => Str::uuid7()->toString(),
            'migration_version' => basename(__FILE__),
            'batch' => '005',
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
        DB::table('migration_checkpoints')->where('batch', '005')->delete();
        Schema::dropIfExists('notification_deliveries');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('safety_incidents');
        Schema::dropIfExists('support_cases');
        Schema::dropIfExists('administrative_holds');
        Schema::dropIfExists('dispute_events');
        Schema::dropIfExists('disputes');
    }
};
