<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class OnboardingService
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly RoleAssignmentService $roles,
        private readonly SetAccountPassword $passwords,
        private readonly LinkEmail $emails,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function save(Request $request, array $input, string $correlationId): array
    {
        $userId = $this->session->requireUser($request, $correlationId);
        $area = trim((string) ($input['area_code'] ?? $input['area'] ?? ''));
        if (str_starts_with($area, 'Tagudin')) {
            $area = 'Tagudin';
        }
        $language = trim((string) ($input['language_code'] ?? $input['language'] ?? 'fil'));
        $displayName = trim((string) ($input['display_name'] ?? ''));
        $help = trim((string) ($input['help_preference'] ?? 'self_managed'));
        $providerIntent = (bool) ($input['provider_intent'] ?? false);
        $password = (string) ($input['password'] ?? '');

        $errors = [];
        if (! $providerIntent) {
            $errors['provider_intent'][] = 'Provider capability intent is required for this listing slice.';
        }
        if ($displayName === '' || mb_strlen($displayName) > 120) {
            $errors['display_name'][] = 'Use a display name between 1 and 120 characters.';
        }
        if (! in_array($area, ['Tagudin', 'Tagudin Centro'], true)) {
            $errors['area_code'][] = 'Use the safe Tagudin area for this demo.';
        }
        if (! in_array($language, ['fil', 'en'], true)) {
            $errors['language_code'][] = 'Choose Filipino or English.';
        }
        if (! in_array($help, ['self_managed', 'assistance_requested'], true)) {
            $errors['help_preference'][] = 'Choose an available setup support preference.';
        }
        if (trim($password) === '') {
            $errors['password'][] = 'Choose a password so you can sign in without SMS next time.';
        }
        if ($errors !== []) {
            throw new IdentityAccessError('VALIDATION_FAILED', 'Review the readiness fields and try again.', $correlationId, fieldErrors: $errors);
        }

        $activeRoles = [];

        DB::transaction(function () use ($userId, $displayName, $area, $language, $input, $help, $correlationId, &$activeRoles): void {
            $now = now();
            DB::table('users')->where('id', $userId)->update([
                'primary_access_tier' => 'L1',
                'status' => 'active',
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);
            DB::table('user_profiles')->where('user_id', $userId)->update([
                'display_name' => $displayName,
                'service_area_display' => $area,
                'accessibility_preferences' => json_encode([
                    'low_data_mode' => (bool) ($input['low_data_mode'] ?? false),
                    'help_preference' => $help,
                ], JSON_THROW_ON_ERROR),
                'language_preferences' => json_encode(['primary' => $language], JSON_THROW_ON_ERROR),
                'version' => DB::raw('version + 1'),
                'correlation_id' => $correlationId,
                'updated_at' => $now,
            ]);

            $this->roles->ensureActive(
                userId: $userId,
                roleCode: 'buy',
                correlationId: $correlationId,
                scope: ['source' => 'onboarding'],
            );
            $this->roles->ensureActive(
                userId: $userId,
                roleCode: 'provide',
                correlationId: $correlationId,
                scope: ['source' => 'onboarding', 'area' => 'Tagudin'],
            );
            $activeRoles = $this->roles->activeRoleCodes($userId);

            if (Schema::hasTable('identity_verifications')) {
                DB::table('identity_verifications')->updateOrInsert(
                    ['user_id' => $userId, 'verification_type' => 'provider_readiness'],
                    [
                        'id' => (string) Str::uuid7(),
                        'status' => 'pending',
                        'provider' => 'mock',
                        'reviewed_by_user_id' => null,
                        'evidence_file_id' => null,
                        'reason' => 'Synthetic readiness review; no real identity evidence is collected.',
                        'reviewed_at' => null,
                        'retention_class' => 'capstone',
                        'version' => 1,
                        'correlation_id' => $correlationId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            }
        });

        $user = User::query()->findOrFail($userId);
        $this->passwords->handle($user, $password, $correlationId);
        $user = $user->fresh() ?? $user;

        $emailAttached = false;
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($email !== '') {
            $this->emails->handle($user, $email, $correlationId);
            $emailAttached = true;
        } elseif (Schema::hasColumn('users', 'email')) {
            $emailAttached = filled(DB::table('users')->where('id', $userId)->value('email'));
        }

        $identityReview = 'none';
        if (Schema::hasTable('identity_verifications')) {
            $identityReview = (string) (DB::table('identity_verifications')
                ->where('user_id', $userId)
                ->where('verification_type', 'provider_readiness')
                ->value('status') ?? 'none');
        }

        return [
            'status' => 'ready',
            'ready' => true,
            'provider_intent' => true,
            'providerIntent' => true,
            'display_name' => $displayName,
            'displayName' => $displayName,
            'area_code' => $area,
            'areaCode' => $area,
            'language_code' => $language,
            'languageCode' => $language,
            'low_data_mode' => (bool) ($input['low_data_mode'] ?? false),
            'lowDataMode' => (bool) ($input['low_data_mode'] ?? false),
            'help_preference' => $help,
            'helpPreference' => $help,
            'email_attached' => $emailAttached,
            'emailAttached' => $emailAttached,
            'password_set' => true,
            'passwordSet' => true,
            'roles' => $activeRoles,
            'identity_review_status' => $identityReview,
            'identityReviewStatus' => $identityReview,
            'blockers' => ['Identity review remains a fictional pending gate; submission moves to pending review only.'],
            'next_route' => '/#workspace',
        ];
    }
}
