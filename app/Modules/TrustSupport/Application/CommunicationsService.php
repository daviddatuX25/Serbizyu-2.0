<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\PublicReferenceAllocator;
use App\Shared\Application\KernelException;
use App\Shared\Contracts\ActingForAuthorizer;
use App\Shared\Contracts\DealChainConversationParticipantsPort;
use App\Shared\Contracts\DealChildFinancialStatePort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OrderConversationScopePort;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\PaymentConversationEvidencePort;
use App\Shared\Contracts\PrivateEvidenceReaderPort;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Contracts\WorkConversationEvidencePort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class CommunicationsService
{
    public function __construct(
        private readonly OrderConversationScopePort $orders,
        private readonly DealChainConversationParticipantsPort $dealParticipants,
        private readonly DealChildFinancialStatePort $financialStates,
        private readonly ActingForAuthorizer $actingFor,
        private readonly ParticipantDisplayNameReaderPort $displayNames,
        private readonly WorkConversationEvidencePort $workEvidence,
        private readonly PaymentConversationEvidencePort $paymentEvidence,
        private readonly PrivateEvidenceReaderPort $privateEvidence,
        private readonly StaffAccessPort $staffAccess,
        private readonly NotificationsPort $notifications,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly PublicReferenceAllocator $references,
    ) {}

    public function openOrder(string $orderId, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($orderId, $actorId, $ownerId, $grantId, $correlationId): array {
            $owner = $ownerId ?? $actorId;
            $scope = $this->orders->findForConversation($orderId);
            if ($scope === null) {
                throw $this->error('ORDER_NOT_FOUND', 'The order conversation is unavailable.', $correlationId, 404);
            }
            $this->assertOrderAccess($scope, $actorId, $owner, $grantId, 'order.conversation.read', $correlationId);
            $archiveRequired = $this->isCompletedAndSettled($scope);
            $conversation = $this->findOrCreateConversation('order', $orderId, $actorId, $owner, $grantId, $correlationId);
            if ($archiveRequired) {
                $this->archiveSettledOrder($conversation, $correlationId);
            }
            return $this->meta($conversation, $actorId, $owner, $grantId, $correlationId);
        });
    }

    public function openRelay(string $dealChainId, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($dealChainId, $actorId, $ownerId, $grantId, $correlationId): array {
            $owner = $ownerId ?? $actorId;
            $scope = $this->dealParticipants->currentRelayParticipants($dealChainId);
            if ($scope === null) {
                throw $this->error('DEAL_CHAIN_NOT_FOUND', 'The Deal Chain conversation is unavailable.', $correlationId, 404);
            }
            $this->assertRelayAccess($scope, $dealChainId, $actorId, $owner, $grantId, 'deal_chain.conversation.read', $correlationId);
            $conversation = $this->findOrCreateConversation('deal_chain_relay', $dealChainId, $actorId, $owner, $grantId, $correlationId);
            return $this->meta($conversation, $actorId, $owner, $grantId, $correlationId);
        });
    }

    public function openCase(string $caseId, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($caseId, $actorId, $ownerId, $grantId, $correlationId): array {
            [$case, $orderScope] = $this->lockCaseScope($caseId, $correlationId);
            $owner = $ownerId ?? $actorId;
            $this->assertCaseAccess($case, $actorId, $owner, $grantId, 'support_case.conversation.read', $correlationId, $orderScope);
            $conversation = $this->findOrCreateConversation('support_case', $caseId, $actorId, $owner, $grantId, $correlationId);
            return $this->meta($conversation, $actorId, $owner, $grantId, $correlationId);
        });
    }

    public function createCase(array $input, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        $owner = $ownerId ?? $actorId;
        $caseId = (string) Str::uuid7();
        $result = DB::transaction(function () use ($input, $actorId, $owner, $grantId, $correlationId, $caseId): array {
            $order = $this->orders->findForConversation((string) $input['order_id']);
            if ($order === null) {
                throw $this->error('ORDER_NOT_FOUND', 'The order is unavailable.', $correlationId, 404);
            }
            $this->assertOrderAccess($order, $actorId, $owner, $grantId, 'order.conversation.write', $correlationId);
            $now = now();
            DB::selectOne('SELECT pg_advisory_xact_lock(hashtext(?))', [$actorId.'|'.$owner.'|'.$input['idempotency_key']]);
            $existing = DB::table('support_cases')
                ->where('opened_by_user_id', $actorId)
                ->where('principal_user_id', $owner)
                ->where('idempotency_key', $input['idempotency_key'])
                ->first();
            if ($existing !== null) {
                if (! hash_equals((string) $existing->initial_payload_hash, hash('sha256', json_encode([$input['order_id'], $input['category'], $input['content']], JSON_THROW_ON_ERROR)))) {
                    throw $this->error('IDEMPOTENCY_CONFLICT', 'This case key was already used for different content.', $correlationId, 409);
                }
                $conversation = $this->findOrCreateConversation('support_case', (string) $existing->id, $actorId, $owner, $grantId, $correlationId);
                return ['case_id' => (string) $existing->id, 'public_reference' => (string) $existing->public_reference, 'conversation' => $conversation];
            }

            $publicReference = $this->references->allocate('support_cases');
            DB::table('support_cases')->insert([
                'id' => $caseId, 'reporter_user_id' => $owner, 'requester_user_id' => $owner,
                'category' => $input['category'], 'severity' => 'normal',
                'order_id' => $input['order_id'], 'work_instance_id' => null, 'payment_obligation_id' => null,
                'status' => 'open', 'owner_user_id' => null, 'principal_user_id' => $owner, 'resolution' => null,
                'opened_at' => $now, 'first_response_due_at' => $now->copy()->addHours(24),
                'resolution_due_at' => $now->copy()->addDays(7), 'resolved_at' => null,
                'correlation_id' => $correlationId, 'version' => 1, 'public_reference' => $publicReference,
                'opened_by_user_id' => $actorId, 'consent_grant_id' => $grantId,
                'idempotency_key' => $input['idempotency_key'],
                'initial_payload_hash' => hash('sha256', json_encode([$input['order_id'], $input['category'], $input['content']], JSON_THROW_ON_ERROR)),
                'created_at' => $now, 'updated_at' => $now,
            ]);
            $conversation = $this->findOrCreateConversation('support_case', $caseId, $actorId, $owner, $grantId, $correlationId);
            $this->insertMessage($conversation, $actorId, $owner, $grantId, $input['idempotency_key'], $input['content'], null, 'participants', $correlationId, true);
            $auditId = $this->audits->record('support_case.opened', 'support_case', $caseId, $correlationId, $this->actorContext($actorId, $owner, $grantId), next: ['category' => $input['category'], 'order_id' => $order['order_id']]);
            $this->outbox->enqueue('trust_support.case.opened', 'support_case', $caseId, ['support_case_id' => $caseId, 'conversation_id' => (string) $conversation->id], $correlationId, auditEventId: $auditId);
            return ['case_id' => $caseId, 'public_reference' => $publicReference, 'conversation' => $conversation];
        });

        return [
            'id' => $result['case_id'],
            'public_reference' => $result['public_reference'],
            'conversation_id' => (string) $result['conversation']->id,
        ];
    }

    public function show(string $conversationId, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($conversationId, $actorId, $ownerId, $grantId, $correlationId): array {
            $conversation = $this->conversation($conversationId, $correlationId);
            $owner = $ownerId ?? $actorId;
            $this->authorize($conversation, $actorId, $owner, $grantId, 'read', $correlationId);
            $this->archiveSettledOrder($conversation, $correlationId);
            return $this->meta($conversation, $actorId, $owner, $grantId, $correlationId);
        });
    }

    public function messages(string $conversationId, string $actorId, ?string $ownerId, ?string $grantId, ?int $before, ?int $after, string $correlationId): array
    {
        return DB::transaction(function () use ($conversationId, $actorId, $ownerId, $grantId, $before, $after, $correlationId): array {
            $conversation = $this->conversation($conversationId, $correlationId);
            $owner = $ownerId ?? $actorId;
            $this->authorize($conversation, $actorId, $owner, $grantId, 'read', $correlationId);
            $this->archiveSettledOrder($conversation, $correlationId);
            $query = DB::table('messages')->where('conversation_id', $conversationId);
            if (! $this->staffAccess->canAccessStaff($actorId)) {
                $query->where('audience', 'participants');
            }
            $descending = $before !== null || $after === null;
            if ($before !== null) {
                $query->where('sequence', '<', $before)->orderByDesc('sequence');
            } elseif ($after !== null) {
                $query->where('sequence', '>', $after)->orderBy('sequence');
            } else {
                $query->orderByDesc('sequence');
            }
            $rows = $query->limit(50)->get();
            if ($descending) {
                $rows = $rows->reverse()->values();
            }
            $messages = $rows->map(fn (object $row): array => $this->messageDto($row, $conversation))->all();
            $first = $rows->first();
            $last = $rows->last();
            $visible = DB::table('messages')->where('conversation_id', $conversationId)
                ->when(! $this->staffAccess->canAccessStaff($actorId), fn ($query) => $query->where('audience', 'participants'));
            $hasMoreBefore = $first !== null && (clone $visible)->where('sequence', '<', $first->sequence)->exists();
            $hasMoreAfter = $last !== null && (clone $visible)->where('sequence', '>', $last->sequence)->exists();
            return [
                'data' => $messages,
                'conversation' => $this->meta($conversation, $actorId, $owner, $grantId, $correlationId),
                'next_before_sequence' => $hasMoreBefore && $first !== null ? (int) $first->sequence : null,
                'next_after_sequence' => $last !== null ? (int) $last->sequence : ($after ?? 0),
                'has_more_before' => $hasMoreBefore,
                'has_more_after' => $hasMoreAfter,
            ];
        });
    }

    public function sendMessage(string $conversationId, string $actorId, array $input, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($conversationId, $actorId, $input, $ownerId, $grantId, $correlationId): array {
            $snapshot = $this->conversation($conversationId, $correlationId);
            $owner = $ownerId ?? $actorId;
            $this->authorize($snapshot, $actorId, $owner, $grantId, 'write', $correlationId);
            $sourceReadOnly = $this->isReadOnly($snapshot);
            $conversation = $this->lockAuthorizedConversation($snapshot, $correlationId);
            $audience = $input['audience'];
            if ($audience === 'staff_internal' && ($actorId !== $owner || ! $this->staffAccess->canAccessStaff($actorId))) {
                throw $this->error('AUTHORIZATION_DENIED', 'Only direct staff may write internal case notes.', $correlationId, 403);
            }
            $content = trim((string) ($input['content'] ?? ''));
            $attachment = $input['attachment_evidence_file_id'] ?? null;
            $hash = hash('sha256', json_encode([$content, $attachment, $audience], JSON_THROW_ON_ERROR));
            $existing = $this->findIdempotentMessage($conversation, $actorId, $owner, $input['idempotency_key'], $hash, $correlationId);
            if ($existing !== null) {
                if ($sourceReadOnly) {
                    $this->archiveSettledOrder($conversation, $correlationId);
                }
                return ['data' => $this->messageDto($existing, $conversation), 'conversation' => $this->meta($conversation, $actorId, $owner, $grantId, $correlationId)];
            }
            if ($conversation->status === 'archived' || $sourceReadOnly) {
                throw $this->error('CONVERSATION_ARCHIVED', 'This conversation is read-only.', $correlationId, 409);
            }
            $eligibleAttachment = $attachment === null ? null : $this->eligibleAttachment($conversation, (string) $attachment, $owner);
            if ($attachment !== null && $eligibleAttachment === null) {
                throw $this->error('ATTACHMENT_UNAVAILABLE', 'Choose a clean private attachment related to this conversation.', $correlationId, 422);
            }
            if ($content === '' && $eligibleAttachment === null) {
                throw $this->error('MESSAGE_CONTENT_REQUIRED', 'Add a message or a clean related attachment.', $correlationId, 422);
            }
            $message = $this->insertMessage($conversation, $actorId, $owner, $grantId, $input['idempotency_key'], $content, $attachment, $audience, $correlationId, true, $hash);
            return ['data' => $this->messageDto($message, $conversation), 'conversation' => $this->meta($conversation, $actorId, $owner, $grantId, $correlationId)];
        });
    }

    public function downloadAttachment(string $conversationId, string $evidenceId, string $actorId, ?string $ownerId, ?string $grantId, string $correlationId): array
    {
        return DB::transaction(function () use ($conversationId, $evidenceId, $actorId, $ownerId, $grantId, $correlationId): array {
            $conversation = $this->conversation($conversationId, $correlationId);
            $owner = $ownerId ?? $actorId;
            $this->authorize($conversation, $actorId, $owner, $grantId, 'read', $correlationId);
            $this->archiveSettledOrder($conversation, $correlationId);
            $messageQuery = DB::table('messages')
                ->where('conversation_id', $conversationId)
                ->where('attachment_evidence_file_id', $evidenceId);
            if (! $this->staffAccess->canAccessStaff($actorId)) {
                $messageQuery->where('audience', 'participants');
            }
            $message = $messageQuery->first();
            if ($message === null) {
                throw $this->error('ATTACHMENT_NOT_FOUND', 'The attachment is unavailable.', $correlationId, 404);
            }
            $file = $this->eligibleAttachment($conversation, $evidenceId, (string) $message->owner_user_id);
            if ($file === null || ! Storage::disk('private')->exists($file['storage_key'])) {
                throw $this->error('ATTACHMENT_NOT_FOUND', 'The attachment is unavailable.', $correlationId, 404);
            }
            return ['content' => Storage::disk('private')->get($file['storage_key']), 'mime_type' => $file['mime_type'], 'name' => $file['name']];
        });
    }

    private function findIdempotentMessage(object $conversation, string $actorId, string $ownerId, string $key, string $payloadHash, string $correlationId): ?object
    {
        DB::selectOne('SELECT pg_advisory_xact_lock(hashtext(?))', [$conversation->id.'|'.$actorId.'|'.$ownerId.'|'.$key]);
        $existing = DB::table('messages')
            ->where('conversation_id', $conversation->id)
            ->where('actor_user_id', $actorId)
            ->where('owner_user_id', $ownerId)
            ->where('idempotency_key', $key)
            ->first();
        if ($existing !== null && ! hash_equals((string) $existing->payload_hash, $payloadHash)) {
            throw $this->error('IDEMPOTENCY_CONFLICT', 'This message key was already used for different content.', $correlationId, 409);
        }
        return $existing;
    }

    private function insertMessage(object $conversation, string $actorId, string $ownerId, ?string $grantId, string $key, string $content, ?string $attachment, string $audience, string $correlationId, bool $notify, ?string $payloadHash = null): object
    {
        $hash = $payloadHash ?? hash('sha256', json_encode([$content, $attachment, $audience], JSON_THROW_ON_ERROR));
        $existing = $this->findIdempotentMessage($conversation, $actorId, $ownerId, $key, $hash, $correlationId);
        if ($existing !== null) {
            return $existing;
        }
        if ($attachment !== null && $this->eligibleAttachment($conversation, (string) $attachment, $ownerId) === null) {
            throw $this->error('ATTACHMENT_UNAVAILABLE', 'Choose a clean private attachment related to this conversation.', $correlationId, 422);
        }
        $actorName = $this->displayNames->displayNamesFor([$actorId])[$actorId] ?? null;
        $ownerName = $this->displayNames->displayNamesFor([$ownerId])[$ownerId] ?? null;
        if (! is_string($actorName) || ! is_string($ownerName)) {
            throw $this->error('PARTICIPANT_NAME_UNAVAILABLE', 'Participant attribution could not be verified.', $correlationId, 409);
        }
        $sequence = (int) $conversation->next_sequence;
        DB::table('conversations')->where('id', $conversation->id)->update(['next_sequence' => $sequence + 1, 'updated_at' => now()]);
        $id = (string) Str::uuid7();
        DB::table('messages')->insert([
            'id' => $id, 'conversation_id' => $conversation->id, 'actor_user_id' => $actorId,
            'owner_user_id' => $ownerId, 'consent_grant_id' => $grantId, 'sequence' => $sequence,
            'content' => $content, 'attachment_evidence_file_id' => $attachment,
            'delivery_state' => 'recorded', 'audit_metadata' => null, 'audit_metadata_payload_version' => null,
            'idempotency_key' => $key, 'payload_hash' => $hash, 'audience' => $audience,
            'actor_display_name' => $actorName, 'owner_display_name' => $ownerName,
            'correlation_id' => $correlationId, 'created_at' => now(),
        ]);
        $auditId = $this->audits->record('conversation.message.sent', 'conversation', (string) $conversation->id, $correlationId, $this->actorContext($actorId, $ownerId, $grantId), next: ['message_id' => $id, 'sequence' => $sequence, 'audience' => $audience]);
        $this->outbox->enqueue('trust_support.conversation.message_recorded', 'conversation', (string) $conversation->id, ['conversation_id' => (string) $conversation->id, 'message_id' => $id, 'sequence' => $sequence], $correlationId, auditEventId: $auditId, eventId: $id);
        if ($notify && $audience === 'participants') {
            foreach (array_diff($this->principalIds($conversation, $correlationId), [$ownerId]) as $recipientId) {
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $recipientId,
                    eventSourceType: 'conversation_message',
                    eventSourceId: $id,
                    eventType: 'conversation.message',
                    attention: NotificationAttention::Updates,
                    title: 'New conversation message',
                    body: 'A participant sent a message.',
                    actionUrl: route('conversations.show', ['conversation' => $conversation->id], false),
                    idempotencyKey: 'conversation-message-'.$id.'-'.$recipientId,
                    correlationId: $correlationId,
                ));
            }
        }
        return DB::table('messages')->where('id', $id)->first();
    }

    private function meta(object $conversation, string $actorId, string $ownerId, ?string $grantId, string $correlationId): array
    {
        $readOnly = $this->isReadOnly($conversation);
        $scope = $this->scopeTitle($conversation, $correlationId);
        return [
            'id' => (string) $conversation->id,
            'scope_type' => (string) $conversation->scope_type,
            'scope_id' => (string) $conversation->scope_id,
            'title' => $scope['title'],
            'status' => $readOnly ? 'archived' : (string) $conversation->status,
            'read_only' => $readOnly,
            'can_send' => ! $readOnly,
            'can_write_internal' => $this->staffAccess->canAccessStaff($actorId) && $actorId === $ownerId && $conversation->scope_type === 'support_case',
            'viewer' => [
                'actor_user_id' => $actorId,
                'owner_user_id' => $ownerId,
                'owner_display_name' => $this->displayNames->displayNamesFor([$ownerId])[$ownerId] ?? null,
                'consent_grant_id' => $grantId,
            ],
            'available_attachments' => $this->availableAttachments($conversation, $ownerId),
        ];
    }

    private function messageDto(object $row, object $conversation): array
    {
        $attachment = $row->attachment_evidence_file_id === null
            ? null
            : $this->attachmentDto($row, $conversation);
        return [
            'id' => (string) $row->id, 'sequence' => (int) $row->sequence, 'content' => (string) $row->content,
            'actor_user_id' => (string) $row->actor_user_id, 'owner_user_id' => (string) $row->owner_user_id,
            'consent_grant_id' => $row->consent_grant_id === null ? null : (string) $row->consent_grant_id,
            'actor_display_name' => (string) $row->actor_display_name, 'owner_display_name' => (string) $row->owner_display_name,
            'audience' => (string) $row->audience, 'created_at' => \Illuminate\Support\Carbon::parse($row->created_at)->toIso8601String(),
            'attachment' => $attachment,
        ];
    }

    private function attachmentDto(object $row, object $conversation): ?array
    {
        $file = $this->eligibleAttachment($conversation, (string) $row->attachment_evidence_file_id, (string) $row->owner_user_id);
        if ($file === null) {
            return null;
        }
        return [
            'id' => $file['id'],
            'name' => $file['name'],
            'mime_type' => $file['mime_type'],
            'download_url' => route('conversations.attachments.download', ['conversation' => $row->conversation_id, 'evidence' => $row->attachment_evidence_file_id], false),
        ];
    }

    private function eligibleAttachment(object $conversation, string $evidenceId, string $ownerId): ?array
    {
        $orderIds = $this->evidenceOrderIds($conversation);
        if ($orderIds === []) {
            return null;
        }
        $related = [
            ...$this->workEvidence->relatedEvidenceIds($orderIds, $ownerId),
            ...$this->paymentEvidence->relatedEvidenceIds($orderIds, $ownerId),
        ];
        if (! in_array($evidenceId, $related, true)) {
            return null;
        }
        return $this->privateEvidence->cleanPrivateFileForOwner($evidenceId, $ownerId);
    }

    private function availableAttachments(object $conversation, string $ownerId): array
    {
        $orderIds = $this->evidenceOrderIds($conversation);
        if ($orderIds === []) {
            return [];
        }
        $ids = array_values(array_unique([
            ...$this->workEvidence->relatedEvidenceIds($orderIds, $ownerId),
            ...$this->paymentEvidence->relatedEvidenceIds($orderIds, $ownerId),
        ]));
        $available = [];
        foreach ($ids as $id) {
            $file = $this->privateEvidence->cleanPrivateFileForOwner($id, $ownerId);
            if ($file !== null) {
                $available[] = ['id' => $file['id'], 'name' => $file['name'], 'mime_type' => $file['mime_type']];
            }
        }
        return $available;
    }

    private function findOrCreateConversation(string $scopeType, string $scopeId, string $creatorId, string $ownerId, ?string $grantId, string $correlationId): object
    {
        $id = (string) Str::uuid7();
        $now = now();
        $inserted = DB::table('conversations')->insertOrIgnore([
            'id' => $id, 'participants' => json_encode([], JSON_THROW_ON_ERROR), 'participants_payload_version' => 1,
            'access_policy' => json_encode(['authorization' => 'live_scope_membership'], JSON_THROW_ON_ERROR), 'access_policy_payload_version' => 1,
            'order_id' => $scopeType === 'order' ? $scopeId : null, 'work_instance_id' => null,
            'created_by_user_id' => $creatorId, 'status' => 'open', 'correlation_id' => $correlationId,
            'version' => 1, 'scope_type' => $scopeType, 'scope_id' => $scopeId, 'next_sequence' => 1,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $conversation = DB::table('conversations')->where('scope_type', $scopeType)->where('scope_id', $scopeId)->lockForUpdate()->first();
        if ($conversation === null) {
            throw $this->error('CONVERSATION_WRITE_FAILED', 'The conversation could not be opened.', $correlationId, 409);
        }
        if ($inserted === 1) {
            $auditId = $this->audits->record(
                'conversation.opened', 'conversation', (string) $conversation->id, $correlationId,
                $this->actorContext($creatorId, $ownerId, $grantId), next: ['scope_type' => $scopeType, 'scope_id' => $scopeId],
            );
            $this->outbox->enqueue(
                'trust_support.conversation.opened', 'conversation', (string) $conversation->id,
                ['conversation_id' => (string) $conversation->id, 'scope_type' => $scopeType, 'scope_id' => $scopeId],
                $correlationId, auditEventId: $auditId,
            );
        }
        return $conversation;
    }

    private function conversation(string $id, string $correlationId): object
    {
        return DB::table('conversations')->where('id', $id)->first()
            ?? throw $this->error('CONVERSATION_NOT_FOUND', 'The conversation is unavailable.', $correlationId, 404);
    }

    private function lockAuthorizedConversation(object $snapshot, string $correlationId): object
    {
        $conversation = DB::table('conversations')
            ->where('id', $snapshot->id)
            ->lockForUpdate()
            ->first();
        if ($conversation === null) {
            throw $this->error('CONVERSATION_NOT_FOUND', 'The conversation is unavailable.', $correlationId, 404);
        }
        if ((string) $conversation->scope_type !== (string) $snapshot->scope_type
            || (string) $conversation->scope_id !== (string) $snapshot->scope_id) {
            throw $this->error('CONVERSATION_SCOPE_CHANGED', 'The conversation scope changed. Refresh and try again.', $correlationId, 409);
        }

        return $conversation;
    }

    /** @return array{0:object,1:array<string,mixed>|null} */
    private function lockCaseScope(string $caseId, string $correlationId): array
    {
        $snapshot = DB::table('support_cases')->where('id', $caseId)->first();
        if ($snapshot === null) {
            throw $this->error('SUPPORT_CASE_NOT_FOUND', 'The support case is unavailable.', $correlationId, 404);
        }
        $snapshotOrderId = $snapshot->order_id === null ? null : (string) $snapshot->order_id;
        $orderScope = $snapshotOrderId === null ? null : $this->orders->findForConversation($snapshotOrderId);
        if ($snapshotOrderId !== null && $orderScope === null) {
            throw $this->error('SUPPORT_CASE_NOT_FOUND', 'The support case is unavailable.', $correlationId, 404);
        }
        $case = DB::table('support_cases')->where('id', $caseId)->lockForUpdate()->first();
        if ($case === null) {
            throw $this->error('SUPPORT_CASE_NOT_FOUND', 'The support case is unavailable.', $correlationId, 404);
        }
        $currentOrderId = $case->order_id === null ? null : (string) $case->order_id;
        if ($currentOrderId !== $snapshotOrderId) {
            throw $this->error('SUPPORT_CASE_SCOPE_CHANGED', 'The support case changed. Refresh and try again.', $correlationId, 409);
        }
        return [$case, $orderScope];
    }

    private function authorize(object $conversation, string $actorId, string $ownerId, ?string $grantId, string $verb, string $correlationId): void
    {
        $resourceId = (string) $conversation->scope_id;
        $resourceType = match ((string) $conversation->scope_type) {
            'order' => 'order',
            'deal_chain_relay' => 'deal_chain',
            'support_case' => 'support_case',
            default => throw $this->error('CONVERSATION_NOT_FOUND', 'The conversation is unavailable.', $correlationId, 404),
        };
        $action = match ([$resourceType, $verb]) {
            ['order', 'read'] => 'order.conversation.read',
            ['order', 'write'] => 'order.conversation.write',
            ['deal_chain', 'read'] => 'deal_chain.conversation.read',
            ['deal_chain', 'write'] => 'deal_chain.conversation.write',
            ['support_case', 'read'] => 'support_case.conversation.read',
            ['support_case', 'write'] => 'support_case.conversation.write',
        };
        if ($resourceType === 'order') {
            $scope = $this->orders->findForConversation($resourceId);
            if ($scope === null) {
                throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
            }
            $this->assertOrderAccess($scope, $actorId, $ownerId, $grantId, $action, $correlationId);
            return;
        }
        if ($resourceType === 'deal_chain') {
            $scope = $this->dealParticipants->currentRelayParticipants($resourceId);
            if ($scope === null) {
                throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
            }
            $this->assertRelayAccess($scope, $resourceId, $actorId, $ownerId, $grantId, $action, $correlationId);
            return;
        }
        [$case, $orderScope] = $this->lockCaseScope($resourceId, $correlationId);
        $this->assertCaseAccess($case, $actorId, $ownerId, $grantId, $action, $correlationId, $orderScope);
    }

    private function assertOrderAccess(array $scope, string $actorId, string $ownerId, ?string $grantId, string $action, string $correlationId): void
    {
        $principals = [$scope['buyer_user_id'], $scope['provider_user_id']];
        if ($actorId === $ownerId && in_array($ownerId, $principals, true) && $grantId === null) {
            return;
        }
        if (in_array($ownerId, $principals, true) && $grantId !== null) {
            $this->assertGrant($grantId, $actorId, $ownerId, 'order', $scope['order_id'], $action, $correlationId);
            return;
        }
        throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
    }

    private function assertRelayAccess(array $scope, string $chainId, string $actorId, string $ownerId, ?string $grantId, string $action, string $correlationId): void
    {
        $principals = array_values(array_unique([$scope['coordinator_user_id'], ...$scope['provider_user_ids']]));
        if ($actorId === $ownerId && in_array($ownerId, $principals, true) && $grantId === null) {
            return;
        }
        if (in_array($ownerId, $principals, true) && $grantId !== null) {
            $this->assertGrant($grantId, $actorId, $ownerId, 'deal_chain', $chainId, $action, $correlationId);
            return;
        }
        throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
    }

    private function assertCaseAccess(
        object $case,
        string $actorId,
        string $ownerId,
        ?string $grantId,
        string $action,
        string $correlationId,
        ?array $order = null,
    ): void
    {
        $principals = array_filter([(string) $case->principal_user_id, (string) $case->reporter_user_id, (string) $case->requester_user_id]);
        $order ??= $case->order_id === null ? null : $this->orders->findForConversation((string) $case->order_id);
        $orderPrincipals = $order === null ? [] : [$order['buyer_user_id'], $order['provider_user_id']];
        if ($order !== null) {
            $principals = [...$principals, ...$orderPrincipals];
        }
        $staff = $this->staffAccess->canAccessStaff($actorId);
        if ($staff && $actorId === $ownerId && $grantId === null) {
            return;
        }
        if ($actorId === $ownerId && in_array($ownerId, $principals, true) && $grantId === null) {
            return;
        }
        if ($grantId !== null && in_array($ownerId, $principals, true)) {
            if ($order !== null) {
                if (! in_array($ownerId, $orderPrincipals, true)) {
                    throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
                }
                $orderAction = match ($action) {
                    'support_case.conversation.read' => 'order.conversation.read',
                    'support_case.conversation.write' => 'order.conversation.write',
                    default => throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403),
                };
                $this->assertGrant($grantId, $actorId, $ownerId, 'order', (string) $case->order_id, $orderAction, $correlationId);
                return;
            }
            $this->assertGrant($grantId, $actorId, $ownerId, 'support_case', (string) $case->id, $action, $correlationId);
            return;
        }
        throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
    }

    private function assertGrant(?string $grantId, string $actorId, string $ownerId, string $type, string $id, string $action, string $correlationId): void
    {
        if ($grantId === null) {
            throw $this->error('AUTHORIZATION_DENIED', 'You are not authorized to view this conversation.', $correlationId, 403);
        }
        try {
            DB::transaction(fn () => $this->actingFor->assertActive($grantId, $actorId, $ownerId, $correlationId, $type, $id, $action));
        } catch (KernelException $error) {
            throw $this->error($error->envelope->code, $error->getMessage(), $correlationId, $error->status);
        }
    }

    private function isReadOnly(object $conversation): bool
    {
        if ($conversation->status === 'archived') {
            return true;
        }
        if ($conversation->scope_type === 'order') {
            $order = $this->orders->findForConversation((string) $conversation->scope_id);
            return $order !== null && $this->isCompletedAndSettled($order);
        }
        if ($conversation->scope_type === 'support_case') {
            return DB::table('support_cases')->where('id', $conversation->scope_id)->where('status', 'resolved')->exists();
        }
        return false;
    }

    /** @param array{order_id:string,buyer_user_id:string,provider_user_id:string,status:string,public_reference:string} $order */
    private function isCompletedAndSettled(array $order): bool
    {
        if ($order['status'] !== 'completed') {
            return false;
        }
        $financial = $this->financialStates->forDealChild($order['order_id']);
        return $financial !== null && $financial['settled'] && $financial['settled_at'] !== null;
    }

    private function archiveSettledOrder(object $conversation, string $correlationId): void
    {
        if ($conversation->scope_type !== 'order' || $conversation->status === 'archived') {
            return;
        }
        $archived = DB::transaction(function () use ($conversation, $correlationId): bool {
            $order = $this->orders->findForConversation((string) $conversation->scope_id);
            if ($order === null || ! $this->isCompletedAndSettled($order)) {
                return false;
            }
            $locked = DB::table('conversations')->where('id', $conversation->id)->lockForUpdate()->first();
            if ($locked === null
                || (string) $locked->scope_type !== 'order'
                || (string) $locked->scope_id !== (string) $conversation->scope_id
                || $locked->status !== 'open') {
                return false;
            }
            DB::table('conversations')->where('id', $locked->id)->update([
                'status' => 'archived', 'version' => DB::raw('version + 1'), 'updated_at' => now(),
            ]);
            $auditId = $this->audits->record(
                'conversation.archived', 'conversation', (string) $locked->id, $correlationId,
                ActorContext::system('settled_order_archive'), previous: ['status' => 'open'], next: ['status' => 'archived'],
                reason: 'The Order is completed and its current primary payment obligation is settled.',
                orderId: (string) $locked->scope_id,
            );
            $this->outbox->enqueue(
                'trust_support.conversation.archived', 'conversation', (string) $locked->id,
                ['conversation_id' => (string) $locked->id, 'order_id' => (string) $locked->scope_id],
                $correlationId, auditEventId: $auditId,
            );
            return true;
        });
        if ($archived) {
            $conversation->status = 'archived';
        }
    }

    private function principalIds(object $conversation, string $correlationId): array
    {
        if ($conversation->scope_type === 'order') {
            $order = $this->orders->findForConversation((string) $conversation->scope_id);
            return $order === null ? [] : array_values(array_unique([$order['buyer_user_id'], $order['provider_user_id']]));
        }
        if ($conversation->scope_type === 'deal_chain_relay') {
            $scope = $this->dealParticipants->currentRelayParticipants((string) $conversation->scope_id);
            return $scope === null ? [] : array_values(array_unique([$scope['coordinator_user_id'], ...$scope['provider_user_ids']]));
        }
        return $this->casePrincipalIds((string) $conversation->scope_id);
    }

    private function casePrincipalIds(string $caseId): array
    {
        $case = DB::table('support_cases')->where('id', $caseId)->first();
        if ($case === null) {
            return [];
        }
        $ids = array_filter([(string) $case->principal_user_id, (string) $case->reporter_user_id, (string) $case->requester_user_id]);
        if ($case->order_id !== null) {
            $order = $this->orders->findForConversation((string) $case->order_id);
            if ($order !== null) {
                $ids = [...$ids, $order['buyer_user_id'], $order['provider_user_id']];
            }
        }
        return array_values(array_unique($ids));
    }

    /** @return list<string> */
    private function evidenceOrderIds(object $conversation): array
    {
        if ($conversation->scope_type === 'order') {
            return [(string) $conversation->scope_id];
        }
        if ($conversation->scope_type === 'support_case') {
            $orderId = DB::table('support_cases')->where('id', $conversation->scope_id)->value('order_id');
            return is_string($orderId) ? [$orderId] : [];
        }
        $scope = $this->dealParticipants->currentRelayParticipants((string) $conversation->scope_id);
        return $scope['current_order_ids'] ?? [];
    }

    private function scopeTitle(object $conversation, string $correlationId): array
    {
        if ($conversation->scope_type === 'order') {
            $order = $this->orders->findForConversation((string) $conversation->scope_id);
            return ['title' => 'Order '.($order['public_reference'] ?? '')];
        }
        if ($conversation->scope_type === 'deal_chain_relay') {
            return ['title' => 'Deal Chain relay'];
        }
        $case = DB::table('support_cases')->where('id', $conversation->scope_id)->first();
        return ['title' => 'Support case '.($case->public_reference ?? '')];
    }

    private function actorContext(string $actorId, string $ownerId, ?string $grantId): ActorContext
    {
        return $actorId === $ownerId ? ActorContext::human($actorId) : ActorContext::actingFor($actorId, $ownerId, (string) $grantId);
    }

    private function error(string $code, string $message, string $correlationId, int $status): TrustSupportError
    {
        return new TrustSupportError($code, $message, $correlationId, $status);
    }
}
