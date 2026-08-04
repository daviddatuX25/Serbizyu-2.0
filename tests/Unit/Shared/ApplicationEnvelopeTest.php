<?php

declare(strict_types=1);

namespace Tests\Unit\Shared;

use App\Shared\Application\AuthorizationDecision;
use App\Shared\Application\CommandEnvelope;
use App\Shared\Contracts\AuthorizationContext;
use App\Shared\Contracts\Command;
use App\Shared\Contracts\CorrelationId;
use App\Shared\Contracts\EvidenceClass;
use App\Shared\Contracts\IdempotencyKey;
use PHPUnit\Framework\TestCase;

final class ApplicationEnvelopeTest extends TestCase
{
    public function test_command_envelope_serializes_required_causality_and_concurrency_fields(): void
    {
        $command = new class implements Command {};
        $correlation = new CorrelationId('corr-test-0001');
        $envelope = new CommandEnvelope(
            commandId: 'command-test-0001',
            command: $command,
            authorization: new AuthorizationContext('actor-0001', authenticated: true),
            correlationId: $correlation,
            idempotencyKey: new IdempotencyKey('idem-test-0001'),
            expectedVersion: 3,
            evidenceClass: EvidenceClass::CAPSTONE,
            target: 'foundation:test',
        );

        self::assertSame('corr-test-0001', $envelope->toArray()['correlation_id']);
        self::assertSame(3, $envelope->toArray()['expected_version']);
        self::assertSame('CAPSTONE', $envelope->toArray()['evidence_class']);
    }

    public function test_authorization_denial_has_a_stable_safe_shape(): void
    {
        $decision = AuthorizationDecision::denied(
            AuthorizationContext::anonymous(),
            new CorrelationId('corr-denied-0001'),
        );

        self::assertFalse($decision->allowed);
        self::assertSame('AUTHORIZATION_DENIED', $decision->error?->toArray()['code']);
        self::assertSame('corr-denied-0001', $decision->error?->toArray()['correlation_id']);
        self::assertFalse($decision->error?->toArray()['retryable']);
    }
}
