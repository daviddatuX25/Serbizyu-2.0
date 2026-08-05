<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Modules\Listings\Application\OwnerListingsQuery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class SliceStateQuery
{
    public function __construct(
        private readonly CurrentSession $session,
        private readonly OwnerListingsQuery $ownerListings,
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
            $profile = DB::table('user_profiles')->where('user_id', $session['user_id'])->first();
            $access = $profile === null ? [] : (json_decode((string) $profile->accessibility_preferences, true) ?: []);
            $language = $profile === null ? [] : (json_decode((string) $profile->language_preferences, true) ?: []);
            $providerIntent = DB::table('role_assignments')->where('user_id', $session['user_id'])->where('role_code', 'provide')->where('status', 'active')->exists();
            $profileComplete = $profile !== null && trim((string) ($profile->display_name ?? '')) !== '';
            $ready = $providerIntent && $profileComplete;
            $readiness = [
                'status' => $ready ? 'ready' : 'setup_required',
                'ready' => $ready,
                'provider_intent' => $providerIntent,
                'can_create_draft' => $providerIntent,
                'display_name' => $profile->display_name ?? null,
                'area_code' => $profile->service_area_display ?? 'Tagudin',
                'language_code' => $language['primary'] ?? 'fil',
                'low_data_mode' => (bool) ($access['low_data_mode'] ?? false),
                'help_preference' => $access['help_preference'] ?? 'self_managed',
                'blockers' => $ready ? [] : ['Complete your profile setup before creating a listing.'],
                'next_route' => $ready ? '/my-listings' : '/#onboarding',
            ];
            $myListings = $this->ownerListings->handle((string) $session['user_id'], $correlationId);
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
