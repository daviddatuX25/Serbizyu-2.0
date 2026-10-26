<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Application;

use App\Shared\Application\OutboxConsumerHandler;
use App\Shared\Contracts\EvidenceScanPort;
use App\Shared\Contracts\EvidenceScanStatus;
use Illuminate\Support\Facades\DB;
use Throwable;

final class ScanWorkEvidenceHandler implements OutboxConsumerHandler
{
    public function __construct(private readonly EvidenceScanPort $scanner) {}

    public function consumerName(): string
    {
        return 'orders_work.evidence_scanner';
    }

    public function eventType(): string
    {
        return 'work.evidence.scan_requested';
    }

    public function supportedContractVersion(): int
    {
        return 1;
    }

    /** @param array<string, mixed> $envelope */
    public function handle(array $envelope): void
    {
        $payload = $envelope['payload'] ?? null;
        $evidenceId = is_array($payload) && is_string($payload['evidence_file_id'] ?? null)
            ? $payload['evidence_file_id']
            : '';
        if ($evidenceId === '') {
            return;
        }

        $evidence = DB::table('evidence_files')
            ->where('id', $evidenceId)
            ->where('scan_status', 'quarantined')
            ->whereNull('deleted_at')
            ->first();
        if ($evidence === null) {
            return;
        }

        try {
            $status = $this->scanner->scan(
                (string) $evidence->storage_key,
                (string) $evidence->media_type,
                (int) $evidence->size_bytes,
                (string) $evidence->content_hash,
                (string) $evidence->evidence_type,
            );
        } catch (Throwable) {
            $status = EvidenceScanStatus::Failed;
        }

        DB::table('evidence_files')
            ->where('id', $evidenceId)
            ->where('scan_status', 'quarantined')
            ->whereNull('deleted_at')
            ->update([
                'scan_status' => $status->value,
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);
    }
}
