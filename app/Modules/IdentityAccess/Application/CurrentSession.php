<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

final class CurrentSession
{
    /** @return array<string, mixed>|null */
    public function read(Request $request): ?array
    {
        $user = Auth::user();
        if ($user === null) {
            return null;
        }

        $displayName = (string) (DB::table('user_profiles')->where('user_id', $user->getAuthIdentifier())->value('display_name') ?: '');

        return [
            'authenticated' => true,
            'isAuthenticated' => true,
            'status' => 'authenticated',
            'user_id' => (string) $user->getAuthIdentifier(),
            'userId' => (string) $user->getAuthIdentifier(),
            'source' => 'phone_otp',
            'display_name' => $displayName,
            'displayName' => $displayName,
        ];
    }

    public function requireUser(Request $request, string $correlationId): string
    {
        $session = $this->read($request);
        if ($session === null || ! ($session['authenticated'] ?? false)) {
            throw new IdentityAccessError('AUTHENTICATION_REQUIRED', 'Sign in with your phone to continue.', $correlationId, status: 401);
        }

        return (string) $session['user_id'];
    }
}
