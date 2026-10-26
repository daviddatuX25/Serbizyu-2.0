<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\PaymentObligations\Application\OrderPaymentObligationAdapter;
use App\Modules\OrdersWork\Application\WorkExecutionService;
use Database\Seeders\WorkCatalogSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesAcceptedWorkOrder;
use Tests\TestCase;

final class PaymentNotificationSourceTest extends TestCase
{
    use CreatesAcceptedWorkOrder;
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('Payment notification source commands require PostgreSQL.');
        }
    }

    public function test_cash_report_and_mismatch_notify_the_real_order_counterparties(): void
    {
        app(WorkCatalogSeeder::class)->run();
        $fixture = $this->createAcceptedWorkOrder('A1', [
            [
                'id' => 'perform-service',
                'ordinal' => 1,
                'title' => 'Perform the service',
                'description' => 'Complete the provider-authored service step.',
                'node_kind' => 'execution_proof',
                'evidence_type' => 'none',
                'evidence_description' => '',
                'control_mode' => 'provider_advance',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => [],
                'approval_method' => 'none',
                'handoff_party' => null,
                'checklist_items' => [],
                'metric_requirements' => [],
            ],
            [
                'id' => 'customer-signoff',
                'ordinal' => 2,
                'title' => 'Customer sign-off',
                'description' => 'The customer approves the completed service.',
                'node_kind' => 'final_signoff',
                'evidence_type' => 'none',
                'evidence_description' => '',
                'control_mode' => 'customer_confirm',
                'mandatory' => true,
                'duration_label' => null,
                'required_proofs' => [],
                'approval_method' => 'app_confirm',
                'handoff_party' => null,
                'checklist_items' => [],
                'metric_requirements' => [],
            ],
        ]);
        $structure = json_decode((string) DB::table('work_instances')->where('id', $fixture['work_id'])->value('structure'), true, 512, JSON_THROW_ON_ERROR);
        $firstNodeId = (string) $structure['nodes'][0]['id'];
        $signoffNodeId = (string) $structure['nodes'][1]['id'];
        $work = app(WorkExecutionService::class);
        $work->advanceNode($fixture['order_id'], (string) $fixture['provider']->id, $firstNodeId, 'complete_step', [], $fixture['correlation_id']);
        $work->advanceNode($fixture['order_id'], (string) $fixture['provider']->id, $signoffNodeId, 'propose_completion', [], $fixture['correlation_id']);
        $completed = $work->advanceNode($fixture['order_id'], (string) $fixture['buyer']->id, $signoffNodeId, 'signoff_completion', [], $fixture['correlation_id']);
        self::assertSame('due', $completed['obligation_status']);

        $obligation = DB::table('payment_obligations')->where('order_id', $fixture['order_id'])->firstOrFail();
        $payments = app(OrderPaymentObligationAdapter::class);
        $payments->reportCashPayment(
            (string) $fixture['order_id'],
            (string) $obligation->id,
            (string) $fixture['buyer']->id,
            $fixture['correlation_id'],
            'cash-notification-report-0001',
        );
        self::assertSame('payer_reported_cash', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));

        $reportIntent = DB::table('notifications')
            ->where('recipient_user_id', $fixture['provider']->id)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.cash.reported')
            ->first();
        self::assertNotNull($reportIntent);
        $reportPayload = json_decode((string) $reportIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('needs_action', $reportIntent->priority);
        self::assertSame('needs_action', $reportPayload['attention']);
        self::assertSame(route('orders.show', ['order' => $fixture['order_id']], false), $reportPayload['action_url']);
        self::assertEqualsCanonicalizing(['attention', 'title', 'body', 'action_url'], array_keys($reportPayload));
        self::assertSame(1, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.cash.reported')->count());


        $payments->flagPaymentMismatch(
            (string) $fixture['order_id'],
            (string) $obligation->id,
            (string) $fixture['provider']->id,
            (int) $obligation->amount_minor - 1,
            $fixture['correlation_id'],
        );
        $mismatchIntent = DB::table('notifications')
            ->where('recipient_user_id', $fixture['buyer']->id)
            ->where('event_source_type', 'payment_obligation')
            ->where('event_source_id', $obligation->id)
            ->where('event_type', 'payment.mismatch.reported')
            ->first();
        self::assertNotNull($mismatchIntent);
        $mismatchPayload = json_decode((string) $mismatchIntent->payload, true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('needs_action', $mismatchIntent->priority);
        self::assertSame('needs_action', $mismatchPayload['attention']);
        self::assertSame(route('orders.show', ['order' => $fixture['order_id']], false), $mismatchPayload['action_url']);
        self::assertSame('disputed_mismatch', DB::table('payment_obligations')->where('id', $obligation->id)->value('status'));
        self::assertEqualsCanonicalizing(['attention', 'title', 'body', 'action_url'], array_keys($mismatchPayload));
        self::assertSame(1, DB::table('notifications')->where('event_source_id', $obligation->id)->where('event_type', 'payment.mismatch.reported')->count());

    }
}
