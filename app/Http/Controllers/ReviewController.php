<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\TrustSupport\Application\SubmitReviewCommand;
use App\Modules\TrustSupport\Application\TrustSupportError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class ReviewController
{
    public function __construct(
        private readonly SubmitReviewCommand $submitReview,
    ) {}

    public function store(Request $request, string $order): JsonResponse|RedirectResponse
    {
        $correlationId = (string) ($request->header('X-Correlation-Id') ?? Str::uuid7());
        $user = $request->user();
        if (! $user) {
            abort(401, 'Authentication required to submit reviews.');
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'content' => ['nullable', 'string', 'max:2000'],
            'attribute_chips' => ['nullable', 'array'],
            'attribute_chips.*' => ['string', 'max:64'],
            'cascade' => ['nullable', 'boolean'],
            'evidence_file_id' => ['nullable', 'string', 'uuid'],
        ]);

        try {
            $result = $this->submitReview->handle(
                orderId: $order,
                authorUserId: (string) $user->getAuthIdentifier(),
                rating: (int) $validated['rating'],
                content: isset($validated['content']) ? (string) $validated['content'] : null,
                attributeChips: (array) ($validated['attribute_chips'] ?? []),
                cascade: (bool) ($validated['cascade'] ?? true),
                evidenceFileId: isset($validated['evidence_file_id']) ? (string) $validated['evidence_file_id'] : null,
                correlationId: $correlationId,
            );

            if ($request->wantsJson()) {
                return response()->json(['data' => $result], 201);
            }

            return back()->with('notice', $result['unblinded']
                ? 'Your review is now published!'
                : 'Review sealed. It will unblind once the counterparty reviews or 72 hours pass.');
        } catch (TrustSupportError $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'error' => [
                        'code' => $e->code,
                        'message' => $e->getMessage(),
                    ],
                ], $e->status);
            }

            return back()->withErrors(['review' => $e->getMessage()]);
        }
    }
}
