<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Application\ResourceActor;
use Illuminate\Http\Request;

/**
 * Resolves owner vs Agent acting-for for listing (and later) writes.
 * Deny-by-default: partial acting-for headers/fields are rejected.
 */
final class ResourceActorResolver
{
    public function __construct(
        private readonly RoleAssignmentService $roles,
    ) {}

    public function resolve(
        Request $request,
        string $sessionUserId,
        string $correlationId,
    ): ResourceActor {
        $suppliedOwner = trim((string) (
            $request->input('owner_user_id')
            ?? $request->input('owner_id')
            ?? $request->headers->get('X-Owner-User-Id')
            ?? ''
        ));
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

        if ($suppliedOwner !== '' && $suppliedOwner !== $sessionUserId && $actingFor === '') {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'Client-supplied Owner is forbidden without an active Agent consent grant.',
                $correlationId,
                status: 403,
            );
        }
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
        if (! $this->roles->hasActive($sessionUserId, 'agent')) {
            throw new IdentityAccessError(
                'AUTHORIZATION_DENIED',
                'Active Agent capability is required to perform acting-for operations.',
                $correlationId,
                status: 403,
            );
        }

        return new ResourceActor(
            resourceOwnerId: $actingFor,
            actorUserId: $sessionUserId,
            consentGrantId: $grantId,
        );
    }
}
