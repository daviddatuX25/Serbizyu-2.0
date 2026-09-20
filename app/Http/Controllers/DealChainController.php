<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class DealChainController extends Controller
{
    public function __construct(private readonly CurrentSession $session) {}

    public function authorize(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);

        try {
            $userId = $this->session->requireUser($request, $correlationId);
            $items = $request->input('items', []);
            $paymentMethod = (string) $request->input('payment_method', 'cash');

            $dealChainId = (string) Str::uuid7();
            $now = now();
            $ordinal = 1;

            DB::transaction(function () use ($dealChainId, $userId, $correlationId, $now, $items, &$ordinal): void {
                DB::table('deal_chains')->insert([
                    'id' => $dealChainId,
                    'coordinator_user_id' => $userId,
                    'status' => 'sourcing',
                    'title' => 'Tagudin Deal Chain #'.strtoupper(substr($dealChainId, 0, 8)),
                    'goal' => 'Multi-party coordinated citizen delivery and labor',
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($items as $item) {
                    $dealNeedId = (string) Str::uuid7();
                    DB::table('deal_needs')->insert([
                        'id' => $dealNeedId,
                        'deal_chain_id' => $dealChainId,
                        'ordinal' => $ordinal++,
                        'need_kind' => 'service',
                        'title' => (string) ($item['title'] ?? 'Deal Chain Item'),
                        'description' => 'Citizen staged pick with non-cascading settlement',
                        'status' => 'open',
                        'requested_at' => $now,
                        'correlation_id' => $correlationId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            });

            // If an item is a bookable listing, redirect to its booking proposal to seamlessly continue
            if (! empty($items) && isset($items[0]['id'])) {
                return redirect()->route('orders.start', ['listing' => $items[0]['id']])
                    ->with('notice', "Deal Chain #".strtoupper(substr($dealChainId, 0, 8))." authorized with {$ordinal} needs under non-cascading escrow protection.");
            }

            return redirect()->route('browse')
                ->with('notice', "Deal Chain #".strtoupper(substr($dealChainId, 0, 8))." authorized successfully.");
        } catch (IdentityAccessError $error) {
            return redirect()->route('auth.sign-in');
        }
    }

    private function correlationId(Request $request): string
    {
        return (string) ($request->attributes->get('correlation_id') ?: Str::uuid7());
    }
}
