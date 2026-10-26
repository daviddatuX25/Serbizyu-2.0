<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\CohortClassificationReaderPort;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Contracts\StaffEvidenceReaderPort;
use App\Shared\Contracts\StaffIdentityReaderPort;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StaffDomainReader implements StaffIdentityReaderPort
{
    private const COHORTS = ['genuine_tagudin', 'capstone_demo', 'sandbox', 'team', 'training', 'support'];

    public function __construct(
        private readonly CohortClassificationReaderPort $cohorts,
        private readonly StaffEvidenceReaderPort $evidence,
        private readonly StaffAccessPort $staffAccess,
    ) {}

    public function staffContext(string $staffId, ?string $cohort): array
    {
        $staff = DB::table('users')->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'users.id')
            ->where('users.id', $staffId)->first(['users.id', 'users.primary_access_tier', 'user_profiles.display_name']);
        $roles = DB::table('role_assignments')->where('user_id', $staffId)->where('status', 'active')
            ->where('effective_at', '<=', now())
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderBy('role_code')->pluck('role_code')->map(static fn ($role): string => (string) $role)->all();

        return [
            'operator' => [
                'id' => $staffId,
                'display_name' => trim((string) ($staff?->display_name ?? '')) ?: 'Staff member',
                'roles' => $roles,
            ],
            'environment' => (string) config('serbizyu.environment', config('app.env', 'production')),
            'cohort' => ['selected' => in_array($cohort, self::COHORTS, true) ? $cohort : null, 'options' => self::COHORTS],
        ];
    }

    public function registry(string $kind, array $filters): ?array
    {
        if ($kind !== 'users') return null;
        $query = DB::table('users')->leftJoin('user_profiles', 'user_profiles.user_id', '=', 'users.id')
            ->select(['users.id', 'users.status', 'users.updated_at', 'user_profiles.display_name']);
        if (($filters['status'] ?? '') !== '') $query->where('users.status', $filters['status']);
        if (($filters['q'] ?? '') !== '') {
            $term = (string) $filters['q'];
            $query->where(function (Builder $q) use ($term): void {
                $q->where('user_profiles.display_name', 'ilike', '%'.$term.'%');
                if (Str::isUuid($term)) $q->orWhere('users.id', $term);
            });
        }
        if (($filters['cohort'] ?? null) !== null) {
            $query->whereIn('users.id', $this->cohorts->matchingSubjectIds((string) $filters['cohort'])['actors']);
        }
        $page = $query->orderByDesc('users.updated_at')->orderByDesc('users.id')
            ->paginate((int) ($filters['per_page'] ?? 25), ['*'], 'page', (int) ($filters['page'] ?? 1));
        $cohorts = $this->cohorts->latestForSubjects($page->getCollection()->map(
            static fn ($row): array => ['actor_user_id' => (string) $row->id],
        )->all());

        return [
            'data' => $page->getCollection()->map(fn ($row): array => [
                'id' => (string) $row->id,
                'reference' => (string) $row->id,
                'kind' => 'user',
                'title' => trim((string) ($row->display_name ?? '')) ?: 'User',
                'status' => (string) $row->status,
                'summary' => 'Account status: '.(string) $row->status,
                'updated_at' => Carbon::parse($row->updated_at)->toISOString(),
                'cohort' => $this->cohortLabel($cohorts['actor:'.$row->id] ?? null),
                'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $row->id),
                'facts' => [['label' => 'User ID', 'value' => (string) $row->id]],
            ])->values()->all(),
            'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()],
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'from' => $page->firstItem(), 'to' => $page->lastItem()],
        ];
    }

    public function resolve(string $referenceOrId): ?array
    {
        $verificationQuery = DB::table('identity_verifications')->where('public_reference', $referenceOrId);
        if (Str::isUuid($referenceOrId)) $verificationQuery->orWhere('id', $referenceOrId);
        $verification = $verificationQuery->first();
        if ($verification !== null) return $this->verificationRecord($verification);

        if (! Str::isUuid($referenceOrId)) return null;
        $user = DB::table('users')->where('id', $referenceOrId)->first(['id', 'status', 'version', 'updated_at']);
        if ($user === null) return null;
        $profile = DB::table('user_profiles')->where('user_id', $user->id)->first(['display_name']);
        $roles = DB::table('role_assignments')->where('user_id', $user->id)->where('status', 'active')
            ->where('effective_at', '<=', now())
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderBy('role_code')->pluck('role_code')->map(static fn ($role): string => (string) $role)->all();
        $verifications = DB::table('identity_verifications')->where('user_id', $user->id)
            ->orderByDesc('created_at')->orderByDesc('id')->get(['id', 'public_reference', 'verification_type', 'status', 'version', 'evidence_file_id']);
        $evidenceIds = $verifications->pluck('evidence_file_id')->filter()->map(static fn ($id): string => (string) $id)->all();
        $evidence = $this->evidence->metadataForIds($evidenceIds);
        $facts = [['label' => 'Account status', 'value' => (string) $user->status], ['label' => 'Active roles', 'value' => $roles === [] ? 'None' : implode(', ', $roles)]];
        foreach ($verifications as $item) $facts[] = ['label' => 'Identity verification', 'value' => (string) $item->verification_type.' — '.(string) $item->status.' ('.(string) $item->public_reference.')'];

        return [
            'id' => (string) $user->id,
            'kind' => 'user',
            'reference' => (string) $user->id,
            'title' => trim((string) ($profile?->display_name ?? '')) ?: 'User',
            'status' => (string) $user->status,
            'version' => (int) $user->version,
            'updated_at' => Carbon::parse($user->updated_at)->toISOString(),
            'rails' => [],
            'facts' => $facts,
            'evidence' => $evidence,
        ];
    }


    private function verificationRecord(object $verification): array
    {
        $user = DB::table('users')->where('id', $verification->user_id)->first(['id', 'status']);
        $profile = DB::table('user_profiles')->where('user_id', $verification->user_id)->first(['display_name']);
        $reviewerId = auth()->id();
        $canReview = $verification->status === 'pending' && $reviewerId !== null && (string) $verification->user_id !== (string) $reviewerId
            && $this->staffAccess->canAccessStaff((string) $reviewerId);
        $reasons = array_keys(IdentityVerificationService::NON_DISCLOSING_REASONS);

        return [
            'id' => (string) $verification->id,
            'kind' => 'identity_verification',
            'reference' => (string) $verification->public_reference,
            'title' => (string) $verification->verification_type.' — '.(trim((string) ($profile?->display_name ?? '')) ?: 'User'),
            'status' => (string) $verification->status,
            'version' => (int) $verification->version,
            'responsibility' => $verification->status === 'pending' ? [
                'party' => 'staff',
                'user_id' => null,
                'label' => 'Staff review queue',
            ] : ['party' => 'none', 'user_id' => null, 'label' => 'No current responsibility'],
            'updated_at' => Carbon::parse($verification->updated_at)->toISOString(),
            'rails' => [
                'case' => [[
                    'id' => (string) $verification->id,
                    'kind' => 'identity_verification',
                    'title' => (string) $verification->verification_type.' — '.(trim((string) ($profile?->display_name ?? '')) ?: 'User'),
                    'state' => (string) $verification->status,
                    'label' => 'Identity verification',
                    'reference' => (string) $verification->public_reference,
                    'facts' => [
                        ['label' => 'Verification type', 'value' => (string) $verification->verification_type],
                        ['label' => 'Account status', 'value' => (string) ($user?->status ?? 'unknown')],
                        ['label' => 'Reviewed at', 'value' => $verification->reviewed_at === null ? 'Not reviewed' : Carbon::parse($verification->reviewed_at)->toISOString()],
                    ],
                ]],
            ],
            'actions' => ['identity_review' => [
                'can_review' => $canReview,
                'method' => 'POST',
                'review_url' => '/admin/identity-verifications/'.rawurlencode((string) $verification->id).'/review',
                'body_fields' => ['decision', 'reason'],
                'decisions' => ['approve', 'reject'],
                'rejection_reasons' => $reasons,
            ]],
            'evidence' => $this->evidence->metadataForIds($verification->evidence_file_id === null ? [] : [(string) $verification->evidence_file_id]),
        ];
    }


    private function cohortLabel(?string $cohort): string
    {
        if ($cohort === null) return 'unclassified';
        return $cohort;
    }
}
