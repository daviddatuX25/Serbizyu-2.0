<?php

declare(strict_types=1);

namespace App\Modules\TrustSupport\Application;

final class BoundedImageMetadataParser
{
    private const MAX_BYTES = 10 * 1024 * 1024;

    /** @return array{status:string,timestamps:list<string>,reason:?string} */
    public function inspect(string $path, string $mimeType): array
    {
        if (! in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return ['status' => 'not_applicable', 'timestamps' => [], 'reason' => null];
        }
        $size = filesize($path);
        if (! is_int($size) || $size < 1 || $size > self::MAX_BYTES) {
            return ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'unsupported_size'];
        }
        $bytes = file_get_contents($path);
        if (! is_string($bytes) || strlen($bytes) !== $size) {
            return ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'read_failed'];
        }

        $container = match ($mimeType) {
            'image/jpeg' => $this->jpegExif($bytes),
            'image/png' => $this->pngExif($bytes),
            'image/webp' => $this->webpExif($bytes),
        };
        if ($container === null) {
            return ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'malformed_container'];
        }
        if ($container === false) {
            return ['status' => 'absent', 'timestamps' => [], 'reason' => null];
        }

        $timestamps = $this->parseTiffTimestamps($container);
        if ($timestamps === null) {
            return ['status' => 'unreadable', 'timestamps' => [], 'reason' => 'malformed_exif'];
        }

        return ['status' => 'present', 'timestamps' => $timestamps, 'reason' => null];
    }

    private function jpegExif(string $bytes): string|false|null
    {
        if (! str_starts_with($bytes, "\xFF\xD8") || strrpos($bytes, "\xFF\xD9") === false) {
            return null;
        }
        $offset = 2;
        $length = strlen($bytes);
        $found = null;
        while ($offset < $length) {
            if (ord($bytes[$offset]) !== 0xff) {
                return null;
            }
            while ($offset < $length && ord($bytes[$offset]) === 0xff) {
                $offset++;
            }
            if ($offset >= $length) {
                return null;
            }
            $marker = ord($bytes[$offset++]);
            if ($marker === 0xd9) {
                return $found ?? false;
            }
            if ($marker === 0xda) {
                return $found ?? false;
            }
            if (in_array($marker, [0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7], true)) {
                continue;
            }
            if ($offset + 2 > $length) {
                return null;
            }
            $segmentLength = unpack('nlength', substr($bytes, $offset, 2))['length'];
            if ($segmentLength < 2 || $offset + $segmentLength > $length) {
                return null;
            }
            $payload = substr($bytes, $offset + 2, $segmentLength - 2);
            if ($marker === 0xe1 && str_starts_with($payload, "Exif\0\0")) {
                if ($found !== null) {
                    return null;
                }
                $found = substr($payload, 6);
            }
            $offset += $segmentLength;
        }

        return null;
    }

    private function pngExif(string $bytes): string|false|null
    {
        if (! str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) {
            return null;
        }
        $offset = 8;
        $length = strlen($bytes);
        $found = null;
        while ($offset + 12 <= $length) {
            $chunkLength = unpack('Nlength', substr($bytes, $offset, 4))['length'];
            $type = substr($bytes, $offset + 4, 4);
            if ($chunkLength > self::MAX_BYTES || $offset + 12 + $chunkLength > $length) {
                return null;
            }
            $data = substr($bytes, $offset + 8, $chunkLength);
            $crc = substr($bytes, $offset + 8 + $chunkLength, 4);
            if (! hash_equals(hash('crc32b', $type.$data, true), $crc)) {
                return null;
            }
            if ($type === 'eXIf') {
                if ($found !== null) {
                    return null;
                }
                $found = $data;
            }
            $offset += 12 + $chunkLength;
            if ($type === 'IEND') {
                return $chunkLength === 0 ? ($found ?? false) : null;
            }
        }

        return null;
    }

    private function webpExif(string $bytes): string|false|null
    {
        if (strlen($bytes) < 12 || substr($bytes, 0, 4) !== 'RIFF' || substr($bytes, 8, 4) !== 'WEBP') {
            return null;
        }
        $riffLength = unpack('Vlength', substr($bytes, 4, 4))['length'];
        if ($riffLength + 8 !== strlen($bytes) || $riffLength < 4) {
            return null;
        }

        $end = $riffLength + 8;
        $offset = 12;
        $exif = false;
        while ($offset < $end) {
            if ($offset + 8 > $end) {
                return null;
            }
            $type = substr($bytes, $offset, 4);
            $chunkLength = unpack('Vlength', substr($bytes, $offset + 4, 4))['length'];
            $dataStart = $offset + 8;
            $dataEnd = $dataStart + $chunkLength;
            $chunkEnd = $dataEnd + ($chunkLength % 2);
            if ($chunkLength > self::MAX_BYTES || $dataEnd > $end || $chunkEnd > $end) {
                return null;
            }
            if ($chunkLength % 2 === 1 && $bytes[$dataEnd] !== "\0") {
                return null;
            }
            if ($type === 'EXIF') {
                if ($exif !== false) {
                    return null;
                }
                $payload = substr($bytes, $dataStart, $chunkLength);
                $exif = str_starts_with($payload, "Exif\0\0") ? substr($payload, 6) : $payload;
            }
            $offset = $chunkEnd;
        }
        if ($offset !== $end) {
            return null;
        }

        return $exif;
    }

    /** @return list<string>|null */
    private function parseTiffTimestamps(string $tiff): ?array
    {
        if (strlen($tiff) < 8) {
            return null;
        }
        $byteOrder = substr($tiff, 0, 2);
        if (! in_array($byteOrder, ['II', 'MM'], true)) {
            return null;
        }
        $little = $byteOrder === 'II';
        if ($this->u16($tiff, 2, $little) !== 42) {
            return null;
        }
        $ifd0 = $this->u32($tiff, 4, $little);
        if ($ifd0 === null) {
            return null;
        }
        $entries = $this->ifd($tiff, $ifd0, $little);
        if ($entries === null) {
            return null;
        }
        $dates = [];
        foreach ([0x0132, 0x9003, 0x9004] as $tag) {
            if (isset($entries[$tag])) {
                $value = $this->asciiValue($tiff, $entries[$tag], $little);
                if ($value === null) {
                    return null;
                }
                if (! $this->validExifDate($value)) {
                    return null;
                }
                $dates[] = $value;
            }
        }
        if (isset($entries[0x8769])) {
            $offset = $this->unsignedEntryValue($tiff, $entries[0x8769], $little);
            if ($offset === null) {
                return null;
            }
            $exifEntries = $this->ifd($tiff, $offset, $little);
            if ($exifEntries === null) {
                return null;
            }
            foreach ([0x9003, 0x9004] as $tag) {
                if (isset($exifEntries[$tag])) {
                    $value = $this->asciiValue($tiff, $exifEntries[$tag], $little);
                    if ($value === null) {
                        return null;
                    }
                    if (! $this->validExifDate($value)) {
                        return null;
                    }
                    $dates[] = $value;
                }
            }
        }

        return array_values(array_unique($dates));
    }

    /** @return array<int, array{type:int,count:int,value:int,inline:string}|null>|null */
    private function ifd(string $tiff, int $offset, bool $little): ?array
    {
        $count = $this->u16($tiff, $offset, $little);
        if ($count === null || $count > 256 || $offset + 2 + ($count * 12) + 4 > strlen($tiff)) {
            return null;
        }
        $entries = [];
        for ($index = 0; $index < $count; $index++) {
            $entryOffset = $offset + 2 + ($index * 12);
            $tag = $this->u16($tiff, $entryOffset, $little);
            $type = $this->u16($tiff, $entryOffset + 2, $little);
            $itemCount = $this->u32($tiff, $entryOffset + 4, $little);
            $value = $this->u32($tiff, $entryOffset + 8, $little);
            if ($tag === null || $type === null || $itemCount === null || $value === null) {
                return null;
            }
            $entries[$tag] = ['type' => $type, 'count' => $itemCount, 'value' => $value, 'inline' => substr($tiff, $entryOffset + 8, 4)];
        }

        return $entries;
    }

    /** @param array{type:int,count:int,value:int,inline:string} $entry */
    private function asciiValue(string $tiff, array $entry, bool $little): ?string
    {
        if ($entry['type'] !== 2 || $entry['count'] < 1 || $entry['count'] > 64) {
            return null;
        }
        $value = $entry['count'] <= 4
            ? substr($entry['inline'], 0, $entry['count'])
            : substr($tiff, $entry['value'], $entry['count']);
        if (strlen($value) !== $entry['count']) {
            return null;
        }

        return rtrim($value, "\0");
    }

    /** @param array{type:int,count:int,value:int,inline:string} $entry */
    private function unsignedEntryValue(string $tiff, array $entry, bool $little): ?int
    {
        if ($entry['type'] !== 4 || $entry['count'] !== 1) {
            return null;
        }

        return $entry['value'];
    }

    private function u16(string $bytes, int $offset, bool $little): ?int
    {
        if ($offset < 0 || $offset + 2 > strlen($bytes)) {
            return null;
        }

        return unpack($little ? 'vvalue' : 'nvalue', substr($bytes, $offset, 2))['value'];
    }

    private function u32(string $bytes, int $offset, bool $little): ?int
    {
        if ($offset < 0 || $offset + 4 > strlen($bytes)) {
            return null;
        }

        return unpack($little ? 'Vvalue' : 'Nvalue', substr($bytes, $offset, 4))['value'];
    }

    private function validExifDate(string $value): bool
    {
        if (preg_match('/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/D', $value) !== 1) {
            return false;
        }
        $date = \DateTimeImmutable::createFromFormat('!Y:m:d H:i:s', $value);
        $errors = \DateTimeImmutable::getLastErrors();

        return $date !== false && ($errors === false || ($errors['warning_count'] === 0 && $errors['error_count'] === 0));
    }
}
