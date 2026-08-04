<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use Illuminate\Console\Command;

final class PeekFakeOtpCommand extends Command
{
    protected $signature = 'serbizyu:otp:peek
                            {phone : Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)}
                            {--purpose=login : OTP purpose}';

    protected $description = 'Inspect the latest fake OTP delivery for local/test UAT (never a product UI bypass)';

    public function handle(FakeOtpDelivery $delivery): int
    {
        $environment = (string) config('serbizyu.environment', config('app.env', 'production'));
        if (! in_array($environment, ['local', 'testing', 'test', 'capstone'], true)) {
            $this->error('OTP peek is forbidden outside disposable environments.');

            return self::FAILURE;
        }

        $phone = $this->normalize((string) $this->argument('phone'));
        $purpose = (string) $this->option('purpose');
        $record = $delivery->peekMirrored($phone, $purpose);

        if ($record === null) {
            $code = $delivery->lastCodeFor($phone, $purpose);
            $record = $code === null ? null : [
                'phone_e164' => $phone,
                'purpose' => $purpose,
                'code' => $code,
            ];
        }

        if ($record === null || ! isset($record['code']) || $record['code'] === '') {
            $this->warn('No fake OTP delivery found for that phone/purpose.');

            return self::FAILURE;
        }

        $this->line('Evidence class: TEAM_TRAINING');
        $this->line('Phone: '.$phone);
        $this->line('Purpose: '.$purpose);
        $this->line('Code: '.$record['code']);
        if (isset($record['delivered_at'])) {
            $this->line('Delivered at: '.$record['delivered_at']);
        }
        $this->comment('This command is a local/test inspection seam only. Do not expose codes in product UI.');

        return self::SUCCESS;
    }

    private function normalize(string $phone): string
    {
        $phone = preg_replace("/[\s().-]+/", '', trim($phone)) ?? '';
        if (preg_match("/^09\d{9}$/", $phone) === 1) {
            return '+63'.substr($phone, 1);
        }

        return $phone;
    }
}
