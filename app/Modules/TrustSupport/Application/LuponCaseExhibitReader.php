<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

use App\Shared\Contracts\LuponEvidenceReaderPort;
use App\Shared\Contracts\StaffOrdersReaderPort;
use App\Shared\Contracts\StaffPaymentsReaderPort;
use Illuminate\Support\Facades\DB;

final class LuponCaseExhibitReader
{
    public function __construct(
        private readonly StaffOrdersReaderPort $orders,
        private readonly StaffPaymentsReaderPort $payments,
        private readonly LuponEvidenceReaderPort $evidence,
    ) {}

    /** @return array{available:list<array{id:string,owner_user_id:string,name:string,mime_type:string,storage_key:string,size_bytes:int,sha256:string,evidence_type:string,created_at:string}>,excluded:list<array{id:string,reason:string}>} */
    public function forCase(string $caseId): array
    {
        $case = DB::table('support_cases')->where('id', $caseId)
            ->first(['order_id', 'reporter_user_id', 'requester_user_id', 'principal_user_id']);
        if ($case === null) {
            return ['available' => [], 'excluded' => []];
        }

        $sourceIds = [];
        if ($case->order_id !== null) {
            foreach ([$this->orders->evidenceForOrder((string) $case->order_id), $this->payments->evidenceForOrder((string) $case->order_id)] as $sourceFiles) {
                foreach ($sourceFiles as $sourceFile) {
                    if (is_string($sourceFile['id'] ?? null) && $sourceFile['id'] !== '') {
                        $sourceIds[] = $sourceFile['id'];
                    }
                }
            }
        }

        $participantIds = array_values(array_unique(array_filter([
            $case->reporter_user_id === null ? null : (string) $case->reporter_user_id,
            $case->requester_user_id === null ? null : (string) $case->requester_user_id,
            $case->principal_user_id === null ? null : (string) $case->principal_user_id,
        ])));
        if ($participantIds !== []) {
            $conversationId = DB::table('conversations')->where('scope_type', 'support_case')->where('scope_id', $caseId)->value('id');
            if (is_string($conversationId)) {
                $sourceIds = array_merge($sourceIds, DB::table('messages')
                    ->where('conversation_id', $conversationId)
                    ->where('audience', 'participants')
                    ->whereIn('actor_user_id', $participantIds)
                    ->whereNotNull('attachment_evidence_file_id')
                    ->orderBy('sequence')->orderBy('id')
                    ->pluck('attachment_evidence_file_id')->map(static fn ($id): string => (string) $id)->all());
            }
        }
        $sourceIds = array_values(array_unique($sourceIds));
        if ($sourceIds === []) {
            return ['available' => [], 'excluded' => []];
        }

        $availability = $this->evidence->availabilityFor($sourceIds);
        $reasonById = [];
        $eligibleIds = [];
        foreach ($availability as $item) {
            if ($item['reason'] === null) {
                $eligibleIds[] = $item['id'];
            } else {
                $reasonById[$item['id']] = $item['reason'];
            }
        }
        $files = $this->evidence->cleanPrivateFiles($eligibleIds);
        $filesById = [];
        foreach ($files as $file) {
            $filesById[$file['id']] = $file;
        }
        foreach ($eligibleIds as $id) {
            if (! isset($filesById[$id])) {
                $reasonById[$id] = 'unavailable_during_read';
            }
        }

        return [
            'available' => array_values($filesById),
            'excluded' => array_map(static fn (string $id, string $reason): array => ['id' => $id, 'reason' => $reason], array_keys($reasonById), array_values($reasonById)),
        ];
    }
}
