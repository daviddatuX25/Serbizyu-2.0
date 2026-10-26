<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Listings\Application\ListingError;
use App\Modules\Listings\Application\StockLedgerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

final class StockController
{
    public function __construct(private readonly StockLedgerService $stock) {}

    public function index(Request $request): InertiaResponse
    {
        $ownerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($ownerUserId === '', 401);

        return Inertia::render('Stock/Index', [
            'items' => $this->stock->index($ownerUserId),
            'correlationId' => (string) $request->attributes->get('correlation_id'),
        ]);
    }

    public function show(Request $request, string $capacity): InertiaResponse
    {
        $ownerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($ownerUserId === '', 401);
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $stockItem = $this->stock->show($capacity, $ownerUserId, $correlationId);
        } catch (ListingError $error) {
            abort($error->status, $error->getMessage());
        }

        return Inertia::render('Stock/Show', [
            'stockItem' => $stockItem,
            'correlationId' => $correlationId,
            'notice' => $request->session()->get('notice'),
        ]);
    }

    public function adjust(Request $request, string $capacity): RedirectResponse
    {
        $ownerUserId = (string) ($request->user()?->getAuthIdentifier() ?? '');
        abort_if($ownerUserId === '', 401);
        $input = $request->validate([
            'movement_type' => ['required', 'string', 'in:receiving,damaged,recount'],
            'quantity' => ['required', 'integer', 'min:0'],
            'expected_row_version' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'min:8', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
            'reference' => ['nullable', 'string', 'max:191'],
        ]);
        $correlationId = (string) $request->attributes->get('correlation_id');

        try {
            $result = $this->stock->adjust(
                capacityId: $capacity,
                actorUserId: $ownerUserId,
                ownerUserId: $ownerUserId,
                expectedRowVersion: (int) $input['expected_row_version'],
                movementType: (string) $input['movement_type'],
                quantity: (int) $input['quantity'],
                idempotencyKey: (string) $input['idempotency_key'],
                reason: (string) $input['reason'],
                reference: isset($input['reference']) ? (string) $input['reference'] : null,
                correlationId: $correlationId,
            );
        } catch (ListingError $error) {
            if (in_array($error->status, [404, 403], true)) {
                abort($error->status, $error->getMessage());
            }

            return Redirect::back()->withErrors($error->envelope->fieldErrors ?: ['movement_type' => [$error->getMessage()]])->withInput();
        }

        $notice = $result['availability_status'] === 'shortage'
            ? 'Recount saved. Existing holds and orders remain unchanged; review the affected orders below.'
            : 'Stock movement recorded.';

        return Redirect::route('stock.show', ['capacity' => $capacity])->with('notice', $notice);
    }
}
