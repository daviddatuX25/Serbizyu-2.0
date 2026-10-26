<?php

declare(strict_types=1);

namespace App\Modules\Tenders\Application;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class TenderWorkspaceQuery
{
    /** @return list<array<string, mixed>> */
    public function requestsFor(string $userId): array
    {
        $requests = DB::table('requests as request')
            ->leftJoin('orders as awarded', 'awarded.request_id', '=', 'request.id')
            ->where('request.requester_user_id', $userId)
            ->orderByDesc('request.updated_at')->orderByDesc('request.id')
            ->select(['request.*', 'awarded.id as order_id', 'awarded.public_reference as order_reference'])
            ->get();
        $quotes = DB::table('quotes')->whereIn('request_id', $requests->pluck('id'))
            ->where('status', 'submitted')->orderByDesc('quote_version')->get()->groupBy('request_id');

        return $requests->map(function ($request) use ($quotes): array {
            $terms = json_decode((string) $request->item_list, true) ?? [];
            $current = $quotes->get($request->id, collect())->filter(fn ($quote): bool => ! $this->expired($quote->expires_at));
            $actionable = $current->first(fn ($quote): bool => (json_decode((string) $quote->scope, true)['counter_by'] ?? 'provider') === 'provider');
            $expired = $this->expired($request->expires_at);
            $open = in_array($request->status, ['published', 'sourcing', 'quoted'], true) && ! $expired;

            return [
                'id' => (string) $request->id,
                'request_id' => (string) $request->id,
                'quote_id' => $actionable?->id,
                'title' => $terms['title'] ?? (string) $request->description,
                'status' => (string) $request->status,
                'tender_mode' => $terms['tender_mode'] ?? 'open_tender',
                'amount_minor' => $request->budget_amount_minor !== null ? (int) $request->budget_amount_minor : null,
                'currency' => $request->budget_currency,
                'deadline' => $request->expires_at,
                'expired' => $expired,
                'pending_turn' => $open && $current->isNotEmpty() ? ($actionable !== null ? 'you' : 'counterparty') : null,
                'quote_count' => $current->count(),
                'order_id' => $request->order_id,
                'order_reference' => $request->order_reference,
            ];
        })->all();
    }

    /** @return list<array<string, mixed>> */
    public function quotesFor(string $userId): array
    {
        return DB::table('quotes as quote')
            ->join('requests as request', 'request.id', '=', 'quote.request_id')
            ->leftJoin('orders as awarded', 'awarded.quote_id', '=', 'quote.id')
            ->where('quote.provider_user_id', $userId)
            ->orderByDesc('quote.updated_at')->orderByDesc('quote.quote_version')
            ->select(['quote.*', 'request.item_list', 'request.description', 'request.status as request_status', 'awarded.id as order_id', 'awarded.public_reference as order_reference'])
            ->get()->map(function ($quote): array {
                $terms = json_decode((string) $quote->item_list, true) ?? [];
                $scope = json_decode((string) $quote->scope, true) ?? [];
                $expired = $this->expired($quote->expires_at);
                $open = $quote->status === 'submitted' && in_array($quote->request_status, ['published', 'sourcing', 'quoted'], true) && ! $expired;

                return [
                    'id' => (string) $quote->id,
                    'request_id' => (string) $quote->request_id,
                    'quote_id' => (string) $quote->id,
                    'title' => $terms['title'] ?? (string) $quote->description,
                    'status' => (string) $quote->status,
                    'tender_mode' => $terms['tender_mode'] ?? 'open_tender',
                    'amount_minor' => (int) $quote->amount_minor,
                    'currency' => (string) $quote->currency,
                    'deadline' => $quote->expires_at,
                    'expired' => $expired,
                    'pending_turn' => $open ? (($scope['counter_by'] ?? 'provider') === 'requester' ? 'you' : 'counterparty') : null,
                    'quote_version' => (int) $quote->quote_version,
                    'order_id' => $quote->order_id,
                    'order_reference' => $quote->order_reference,
                ];
            })->all();
    }

    private function expired(?string $deadline): bool
    {
        return $deadline !== null && Carbon::parse($deadline)->lessThanOrEqualTo(now());
    }
}
