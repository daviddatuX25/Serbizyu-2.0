<?php

declare(strict_types=1);

namespace App\Modules\OrdersWork\Infrastructure;

use App\Shared\Contracts\EvidenceScanPort;
use App\Shared\Contracts\EvidenceScanStatus;
use Illuminate\Support\Facades\Storage;

final class LocalEvidenceScanner implements EvidenceScanPort
{
    private const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

    private const MAX_DELIVERY_SIZE_BYTES = 25 * 1024 * 1024;

    private const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    private const ALLOWED_DELIVERY_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

    private const ALLOWED_PAYMENT_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function scan(
        string $storageKey,
        string $expectedMediaType,
        int $expectedSizeBytes,
        string $expectedContentHash,
        string $purpose = 'work_node_photo_proof',
    ): EvidenceScanStatus {
        try {
            $stream = Storage::disk('private')->readStream($storageKey);
            if (! is_resource($stream)) {
                return EvidenceScanStatus::Failed;
            }

            try {
                $contents = stream_get_contents($stream);
            } finally {
                fclose($stream);
            }
        } catch (\Throwable) {
            return EvidenceScanStatus::Failed;
        }

        $delivery = $purpose === 'work_delivery_artifact';
        $paymentProof = $purpose === 'payment_p2p_proof';
        $maxSize = $delivery ? self::MAX_DELIVERY_SIZE_BYTES : self::MAX_PHOTO_SIZE_BYTES;
        if (
            ! is_string($contents)
            || $contents === ''
            || $expectedSizeBytes < 1
            || $expectedSizeBytes > $maxSize
        ) {
            return EvidenceScanStatus::Infected;
        }
        if (
            strlen($contents) !== $expectedSizeBytes
            || ! hash_equals($expectedContentHash, hash('sha256', $contents))
        ) {
            return EvidenceScanStatus::Infected;
        }

        if (str_contains($contents, 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
            return EvidenceScanStatus::Infected;
        }

        $detectedMediaType = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
        $allowedTypes = $delivery
            ? self::ALLOWED_DELIVERY_TYPES
            : ($paymentProof ? self::ALLOWED_PAYMENT_PROOF_TYPES : self::ALLOWED_IMAGE_TYPES);
        if (! is_string($detectedMediaType) || ! in_array($expectedMediaType, $allowedTypes, true) || $detectedMediaType !== $expectedMediaType) {
            return EvidenceScanStatus::Infected;
        }

        if (in_array($expectedMediaType, self::ALLOWED_IMAGE_TYPES, true)) {
            $image = @getimagesizefromstring($contents);
            $expectedImageType = match ($expectedMediaType) {
                'image/jpeg' => IMAGETYPE_JPEG,
                'image/png' => IMAGETYPE_PNG,
                'image/webp' => defined('IMAGETYPE_WEBP') ? IMAGETYPE_WEBP : -1,
                default => -1,
            };

            if (! is_array($image) || ($image[2] ?? null) !== $expectedImageType) {
                return EvidenceScanStatus::Infected;
            }

            return EvidenceScanStatus::Clean;
        }

        if (
            $expectedMediaType === 'application/pdf'
            && str_starts_with($contents, '%PDF-')
            && str_contains($contents, '%%EOF')
            && preg_match('/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia)\b/i', $contents) !== 1
        ) {
            return EvidenceScanStatus::Clean;
        }
        if ($expectedMediaType === 'text/plain' && ! str_contains($contents, "\0") && mb_check_encoding($contents, 'UTF-8')) {
            return EvidenceScanStatus::Clean;
        }

        return EvidenceScanStatus::Infected;
    }
}
