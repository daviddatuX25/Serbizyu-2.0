<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class SliceStateQuery
{
    public function __construct(private readonly CurrentSession $session) {}

    /** @return array<string, mixed> */
    public function for(Request $request): array
    {
        $session = $this->session->read($request);
        $readiness = null;
        $draft = null;
        $myListings = [];

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
                'next_route' => $ready ? '/#my-listings' : '/#onboarding',
            ];
            $myListings = $this->ownerListingsFor((string) $session['user_id']);
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

    /** @return list<array<string, mixed>> */
    private function ownerListingsFor(string $userId): array
    {
        if (! Schema::hasTable('listing_versions')) {
            return [];
        }

        $listings = DB::table('listings')
            ->join('listing_versions', function ($join): void {
                $join->on('listing_versions.listing_id', '=', 'listings.id')->on('listing_versions.version_number', '=', 'listings.current_version');
            })
            ->join('categories', 'categories.id', '=', 'listings.category_id')
            ->where('listings.owner_user_id', $userId)
            ->orderByDesc('listings.updated_at')
            ->select('listings.*', 'listing_versions.description', 'listing_versions.terms', 'categories.code as category_code')
            ->get();

        return $listings->map(fn (object $listing): array => $this->projection($listing))->values()->all();
    }

    /** @return array<string, mixed> */
    private function projection(object $listing): array
    {
        $terms = json_decode((string) $listing->terms, true) ?: [];
        $geography = json_decode((string) $listing->geography, true) ?: [];

        return [
            'id' => (string) $listing->id,
            'title' => (string) ($terms['title'] ?? ''),
            'description' => (string) $listing->description,
            'category_code' => (string) $listing->category_code,
            'listing_type' => (string) $listing->listing_type,
            'status' => (string) $listing->status,
            'state' => (string) $listing->status,
            'version' => (int) $listing->version,
            'expected_version' => (int) $listing->version,
            'current_version' => (int) $listing->current_version,
            'area' => $geography['area_code'] ?? 'Tagudin',
            'public' => false,
            'owner_user_id' => (string) $listing->owner_user_id,
        ];
    }
}
