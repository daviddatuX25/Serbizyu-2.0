<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\IdentityAccess\Application\CurrentSession;
use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Contracts\StaffAccessPort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ListingReviewController extends Controller
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly StaffAccessPort $staffAccess,
        private readonly AuditRecorder $audits,
        private readonly ListingCommandStore $listings,
    ) {}


    public function approve(Request $request, string $listing): RedirectResponse
    {
        return $this->decide($request, $listing, 'approve');
    }

    public function reject(Request $request, string $listing): RedirectResponse
    {
        return $this->decide($request, $listing, 'reject');
    }

    private function decide(Request $request, string $listingId, string $decision): RedirectResponse
    {
        $validated = $request->validate([
            'expected_version' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $correlationId = $this->correlationId($request);

        DB::transaction(function () use ($request, $listingId, $decision, $validated, $correlationId): void {
            $reviewerId = $this->session->requireUser($request, $correlationId);
            abort_unless($this->staffAccess->canAccessStaff($reviewerId), 403);

            $row = DB::table('listings')->where('id', $listingId)->lockForUpdate()->first();
            abort_if($row === null, 404);
            abort_unless(
                (string) $row->status === 'pending_review' && (string) $row->review_status === 'pending',
                409,
                'Only pending listings can be reviewed.',
            );
            abort_unless((int) $row->version === (int) $validated['expected_version'], 409, 'The listing changed since it was opened.');

            $status = $decision === 'approve' ? 'active' : 'rejected';
            $reviewStatus = $decision === 'approve' ? 'approved' : 'rejected';
            $nextVersion = ((int) $row->version) + 1;
            DB::table('listings')->where('id', $listingId)->update([
                'status' => $status,
                'review_status' => $reviewStatus,
                'version' => $nextVersion,
                'correlation_id' => $correlationId,
                'updated_at' => now(),
            ]);
            if ($decision === 'approve') {
                $this->listings->provisionPublishedProductStock($listingId, (string) $row->owner_user_id, $correlationId);
            }

            $this->audits->record(
                action: 'listing.'.$decision,
                targetType: 'listing',
                targetId: $listingId,
                correlationId: $correlationId,
                actor: ActorContext::human($reviewerId),
                commandName: 'ReviewListing',
                expectedVersion: (int) $validated['expected_version'],
                previous: ['status' => 'pending_review', 'review_status' => 'pending'],
                next: ['status' => $status, 'review_status' => $reviewStatus],
                reason: $decision === 'reject' ? ($validated['reason'] ?? 'Listing rejected during review') : 'Listing approved during review',
            );
        });

        return redirect()->route('admin.listings.index')->with(
            'notice',
            $decision === 'approve' ? 'Listing approved.' : 'Listing rejected.',
        );
    }

    private function correlationId(Request $request): string
    {
        return (string) $request->attributes->get('correlation_id');
    }
}
