<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\IdentityAccess\Application\IdentityAccessError;
use App\Modules\PaymentObligations\Application\PaymentObligationError;
use App\Shared\Application\KernelException;
use App\Shared\Contracts\OrderPaymentObligationPort;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

final class PaymentObligationController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly OrderPaymentObligationPort $obligations,
    ) {}

    public function chooseLane(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate([
                'lane' => ['required', 'string', Rule::in(['external_cash', 'p2p_transfer', 'protected_digital'])],
                'idempotency_key' => ['required', 'string', 'min:8', 'max:255'],
            ]);
            $acceptedListingVersionId = DB::table('order_terms_snapshots')
                ->where('order_id', $order)
                ->orderByDesc('snapshot_version')
                ->value('source_listing_version_id');
            $successorId = $this->obligations->chooseLane(
                $order,
                $obligation,
                $actorUserId,
                $input['lane'],
                $acceptedListingVersionId !== null ? (string) $acceptedListingVersionId : null,
                $correlationId,
                $input['idempotency_key'],
            );

            return $this->success($request, $correlationId, ['obligation_id' => $successorId]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function reportCash(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate([
                'idempotency_key' => ['required', 'string', 'min:8', 'max:255'],
            ]);
            $status = $this->obligations->reportCashPayment(
                $order,
                $obligation,
                $actorUserId,
                $correlationId,
                $input['idempotency_key'],
            );

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function acknowledgeCash(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate([
                'idempotency_key' => ['required', 'string', 'min:8', 'max:255'],
                'acting_for_user_id' => ['nullable', 'uuid'],
                'consent_grant_id' => ['nullable', 'uuid'],
            ]);
            $row = DB::table('payment_obligations')
                ->where('id', $obligation)
                ->where('order_id', $order)
                ->first();
            if ($row === null) {
                throw new PaymentObligationError('OBLIGATION_NOT_FOUND', 'Payment obligation not found.', 404);
            }
            $recipientUserId = (string) $row->recipient_user_id;
            if (isset($input['acting_for_user_id']) && $input['acting_for_user_id'] !== $recipientUserId) {
                throw new PaymentObligationError('RECIPIENT_REQUIRED', 'Only the recipient can be represented for cash acknowledgement.', 403);
            }
            $status = $this->obligations->acknowledgeCashReceipt(
                $order,
                $obligation,
                $actorUserId,
                $recipientUserId,
                $input['consent_grant_id'] ?? null,
                $correlationId,
                $input['idempotency_key'],
            );

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function uploadP2pProof(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate([
                'proof' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'extensions:jpg,jpeg,png,webp', 'max:10240'],
                'sent_amount_minor' => ['required', 'integer', 'min:0'],
                'transfer_reference' => ['required', 'string', 'min:1', 'max:255'],
            ]);
            $status = $this->obligations->submitP2pProof(
                $order,
                $obligation,
                $actorUserId,
                $input['proof'],
                (int) $input['sent_amount_minor'],
                $input['transfer_reference'],
                $correlationId,
            );

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function verifyP2pPayment(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate(['received_amount_minor' => ['required', 'integer', 'min:0']]);
            $status = $this->obligations->verifyP2pPayment($order, $obligation, $actorUserId, (int) $input['received_amount_minor'], $correlationId);

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function rejectP2pProof(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']]);
            $status = $this->obligations->rejectP2pProof($order, $obligation, $actorUserId, $input['reason'], $correlationId);

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function flagPaymentMismatch(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate(['received_amount_minor' => ['required', 'integer', 'min:0']]);
            $caseId = $this->obligations->flagPaymentMismatch($order, $obligation, $actorUserId, (int) $input['received_amount_minor'], $correlationId);

            return $this->success($request, $correlationId, ['case_id' => $caseId, 'status' => 'disputed_mismatch']);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function downloadP2pProof(Request $request, string $order, string $obligation): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $proof = $this->obligations->p2pProofForRecipient($order, $obligation, $actorUserId);

            return Storage::disk('private')->download(
                (string) $proof->storage_key,
                (string) $proof->id,
                [
                    'Content-Type' => (string) $proof->media_type,
                    'X-Content-Type-Options' => 'nosniff',
                    'Cache-Control' => 'private, no-store',
                ],
            );
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function resolveMismatch(Request $request, string $case): mixed
    {
        $correlationId = $this->correlationId($request);
        try {
            $actorUserId = $this->session->requireUser($request, $correlationId);
            $input = $request->validate(['resolution' => ['required', 'string', Rule::in(['settle', 'release'])]]);
            $status = $this->obligations->resolvePaymentMismatch($case, $actorUserId, $input['resolution'], $correlationId);

            return $this->success($request, $correlationId, ['status' => $status]);
        } catch (IdentityAccessError|KernelException|PaymentObligationError $error) {
            return $this->failure($request, $error, $correlationId);
        }
    }

    public function moneyHistory(Request $request): mixed
    {
        $correlationId = $this->correlationId($request);
        $viewerUserId = $this->session->requireUser($request, $correlationId);
        $rows = DB::table('payment_obligations as payment')
            ->join('orders', 'orders.id', '=', 'payment.order_id')
            ->leftJoin('user_profiles as payer_profile', 'payer_profile.user_id', '=', 'payment.payer_user_id')
            ->leftJoin('user_profiles as recipient_profile', 'recipient_profile.user_id', '=', 'payment.recipient_user_id')
            ->where('payment.purpose', 'primary_consideration')
            ->where('payment.status', '!=', 'superseded')
            ->where(fn ($query) => $query->where('payment.payer_user_id', $viewerUserId)->orWhere('payment.recipient_user_id', $viewerUserId))
            ->select([
                'payment.id',
                'payment.public_reference',
                'payment.order_id',
                'payment.currency',
                'payment.amount_minor',
                'payment.status',
                'payment.lane',
                'payment.updated_at',
                'payment.payer_user_id',
                'payment.recipient_user_id',
                'payer_profile.display_name as payer_name',
                'recipient_profile.display_name as recipient_name',
                DB::raw('(SELECT scope FROM order_terms_snapshots WHERE order_terms_snapshots.order_id = payment.order_id ORDER BY snapshot_version DESC LIMIT 1) AS terms_scope'),
            ])
            ->orderByDesc('payment.updated_at')
            ->get();

        $groups = [];
        foreach ($rows as $row) {
            $currency = (string) $row->currency;
            $role = (string) $row->payer_user_id === $viewerUserId ? 'payer' : 'recipient';
            $partyName = $role === 'payer' ? (string) ($row->recipient_name ?? '') : (string) ($row->payer_name ?? '');
            $scope = is_array($row->terms_scope) ? $row->terms_scope : json_decode((string) $row->terms_scope, true);
            $title = is_array($scope) && is_string($scope['title'] ?? null) ? trim($scope['title']) : '';
            $amountMinor = (int) $row->amount_minor;
            $status = (string) $row->status;
            $groups[$currency] ??= [
                'currency' => $currency,
                'receivable_minor' => 0,
                'awaiting_acknowledgement_minor' => 0,
                'under_review_minor' => 0,
                'settled_minor' => 0,
                'records' => [],
            ];
            if ($status === 'due' && $role === 'recipient') {
                $groups[$currency]['receivable_minor'] += $amountMinor;
            } elseif (in_array($status, ['payer_reported_cash', 'payer_submitted_p2p_proof'], true)) {
                $groups[$currency]['awaiting_acknowledgement_minor'] += $amountMinor;
            } elseif ($status === 'disputed_mismatch') {
                $groups[$currency]['under_review_minor'] += $amountMinor;
            } elseif ($status === 'settled') {
                $groups[$currency]['settled_minor'] += $amountMinor;
            }
            $groups[$currency]['records'][] = [
                'id' => (string) $row->id,
                'public_reference' => (string) $row->public_reference,
                'order_id' => (string) $row->order_id,
                'title' => $title,
                'party_name' => $partyName,
                'role' => $role,
                'lane' => (string) $row->lane,
                'status' => $status,
                'amount_minor' => $amountMinor,
                'updated_at' => (string) $row->updated_at,
            ];
        }

        return Inertia::render('Payments/MoneyHistory', [
            'groups' => array_values($groups),
            'correlationId' => $correlationId,
        ]);
    }

    private function correlationId(Request $request): string
    {
        return (string) ($request->attributes->get('correlation_id') ?? $request->header('X-Correlation-Id') ?? Str::uuid7());
    }

    /** @param array<string, mixed> $data */
    private function success(Request $request, string $correlationId, array $data): mixed
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['data' => $data], 200, ['X-Correlation-Id' => $correlationId]);
        }

        return back()->with('notice', 'Payment record updated.');
    }

    private function failure(
        Request $request,
        IdentityAccessError|KernelException|PaymentObligationError $error,
        string $correlationId,
    ): mixed {
        $status = $error instanceof PaymentObligationError
            ? $error->status
            : $error->status;
        $code = $error instanceof PaymentObligationError
            ? $error->errorCode
            : (string) $error->envelope->code;
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'code' => $code,
                'message' => $error->getMessage(),
                'correlation_id' => $correlationId,
            ], $status, ['X-Correlation-Id' => $correlationId]);
        }

        if ($status === 403 || $status === 404) {
            abort($status, $error->getMessage());
        }

        return back()->withErrors(['payment' => $error->getMessage()]);
    }
}
