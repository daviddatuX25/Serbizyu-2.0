<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Modules\IdentityAccess\Infrastructure\FixtureRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

final class MockAuthService
{
    public function __construct(private readonly FixtureRepository $fixtures) {}

    public function begin(string $fixtureIdentifier, string $correlationId, Request $request): void
    {
        $fixtureIdentifier = trim($fixtureIdentifier);
        if ($fixtureIdentifier === '') {
            throw new IdentityAccessError('INVALID_FIXTURE_IDENTIFIER', 'Enter a fictional fixture identifier to continue.', $correlationId, fieldErrors: ['fixture_identifier' => ['A fixture identifier is required.']]);
        }

        $this->fixtures->ensure();
        if ($this->fixtures->userForFixture($fixtureIdentifier) === null) {
            throw new IdentityAccessError('UNKNOWN_FIXTURE', 'That fictional account is unavailable in this demo scenario.', $correlationId, fieldErrors: ['fixture_identifier' => ['Choose an available demo fixture and try again.']]);
        }

        $request->session()->put('mock_auth', [
            'authenticated' => false,
            'status' => 'challenge_pending',
            'fixture_identifier' => $fixtureIdentifier,
            'source' => 'mock_login',
            'challenge_required' => true,
            'challenge_id' => (string) Str::uuid7(),
            'challenge_code_hash' => hash('sha256', DemoFixtures::CHALLENGE_CODE),
            'issued_at' => now()->toIso8601String(),
            'expires_at' => now()->addMinutes(30)->toIso8601String(),
        ]);
    }

    public function complete(string $fixtureIdentifier, ?string $challengeCode, string $correlationId, Request $request): void
    {
        $fixtureIdentifier = trim($fixtureIdentifier);
        $auth = $request->session()->get('mock_auth');
        if (! is_array($auth) || ($auth['fixture_identifier'] ?? null) !== $fixtureIdentifier || ($auth['status'] ?? null) !== 'challenge_pending') {
            throw new IdentityAccessError('CHALLENGE_NOT_AVAILABLE', 'Start the simulated challenge again before continuing.', $correlationId, status: 409);
        }

        if (isset($auth['expires_at']) && now()->greaterThanOrEqualTo(now()->parse((string) $auth['expires_at']))) {
            $request->session()->forget('mock_auth');
            throw new IdentityAccessError('CHALLENGE_EXPIRED', 'The fictional challenge expired. Start again.', $correlationId, status: 409);
        }

        $submittedCode = trim((string) ($challengeCode ?? DemoFixtures::CHALLENGE_CODE));
        $expectedHash = (string) ($auth['challenge_code_hash'] ?? hash('sha256', DemoFixtures::CHALLENGE_CODE));
        if (! hash_equals($expectedHash, hash('sha256', $submittedCode))) {
            throw new IdentityAccessError('CHALLENGE_INVALID', 'That demo code is not correct. Use the code shown on this screen.', $correlationId, fieldErrors: ['challenge_code' => ['Enter the six-digit demo code.']], status: 422);
        }

        $this->fixtures->ensure();
        $user = $this->fixtures->userForFixture($fixtureIdentifier);
        if ($user === null) {
            throw new IdentityAccessError('UNKNOWN_FIXTURE', 'That fictional account is unavailable in this demo scenario.', $correlationId);
        }

        $request->session()->put('mock_auth', [
            ...$auth,
            'authenticated' => true,
            'status' => 'authenticated',
            'user_id' => (string) $user->id,
            'challenge_required' => false,
            'challenge_id' => null,
            'authenticated_at' => now()->toIso8601String(),
            'expires_at' => now()->addHours(8)->toIso8601String(),
        ]);
    }
}
