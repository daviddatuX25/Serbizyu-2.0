<?php

declare(strict_types=1);

namespace App\Modules\IdentityAccess\Application;

use App\Shared\Application\KernelException;
use App\Shared\Contracts\ActingForAuthorizer;

final class ConsentActingForAuthorizer implements ActingForAuthorizer
{
    public function __construct(private readonly ConsentGrantService $consents) {}

    public function assertActive(
        string $grantId,
        string $granteeUserId,
        string $grantorUserId,
        string $correlationId,
        ?string $resourceType = null,
        ?string $requiredAction = null,
    ): void {
        try {
            $this->consents->assertActiveForActingFor(
                $grantId,
                $granteeUserId,
                $grantorUserId,
                $correlationId,
                $resourceType,
                $requiredAction,
            );
        } catch (IdentityAccessError $error) {
            throw new KernelException(
                code: $error->envelope->code,
                message: $error->getMessage(),
                correlationId: $correlationId,
                status: $error->status,
                fieldErrors: $error->envelope->fieldErrors,
            );
        }
    }
}
