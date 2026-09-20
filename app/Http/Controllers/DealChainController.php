<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

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

            DB::transaction(function () use ($dealChainId, $userId, $correlationId, $now, $items): void {
                $totalBudget = 0;
                foreach ($items as $item) {
                    $totalBudget += (int) (($item['price'] ?? 0) * ($item['quantity'] ?? 1));
                }

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

                $ordinal = 1;

                foreach ($items as $item) {
                    $recipe = $item['deal_chain'] ?? null;

                    if ($recipe === 'turnkey_parts') {
                        // Slot 1: Part
                        $partNeedId = (string) Str::uuid7();
                        DB::table('deal_needs')->insert([
                            'id' => $partNeedId,
                            'deal_chain_id' => $dealChainId,
                            'ordinal' => $ordinal++,
                            'need_kind' => 'product',
                            'title' => '35uF AC Run Capacitor',
                            'description' => 'Counter pickup ready · Tagudin Hardware & Supply Depot',
                            'status' => 'open',
                            'requested_at' => $now,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Slot 2: Courier
                        $courierNeedId = (string) Str::uuid7();
                        DB::table('deal_needs')->insert([
                            'id' => $courierNeedId,
                            'deal_chain_id' => $dealChainId,
                            'ordinal' => $ordinal++,
                            'need_kind' => 'service',
                            'title' => 'Danny Express Motorcycle Courier',
                            'description' => 'Counter to jobsite doorstep transit · Gated on part ready',
                            'status' => 'open',
                            'requested_at' => $now,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Slot 3: Labor
                        $laborNeedId = (string) Str::uuid7();
                        DB::table('deal_needs')->insert([
                            'id' => $laborNeedId,
                            'deal_chain_id' => $dealChainId,
                            'ordinal' => $ordinal++,
                            'need_kind' => 'service',
                            'title' => (string) ($item['title'] ?? 'Inverter Split AC Deep Clean'),
                            'description' => 'Kuya Ben AC Services on-site installation · Gated on delivery complete',
                            'status' => 'open',
                            'requested_at' => $now,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Edge 1: Part (blocks) -> Courier
                        DB::table('deal_dependencies')->insert([
                            'id' => (string) Str::uuid7(),
                            'deal_chain_id' => $dealChainId,
                            'predecessor_need_id' => $partNeedId,
                            'successor_need_id' => $courierNeedId,
                            'dependency_type' => 'blocks',
                            'status' => 'active',
                            'condition_code' => 'part_ready',
                            'created_by_user_id' => $userId,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Edge 2: Courier (blocks) -> Labor
                        DB::table('deal_dependencies')->insert([
                            'id' => (string) Str::uuid7(),
                            'deal_chain_id' => $dealChainId,
                            'predecessor_need_id' => $courierNeedId,
                            'successor_need_id' => $laborNeedId,
                            'dependency_type' => 'blocks',
                            'status' => 'active',
                            'condition_code' => 'delivery_signed',
                            'created_by_user_id' => $userId,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    } elseif ($recipe === 'courier_delivery') {
                        // Slot 1: Courier
                        $courierNeedId = (string) Str::uuid7();
                        DB::table('deal_needs')->insert([
                            'id' => $courierNeedId,
                            'deal_chain_id' => $dealChainId,
                            'ordinal' => $ordinal++,
                            'need_kind' => 'service',
                            'title' => 'Danny Express Motorcycle Courier',
                            'description' => 'Doorstep transit across Tagudin Centro',
                            'status' => 'open',
                            'requested_at' => $now,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Slot 2: Item
                        $itemNeedId = (string) Str::uuid7();
                        DB::table('deal_needs')->insert([
                            'id' => $itemNeedId,
                            'deal_chain_id' => $dealChainId,
                            'ordinal' => $ordinal++,
                            'need_kind' => 'service',
                            'title' => (string) ($item['title'] ?? 'Primary Offering'),
                            'description' => 'Citizen service delivery',
                            'status' => 'open',
                            'requested_at' => $now,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);

                        // Edge: Courier -> Item
                        DB::table('deal_dependencies')->insert([
                            'id' => (string) Str::uuid7(),
                            'deal_chain_id' => $dealChainId,
                            'predecessor_need_id' => $courierNeedId,
                            'successor_need_id' => $itemNeedId,
                            'dependency_type' => 'blocks',
                            'status' => 'active',
                            'condition_code' => 'delivery_signed',
                            'created_by_user_id' => $userId,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    } else {
                        // Standalone slot
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
                }
            });

            return redirect()->route('deal-chains.show', ['dealChain' => $dealChainId])
                ->with('notice', "Deal Chain #".strtoupper(substr($dealChainId, 0, 8))." authorized successfully with non-cascading escrow protection.");
        } catch (IdentityAccessError $error) {
            return redirect()->route('auth.sign-in');
        }
    }

    public function show(Request $request, string $dealChain): mixed
    {
        $dealChainId = $dealChain;

        $chain = DB::table('deal_chains')->where('id', $dealChainId)->first();
        if (! $chain) {
            abort(404, 'Deal Chain not found');
        }

        $needs = DB::table('deal_needs')
            ->where('deal_chain_id', $dealChainId)
            ->orderBy('ordinal')
            ->get();

        $dependencies = DB::table('deal_dependencies')
            ->where('deal_chain_id', $dealChainId)
            ->get();

        return Inertia::render('Orders/DealChainDetail', [
            'chain' => $chain,
            'slots' => $needs,
            'dependencies' => $dependencies,
            'notice' => session('notice'),
            'view' => $request->query('view', 'project'),
            'worker' => $request->query('worker', null),
        ]);
    }

    private function correlationId(Request $request): string
    {
        return (string) ($request->attributes->get('correlation_id') ?: Str::uuid7());
    }
}
