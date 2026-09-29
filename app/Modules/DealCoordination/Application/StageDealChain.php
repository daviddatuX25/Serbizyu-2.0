<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\OrderListingSourcePort;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StageDealChain
{
    public function __construct(
        private readonly OrderListingSourcePort $listingSource,
        private readonly DealChainCatalog $catalog,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
    ) {}

    /**
     * @param  array<int, array{id: string, quantity: int, deal_chain?: string|null, slot_overrides?: array<string, mixed>|null}>  $items
     * @return array{deal_chain_id: string, status: string, items_count: int, needs_count: int, invitations_count: int, dependencies_count: int}
     */
    public function handle(
        string $coordinatorUserId,
        array $items,
        string $idempotencyKey,
        string $correlationId,
    ): array {
        if (preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $idempotencyKey) !== 1) {
            throw new DealCoordinationError(
                'INVALID_IDEMPOTENCY_KEY',
                'Use a valid idempotency key.',
                $correlationId,
                fieldErrors: ['idempotency_key' => ['The idempotency key is invalid.']],
            );
        }

        if ($items === []) {
            throw new DealCoordinationError(
                'VALIDATION_FAILED',
                'At least one item is required to stage a deal chain.',
                $correlationId,
                fieldErrors: ['items' => ['At least one item is required.']],
            );
        }

        $recipeCatalog = $this->catalog->published();
        $resolvedItems = $this->resolveItems($items, $coordinatorUserId, $recipeCatalog, $correlationId);

        $scope = 'deal_chain.stage:'.$coordinatorUserId;
        $fingerprint = [
            'operation' => 'deal_chain.stage',
            'coordinator_user_id' => $coordinatorUserId,
            'items' => array_map(static fn (array $it): array => [
                'listing_id' => $it['source']['listing_id'] ?? $it['source']['id'],
                'quantity' => $it['quantity'],
                'recipe' => $it['recipe'],
                'slot_overrides' => $it['slot_overrides'] ?? null,
            ], $resolvedItems),
        ];

        try {
            $reservation = $this->idempotency->begin(
                scope: $scope,
                key: $idempotencyKey,
                fingerprint: $fingerprint,
                correlationId: $correlationId,
                actorUserId: $coordinatorUserId,
            );
        } catch (KernelException $error) {
            throw new DealCoordinationError(
                $error->envelope->code,
                $error->getMessage(),
                $correlationId,
                status: $error->status,
            );
        }

        if ($reservation->isReplay) {
            /** @var array{deal_chain_id: string, status: string, items_count: int, needs_count: int, invitations_count: int, dependencies_count: int} */
            return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
        }

        return DB::transaction(function () use (
            $coordinatorUserId,
            $resolvedItems,
            $recipeCatalog,
            $reservation,
            $correlationId,
        ): array {
            $dealChainId = (string) Str::uuid7();
            $now = now();

            DB::table('deal_chains')->insert([
                'id' => $dealChainId,
                'coordinator_user_id' => $coordinatorUserId,
                'status' => 'sourcing',
                'title' => 'Tagudin Deal Chain #'.strtoupper(substr($dealChainId, 0, 8)),
                'goal' => 'Coordinated fulfillment plan with provider agreements pending',
                'payload_version' => 1,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $ordinal = 1;
            $needsCount = 0;
            $invitationsCount = 0;
            $dependenciesCount = 0;

            foreach ($resolvedItems as $item) {
                $counts = $this->appendPlan(
                    dealChainId: $dealChainId,
                    coordinatorUserId: $coordinatorUserId,
                    correlationId: $correlationId,
                    now: $now,
                    ordinal: $ordinal,
                    recipe: $item['recipe'],
                    recipeDefinition: $item['recipe'] === null
                        ? null
                        : $recipeCatalog[$item['recipe']] ?? null,
                    source: $item['source'],
                    quantity: $item['quantity'],
                    slotOverrides: $item['slot_overrides'] ?? null,
                );

                $needsCount += $counts['needs'];
                $invitationsCount += $counts['invitations'];
                $dependenciesCount += $counts['dependencies'];
            }

            $response = [
                'deal_chain_id' => $dealChainId,
                'status' => 'sourcing',
                'items_count' => count($resolvedItems),
                'needs_count' => $needsCount,
                'invitations_count' => $invitationsCount,
                'dependencies_count' => $dependenciesCount,
            ];
            ksort($response);

            $auditId = $this->audits->record(
                action: 'deal_chain.stage',
                targetType: 'deal_chain',
                targetId: $dealChainId,
                correlationId: $correlationId,
                actor: ActorContext::human($coordinatorUserId),
                idempotencyKeyId: (string) $reservation->row->id,
                commandName: 'StageDealChain',
                expectedVersion: 1,
                previous: null,
                next: $response,
                reason: 'Coordinator staged a multi-party deal chain plan',
            );
            $this->outbox->enqueue(
                eventType: 'deal_chain.staged',
                aggregateType: 'deal_chain',
                aggregateId: $dealChainId,
                payload: $response,
                correlationId: $correlationId,
                auditEventId: $auditId,
            );

            $this->idempotency->succeed($reservation->row, $response);

            return $response;
        });
    }

    /**
     * @param  array<int, array{id: string, quantity: int, deal_chain?: string|null, slot_overrides?: array<string, mixed>|null}>  $items
     * @param  array<string, array<string, mixed>>  $recipeCatalog
     * @return list<array{source: array<string, mixed>, quantity: int, recipe: string|null, recipe_definition: array<string, mixed>|null, slot_overrides: array<string, mixed>|null}>
     */
    private function resolveItems(
        array $items,
        string $userId,
        array $recipeCatalog,
        string $correlationId,
    ): array {
        $resolved = [];
        $errors = [];

        foreach ($items as $index => $item) {
            $source = $this->listingSource->findActiveApproved((string) $item['id']);
            if ($source === null) {
                $errors["items.{$index}.id"] = ['This listing is no longer available.'];

                continue;
            }

            if ((string) $source['owner_user_id'] === $userId) {
                $errors["items.{$index}.id"] = ['You cannot stage your own listing.'];

                continue;
            }

            $recipe = $item['deal_chain'] ?? null;
            if ($recipe !== null && ! $this->recipeApplies($recipe, $source, $recipeCatalog)) {
                $errors["items.{$index}.deal_chain"] = [
                    'That partner pipeline is not available for this listing category or type.',
                ];

                continue;
            }

            $resolved[] = [
                'source' => $source,
                'quantity' => (int) $item['quantity'],
                'recipe' => $recipe,
                'recipe_definition' => $recipe === null ? null : $recipeCatalog[$recipe] ?? null,
                'slot_overrides' => $item['slot_overrides'] ?? null,
            ];
        }

        if ($errors !== []) {
            throw new DealCoordinationError(
                'VALIDATION_FAILED',
                'Invalid items in deal chain.',
                $correlationId,
                status: 422,
                fieldErrors: $errors,
            );
        }

        return $resolved;
    }

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, array<string, mixed>>  $recipeCatalog
     */
    private function recipeApplies(string $recipe, array $source, array $recipeCatalog): bool
    {
        $definition = $recipeCatalog[$recipe] ?? null;
        if ($definition === null) {
            return false;
        }

        $workShapes = array_values((array) ($definition['work_shapes'] ?? []));

        return in_array((string) $source['category_code'], (array) $definition['category_codes'], true)
            && in_array((string) $source['listing_type'], (array) $definition['listing_types'], true)
            && ($workShapes === [] || in_array((string) ($source['work_shape'] ?? ''), $workShapes, true));
    }

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>|null  $recipeDefinition
     * @param  array<string, mixed>|null  $slotOverrides
     * @return array{needs: int, invitations: int, dependencies: int}
     */
    private function appendPlan(
        string $dealChainId,
        string $coordinatorUserId,
        string $correlationId,
        DateTimeInterface $now,
        int &$ordinal,
        ?string $recipe,
        ?array $recipeDefinition,
        array $source,
        int $quantity,
        ?array $slotOverrides = null,
    ): array {
        $nodes = $this->nodesFor($recipe, $source, $quantity, $recipeDefinition);
        $needIds = [];
        $needsCount = 0;
        $invitationsCount = 0;
        $dependenciesCount = 0;

        foreach ($nodes as $node) {
            $needId = (string) Str::uuid7();
            DB::table('deal_needs')->insert([
                'id' => $needId,
                'deal_chain_id' => $dealChainId,
                'ordinal' => $ordinal++,
                'need_kind' => $node['need_kind'],
                'title' => $node['title'],
                'description' => $node['description'],
                'status' => 'open',
                'requested_at' => $now,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $needsCount++;

            $override = null;
            if ($slotOverrides !== null) {
                $override = $slotOverrides[$node['key']]
                    ?? $slotOverrides[$node['frontend']['type'] ?? '']
                    ?? $slotOverrides[$node['frontend']['role'] ?? '']
                    ?? null;

                if ($override === null && $node['key'] === 'courier') {
                    $override = $slotOverrides['delivery'] ?? $slotOverrides['rider'] ?? null;
                }
                if ($override === null && ($node['key'] === 'part' || $node['key'] === 'store')) {
                    $override = $slotOverrides['store'] ?? $slotOverrides['part'] ?? null;
                }
                if ($override === null && ($node['key'] === 'installation' || $node['key'] === 'labor')) {
                    $override = $slotOverrides['labor'] ?? $slotOverrides['technician'] ?? null;
                }
            }

            if (is_array($override)) {
                $overrideListingId = (string) ($override['listing_id'] ?? '');
                if ($overrideListingId !== '') {
                    $partnerListing = $this->listingSource->findActiveApproved($overrideListingId);
                    if ($partnerListing !== null) {
                        $overrideProviderId = (string) $partnerListing['owner_user_id'];
                        DB::table('deal_invitations')->insert([
                            'id' => (string) Str::uuid7(),
                            'deal_need_id' => $needId,
                            'invited_provider_user_id' => $overrideProviderId,
                            'invited_by_user_id' => $coordinatorUserId,
                            'acting_for_user_id' => null,
                            'purpose' => 'deal_need_assignment',
                            'scope' => json_encode([
                                'listing_id' => $overrideListingId,
                                'listing_version' => (int) ($partnerListing['listing_version_number'] ?? 1),
                                'price_minor' => (int) ($partnerListing['price_amount_minor'] ?? $override['price_minor'] ?? 0),
                            ], JSON_THROW_ON_ERROR),
                            'payload_version' => 1,
                            'status' => 'sent',
                            'expires_at' => now()->addDays(2),
                            'version' => 1,
                            'correlation_id' => $correlationId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        $invitationsCount++;
                    }
                }
            } elseif (! empty($node['is_primary']) || $node['key'] === 'primary' || $node['key'] === 'direct' || ($recipe === null)) {
                DB::table('deal_invitations')->insert([
                    'id' => (string) Str::uuid7(),
                    'deal_need_id' => $needId,
                    'invited_provider_user_id' => (string) $source['owner_user_id'],
                    'invited_by_user_id' => $coordinatorUserId,
                    'acting_for_user_id' => null,
                    'purpose' => 'primary_listing_assignment',
                    'scope' => json_encode([
                        'listing_id' => (string) ($source['listing_id'] ?? $source['id'] ?? ''),
                        'listing_version' => (int) ($source['listing_version_number'] ?? 1),
                    ], JSON_THROW_ON_ERROR),
                    'payload_version' => 1,
                    'status' => 'sent',
                    'expires_at' => now()->addDays(2),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $invitationsCount++;
            }

            $needIds[$node['key']] = $needId;
        }

        foreach ($this->dependenciesFor($recipeDefinition) as [$predecessor, $successor, $condition]) {
            if (isset($needIds[$predecessor], $needIds[$successor])) {
                DB::table('deal_dependencies')->insert([
                    'id' => (string) Str::uuid7(),
                    'deal_chain_id' => $dealChainId,
                    'predecessor_need_id' => $needIds[$predecessor],
                    'successor_need_id' => $needIds[$successor],
                    'dependency_type' => 'blocks',
                    'status' => 'active',
                    'condition_code' => $condition,
                    'created_by_user_id' => $coordinatorUserId,
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $dependenciesCount++;
            }
        }

        return [
            'needs' => $needsCount,
            'invitations' => $invitationsCount,
            'dependencies' => $dependenciesCount,
        ];
    }

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>|null  $recipeDefinition
     * @return list<array{key: string, need_kind: string, title: string, description: string}>
     */
    private function nodesFor(
        ?string $recipe,
        array $source,
        int $quantity,
        ?array $recipeDefinition,
    ): array {
        unset($recipe);

        $primaryTitle = (string) $source['title'];
        $primaryKind = (string) $source['listing_type'] === 'product' ? 'product' : 'service';
        $quantityLabel = 'Quantity '.$quantity;
        $templates = (array) (($recipeDefinition['definition'] ?? [])['nodes'] ?? []);

        if ($templates === []) {
            return [[
                'key' => 'primary',
                'need_kind' => $primaryKind,
                'title' => $primaryTitle,
                'description' => "Primary listing need · {$quantityLabel} · provider agreement required",
            ]];
        }

        return array_values(array_map(
            static function (array $node) use ($primaryTitle, $primaryKind, $quantityLabel, $recipeDefinition): array {
                $needKind = (string) ($node['need_kind'] ?? '');
                if (($node['need_kind_template'] ?? null) === 'primary_listing' || $needKind === '') {
                    $needKind = $primaryKind;
                }

                $title = ($node['title_template'] ?? null) === 'primary_listing'
                    ? $primaryTitle
                    : (string) ($node['title'] ?? $primaryTitle);
                $description = str_replace(
                    '{quantity_label}',
                    $quantityLabel,
                    (string) ($node['description_template'] ?? 'Provider agreement required'),
                );

                return [
                    'key' => (string) ($node['key'] ?? 'primary'),
                    'need_kind' => $needKind,
                    'title' => $title,
                    'description' => $description,
                    'is_primary' => ($node['title_template'] ?? null) === 'primary_listing'
                        || ($node['need_kind_template'] ?? null) === 'primary_listing'
                        || ($node['key'] ?? '') === 'primary'
                        || ($node['key'] ?? '') === 'direct'
                        || $recipeDefinition === null,
                ];
            },
            $templates,
        ));
    }

    /**
     * @param  array<string, mixed>|null  $recipeDefinition
     * @return list<array{0: string, 1: string, 2: string}>
     */
    private function dependenciesFor(?array $recipeDefinition): array
    {
        if ($recipeDefinition === null) {
            return [];
        }

        return array_values(array_map(
            static fn (array $dependency): array => [
                (string) $dependency['predecessor'],
                (string) $dependency['successor'],
                (string) $dependency['condition_code'],
            ],
            (array) (($recipeDefinition['definition'] ?? [])['dependencies'] ?? []),
        ));
    }
}
