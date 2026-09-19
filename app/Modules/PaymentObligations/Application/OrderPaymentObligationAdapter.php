<?php

declare(strict_types=1);

namespace App\Modules\PaymentObligations\Application;

use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class OrderPaymentObligationAdapter implements OrderPaymentObligationPort
{
    /**
     * Create the primary payment obligation within the caller-owned transaction.
     *
     * @see OrderPaymentObligationPort::createPrimary()
     */
    public function createPrimary(
        string $orderId,
        string $workInstanceId,
        int $amountMinor,
        string $currency,
        string $payerUserId,
        string $recipientUserId,
        string $correlationId,
        string $lane = 'external_cash',
    ): string {
        $allowedLanes = ['external_cash', 'external_digital_proof', 'direct_digital', 'tiwala_protected_digital'];
        if (! in_array($lane, $allowedLanes, true)) {
            throw new \InvalidArgumentException("Invalid payment lane [{$lane}].");
        }

        $obligationId = (string) Str::uuid7();
        $now = now();

        $dueCondition = match ($lane) {
            'tiwala_protected_digital' => 'on_site_load_test_signoff',
            'external_digital_proof' => 'proof_submission',
            'direct_digital' => 'on_checkout',
            default => 'on_acceptance',
        };

        DB::table('payment_obligations')->insert([
            'id' => $obligationId,
            'order_id' => $orderId,
            'work_instance_id' => $workInstanceId,
            'purpose' => 'primary_consideration',
            'amount_minor' => $amountMinor,
            'currency' => $currency,
            'lane' => $lane,
            'status' => 'created',
            'due_condition' => $dueCondition,
            'policy_version_id' => null,
            'platform_fee_amount_minor' => 0,
            'processor_cost_amount_minor' => 0,
            'payer_user_id' => $payerUserId,
            'recipient_user_id' => $recipientUserId,
            'correlation_id' => $correlationId,
            'version' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $obligationId;
    }
}
