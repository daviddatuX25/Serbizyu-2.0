<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Application\ResourceActor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Resolves owner vs Agent acting-for for listing (and later) writes.
 * Deny-by-default: partial acting-for headers/fields are rejected.
 */
final class ResourceActorResolver
{
    public function __construct(private readonly ConsentGrantService $consents) {}

    public function resolve(
        Request $request,
        string $sessionUserId,
        string $correlationId,
        string $resourceType,
        string $requiredAction,
    ): ResourceActor {
        $actingFor = trim((string) (
            $request->input('acting_for_user_id')
            ?? $request->headers->get('X-Acting-For-User-Id')
            ?? ''
        ));
        $grantId = trim((string) (
            $request->input('consent_grant_id')
            ?? $request->headers->get('X-Consent-Grant-Id')
            ?? ''
        ));

        if ($actingFor === '' && $grantId === '') {
            return new ResourceActor(
                resourceOwnerId: $sessionUserId,
                actorUserId: $sessionUserId,
                consentGrantId: null,
            );
        }

        if ($actingFor === '' || $grantId === '') {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'You are not authorized to perform this action.',
                $correlationId,
                status: 403,
            );
        }

        if ($actingFor === $sessionUserId) {
            throw new IdentityAccessError(
                'VALIDATION_FAILED',
                'Acting-for must target a different owner account.',
                $correlationId,
                fieldErrors: ['acting_for_user_id' => ['Choose the owner you are assisting.']],
            );
        }

        DB::transaction(function () use ($grantId, $sessionUserId, $actingFor, $correlationId, $resourceType, $requiredAction): void {
            $this->consents->assertActiveForActingFor(
                $grantId,
                $sessionUserId,
                $actingFor,
                $correlationId,
                $resourceType,
                $requiredAction,
            );
        });

        return new ResourceActor(
            resourceOwnerId: $actingFor,
            actorUserId: $sessionUserId,
            consentGrantId: $grantId,
        );
    }
}
