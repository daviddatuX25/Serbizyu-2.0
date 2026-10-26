<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\PaymentObligations\Application\OrderPaymentObligationAdapter;
use App\Shared\Infrastructure\Demo\DealChainExecutionFixtures as Fix;
use Database\Seeders\DealChainExecutionSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class PaymentProtectedDigitalSandboxTest extends TestCase
{
    use DatabaseTransactions;

    public function test_protected_digital_creation_requires_an_explicit_disposable_sandbox_cohort(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Protected digital lane policy regression requires PostgreSQL.');
        }

        $this->seed(DealChainExecutionSeeder::class);
        $order = DB::table('orders')->where('id', Fix::ORDER_ID_TRANSIT)->first();
        $work = DB::table('work_instances')->where('order_id', $order->id)->first();
        $adapter = app(OrderPaymentObligationAdapter::class);
        $correlationId = (string) Str::uuid7();

        config()->set([
            'app.env' => 'testing',
            'serbizyu.environment' => 'testing',
            'serbizyu.public_environment' => 'testing',
            'serbizyu.evidence_class' => 'TEAM_TRAINING',
            'serbizyu.providers.payment.mode' => 'disabled',
            'serbizyu.providers.payment.credentials' => '',
        ]);
        $cashId = $adapter->createPrimary(
            orderId: (string) $order->id,
            workInstanceId: (string) $work->id,
            amountMinor: 1000,
            currency: 'PHP',
            payerUserId: (string) $order->buyer_user_id,
            recipientUserId: (string) $order->provider_user_id,
            correlationId: $correlationId,
            lane: 'external_cash',
        );
        $this->assertSame('not_due', DB::table('payment_obligations')->where('id', $cashId)->value('status'));

        $obligationCount = DB::table('payment_obligations')->count();
        $deniedCohorts = [
            ['testing', 'testing', 'TEAM_TRAINING', 'disabled'],
            ['capstone', 'capstone', 'GENUINE_PILOT', 'disabled'],
            ['pilot', 'pilot', 'SANDBOX', 'sandbox'],
            ['capstone', 'capstone', 'SANDBOX', 'live'],
            ['production', 'capstone', 'SANDBOX', 'sandbox'],
        ];

        foreach ($deniedCohorts as [$appEnvironment, $serbizyuEnvironment, $evidenceClass, $providerMode]) {
            config()->set([
                'app.env' => $appEnvironment,
                'serbizyu.environment' => $serbizyuEnvironment,
                'serbizyu.public_environment' => $serbizyuEnvironment,
                'serbizyu.evidence_class' => $evidenceClass,
                'serbizyu.providers.payment.mode' => $providerMode,
                'serbizyu.providers.payment.credentials' => '',
            ]);

            try {
                $adapter->createPrimary(
                    orderId: (string) $order->id,
                    workInstanceId: (string) $work->id,
                    amountMinor: 1000,
                    currency: 'PHP',
                    payerUserId: (string) $order->buyer_user_id,
                    recipientUserId: (string) $order->provider_user_id,
                    correlationId: (string) Str::uuid7(),
                    lane: 'protected_digital',
                );
                $this->fail('Protected digital creation should require an authorized disposable sandbox cohort.');
            } catch (\InvalidArgumentException $exception) {
                $this->assertStringContainsString('authorized disposable sandbox', $exception->getMessage());
            }

            $this->assertSame($obligationCount, DB::table('payment_obligations')->count());
        }

        config()->set([
            'app.env' => 'capstone',
            'serbizyu.environment' => 'capstone',
            'serbizyu.public_environment' => 'capstone',
            'serbizyu.evidence_class' => 'SANDBOX',
            'serbizyu.providers.payment.mode' => 'sandbox',
            'serbizyu.providers.payment.credentials' => '',
        ]);
        $sandboxId = $adapter->createPrimary(
            orderId: (string) $order->id,
            workInstanceId: (string) $work->id,
            amountMinor: 1000,
            currency: 'PHP',
            payerUserId: (string) $order->buyer_user_id,
            recipientUserId: (string) $order->provider_user_id,
            correlationId: (string) Str::uuid7(),
            lane: 'protected_digital',
        );

        $sandboxObligation = DB::table('payment_obligations')->where('id', $sandboxId)->first();
        $this->assertSame('protected_digital', $sandboxObligation->lane);
        $this->assertSame('not_due', $sandboxObligation->status);
    }
}
