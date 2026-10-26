<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use App\Shared\Contracts\OrderReferenceReaderPort;
use Illuminate\Support\Facades\DB;

final class DealChainCourierAuthority implements OrderHandoffCourierAuthorityPort
{
    public function __construct(private readonly OrderReferenceReaderPort $orders) {}

    public function activeCourierCandidatesForProductNeed(string $dealChainId, string $productNeedId): array
    {
        $formedCouriers = DB::table('deal_dependencies as dependencies')
            ->join('deal_needs as product_needs', function ($join): void {
                $join->on('product_needs.id', '=', 'dependencies.predecessor_need_id')
                    ->on('product_needs.deal_chain_id', '=', 'dependencies.deal_chain_id');
            })
            ->join('deal_needs as courier_needs', function ($join): void {
                $join->on('courier_needs.id', '=', 'dependencies.successor_need_id')
                    ->on('courier_needs.deal_chain_id', '=', 'dependencies.deal_chain_id');
            })
            ->join('deal_need_confirmations as confirmations', function ($join): void {
                $join->on('confirmations.deal_need_id', '=', 'courier_needs.id')
                    ->on('confirmations.deal_chain_id', '=', 'courier_needs.deal_chain_id');
            })
            ->join('deal_invitations as invitations', function ($join): void {
                $join->on('invitations.id', '=', 'confirmations.invitation_id')
                    ->on('invitations.deal_need_id', '=', 'confirmations.deal_need_id');
            })
            ->where('dependencies.deal_chain_id', $dealChainId)
            ->where('dependencies.predecessor_need_id', $productNeedId)
            ->where('dependencies.status', 'active')
            ->where('product_needs.node_role', 'store')
            ->where('product_needs.status', 'in_progress')
            ->where('courier_needs.node_role', 'courier')
            ->where('courier_needs.status', 'in_progress')
            ->where('invitations.status', 'accepted')
            ->select('invitations.invited_provider_user_id as user_id', 'confirmations.order_id')
            ->orderBy('confirmations.order_id')
            ->get();

        if ($formedCouriers->isEmpty()) {
            return [];
        }

        $ordersById = [];
        foreach ($this->orders->activeOrderDetailsForOrders(
            $formedCouriers->pluck('order_id')->map(static fn (mixed $id): string => (string) $id)->all(),
        ) as $order) {
            $ordersById[$order['order_id']] = $order;
        }

        $candidates = [];
        foreach ($formedCouriers as $courier) {
            $orderId = (string) $courier->order_id;
            $activeOrder = $ordersById[$orderId] ?? null;
            $courierId = (string) $courier->user_id;
            if ($activeOrder === null || $activeOrder['provider_user_id'] !== $courierId) {
                continue;
            }
            $candidates[] = [
                'user_id' => $courierId,
                'order_id' => $orderId,
                'public_reference' => $activeOrder['public_reference'],
            ];
        }

        return $candidates;
    }

    public function isAuthorizedCourier(string $dealChainId, string $productNeedId, string $courierUserId): bool
    {
        foreach ($this->activeCourierCandidatesForProductNeed($dealChainId, $productNeedId) as $candidate) {
            if ($candidate['user_id'] === $courierUserId) {
                return true;
            }
        }

        return false;
    }
}
