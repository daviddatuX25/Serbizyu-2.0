<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Contracts\OwnerListingReader;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class SliceStateQuery
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly OwnerListingReader $ownerListings,
        private readonly RoleAssignmentService $roles,
    ) {}

    /** @return array<string, mixed> */
    public function for(Request $request): array
    {
        $session = $this->session->read($request);
        $readiness = null;
        $draft = null;
        $myListings = [];
        $correlationId = (string) $request->attributes->get('correlation_id', (string) Str::uuid7());

        if ($session !== null && ($session['authenticated'] ?? false)) {
            $userId = (string) $session['user_id'];
            $profile = DB::table('user_profiles')->where('user_id', $userId)->first();
            $access = $profile === null ? [] : (json_decode((string) $profile->accessibility_preferences, true) ?: []);
            $language = $profile === null ? [] : (json_decode((string) $profile->language_preferences, true) ?: []);
            $hasProvider = $this->roles->hasActive($userId, 'provider');
            $hasMerchant = $this->roles->hasActive($userId, 'merchant');
            $profileComplete = $profile !== null && trim((string) ($profile->display_name ?? '')) !== '';
            $passwordSet = Schema::hasColumn('users', 'password')
                && filled(DB::table('users')->where('id', $userId)->value('password'));
            $ready = $profileComplete && $passwordSet;
            $emailAttached = Schema::hasColumn('users', 'email')
                && filled(DB::table('users')->where('id', $userId)->value('email'));
            $readiness = [
                'status' => $ready ? 'ready' : 'setup_required',
                'ready' => $ready,
                'provider_intent' => $hasProvider,
                'can_create_draft' => ($hasProvider || $hasMerchant) && $passwordSet,
                'roles' => $this->roles->activeRoleCodes($userId),
                'capabilities' => $this->roles->activeCapabilities($userId),
                'purpose_specific_actions' => $this->roles->purposeSpecificActions($userId),
                'display_name' => $profile->display_name ?? null,
                'area_code' => $profile->service_area_display ?? 'Tagudin',
                'language_code' => $language['primary'] ?? 'fil',
                'low_data_mode' => (bool) ($access['low_data_mode'] ?? false),
                'help_preference' => $access['help_preference'] ?? 'self_managed',
                'email_attached' => $emailAttached,
                'emailAttached' => $emailAttached,
                'password_set' => $passwordSet,
                'passwordSet' => $passwordSet,
                'blockers' => $ready ? [] : ['Complete your profile setup before creating a listing.'],
                'next_route' => $hasProvider ? '/my-listings' : ($ready ? '/browse' : '/#onboarding'),
            ];
            $myListings = $this->ownerListings->ownerListings($userId, $correlationId);
            $draft = collect($myListings)->first(static fn (array $listing): bool => ($listing['status'] ?? null) === 'draft');
        }

        return [
            'session' => $session,
            'demoNotice' => null,
            'readiness' => $readiness,
            'draft' => $draft,
            'myListings' => $myListings,
        ];
    }
}
