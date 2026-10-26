<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface QuoteAwardOrderFormationPort
{
    /**
     * @param  array{request_id: string, quote_id: string, buyer_user_id: string, provider_user_id: string, listing_id: ?string, listing_type: string, source_listing_version_id: string|null, capability_profile_id: ?string, work_shape: string, amount_minor: int, currency: string, scope: array<string, mixed>, payment_lane_options: list<string>, geography: string, appointment_reservation_id: string|null, appointment_slot: array<string, mixed>|null}  $terms
     * @return array{order_id: string, work_instance_id: string, payment_obligation_id: string}
     */
    public function formAward(string $actorUserId, array $terms, string $correlationId): array;
}
