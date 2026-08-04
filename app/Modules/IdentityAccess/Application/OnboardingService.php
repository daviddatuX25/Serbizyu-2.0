<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class OnboardingService
{
    public function __construct(private readonly CurrentSession $session) {}

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

        $errors = [];
        if (! (bool) ($input['provider_intent'] ?? false)) {
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
        if ($errors !== []) {
            throw new IdentityAccessError('VALIDATION_FAILED', 'Review the readiness fields and try again.', $correlationId, fieldErrors: $errors);
        }

        DB::transaction(function () use ($userId, $displayName, $area, $language, $input, $help, $correlationId): void {
            $now = now();
            DB::table('users')->where('id', $userId)->update([
                'primary_access_tier' => 'L1',
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

            DB::table('role_assignments')->updateOrInsert(
                ['user_id' => $userId, 'role_code' => 'provide', 'status' => 'active'],
                [
                    'id' => (string) Str::uuid7(),
                    'granted_by_user_id' => $userId,
                    'effective_at' => $now,
                    'expires_at' => null,
                    'scope' => json_encode(['source' => 'onboarding', 'area' => 'Tagudin'], JSON_THROW_ON_ERROR),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );

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
            'blockers' => ['Identity review remains a fictional pending gate; submission moves to pending review only.'],
            'next_route' => '/#workspace',
        ];
    }
}
