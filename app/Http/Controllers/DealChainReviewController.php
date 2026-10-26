<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\TrustSupport\Application\SubmitDealChainReviewsCommand;
use App\Modules\TrustSupport\Application\TrustSupportError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class DealChainReviewController
{
    public function __construct(
        private readonly SubmitDealChainReviewsCommand $submitReviews,
    ) {}

    public function store(Request $request, string $dealChain): JsonResponse|RedirectResponse
    {
        $correlationId = (string) ($request->header('X-Correlation-Id') ?? Str::uuid7());
        $user = $request->user();
        if (! $user) {
            abort(401, 'Authentication required to submit reviews.');
        }

        $validated = $request->validate([
            'submission_id' => ['nullable', 'string', 'uuid'],
            'mode' => ['required', 'string', 'in:cascade,granular'],
            'unified_review' => ['nullable', 'array', 'required_if:mode,cascade'],
            'unified_review.rating' => ['nullable', 'integer', 'min:1', 'max:5', 'required_if:mode,cascade'],
            'unified_review.content' => ['nullable', 'string', 'max:2000'],
            'unified_review.attribute_chips' => ['nullable', 'array'],
            'unified_review.attribute_chips.*' => ['string', 'max:64'],
            'unified_review.evidence_file_id' => ['nullable', 'string', 'uuid'],
            'granular_reviews' => ['nullable', 'array', 'required_if:mode,granular'],
            'granular_reviews.*.order_id' => ['required_with:granular_reviews', 'string', 'uuid'],
            'granular_reviews.*.rating' => ['required_with:granular_reviews', 'integer', 'min:1', 'max:5'],
            'granular_reviews.*.content' => ['nullable', 'string', 'max:2000'],
            'granular_reviews.*.attribute_chips' => ['nullable', 'array'],
            'granular_reviews.*.attribute_chips.*' => ['string', 'max:64'],
            'granular_reviews.*.evidence_file_id' => ['nullable', 'string', 'uuid'],
        ]);

        $submissionId = (string) ($validated['submission_id'] ?? Str::uuid7());
        $mode = (string) $validated['mode'];
        $unifiedReview = isset($validated['unified_review']) ? (array) $validated['unified_review'] : null;
        $granularReviews = isset($validated['granular_reviews']) ? (array) $validated['granular_reviews'] : null;

        try {
            $result = $this->submitReviews->handle(
                dealChainId: $dealChain,
                authorUserId: (string) $user->getAuthIdentifier(),
                submissionId: $submissionId,
                mode: $mode,
                unifiedReview: $unifiedReview,
                granularReviews: $granularReviews,
                correlationId: $correlationId,
            );

            if ($request->wantsJson()) {
                return response()->json(['data' => $result], 201);
            }

            $unblindedCount = collect($result['reviews'])->where('unblinded', true)->count();
            $total = count($result['reviews']);

            $msg = $unblindedCount === $total
                ? "All {$total} deal chain reviews are now published!"
                : "Reviews submitted! {$unblindedCount} revealed, ".($total - $unblindedCount).' sealed for 72 hours.';

            return back()->with('notice', $msg);
        } catch (TrustSupportError $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'error' => [
                        'code' => $e->envelope->code,
                        'message' => $e->getMessage(),
                    ],
                ], $e->status);
            }

            return back()->withErrors(['reviews' => $e->getMessage()]);
        }
    }
}
