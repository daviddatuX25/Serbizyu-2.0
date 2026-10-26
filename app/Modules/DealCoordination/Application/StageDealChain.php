<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\OutboxWriter;
use App\Shared\Application\NotificationIntent;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\DealChainRecipeCatalogPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class StageDealChain
{
    public function __construct(
        private readonly OrderListingSourcePort $listingSource,
        private readonly OrderCapacityPort $capacity,
        private readonly DealChainRecipeCatalogPort $catalog,
        private readonly IdempotencyGuard $idempotency,
        private readonly AuditRecorder $audits,
        private readonly OutboxWriter $outbox,
        private readonly NotificationsPort $notifications,
    ) {}

    /**
     * @param  array<int, array{id: string, quantity: int, deal_chain?: string|null, slot_overrides?: array<string, mixed>|null, listing_version_id?: string|null, variant_id?: string|null, package_id?: string|null, addon_ids?: list<string>, deal_chain_combination_id?: string|null}>  $items
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
                'recipe_version' => $it['recipe_definition']['catalog_version'] ?? 1,
                'slot_overrides' => $it['slot_overrides'] ?? null,
                'selection' => $it['selection'],
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
                    recipeVersion: (int) ($item['recipe_definition']['catalog_version'] ?? 1),
                    recipeDefinition: $item['recipe_definition'],
                    source: $item['source'],
                    quantity: $item['quantity'],
                    slotOverrides: $item['slot_overrides'] ?? null,
                    selection: $item['selection'],
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
     * @param  array<int, array{id: string, quantity: int, deal_chain?: string|null, slot_overrides?: array<string, mixed>|null, listing_version_id?: string|null, variant_id?: string|null, package_id?: string|null, addon_ids?: list<string>, deal_chain_combination_id?: string|null}>  $items
     * @param  array<string, array<string, mixed>>  $recipeCatalog
     * @return list<array{source: array<string, mixed>, quantity: int, recipe: string|null, recipe_definition: array<string, mixed>|null, slot_overrides: array<string, mixed>|null, selection: array<string, mixed>}>
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
            $slotOverrides = $item['slot_overrides'] ?? null;
            if ($slotOverrides !== null) {
                $nodeKeys = array_column(
                    $this->nodesFor($recipe, $source, (int) $item['quantity'], $recipe === null ? null : ($recipeCatalog[$recipe] ?? null)),
                    'key',
                );
                foreach (array_keys($slotOverrides) as $overrideKey) {
                    if (! in_array((string) $overrideKey, $nodeKeys, true)) {
                        $errors["items.{$index}.slot_overrides.{$overrideKey}"] = ['Choose a stable node key from this recipe.'];
                    }
                }
            }
            $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
            $selection = [
                'listing_version_id' => (string) ($source['listing_version_id'] ?? ''),
                'variant_id' => isset($item['variant_id']) && is_string($item['variant_id']) ? $item['variant_id'] : null,
                'package_id' => isset($item['package_id']) && is_string($item['package_id']) ? $item['package_id'] : null,
                'addon_ids' => [],
                'deal_chain_combination_id' => isset($item['deal_chain_combination_id']) && is_string($item['deal_chain_combination_id']) ? $item['deal_chain_combination_id'] : null,
                'quantity' => (int) $item['quantity'],
            ];
            $selectionError = null;
            if (isset($item['listing_version_id']) && $item['listing_version_id'] !== (string) ($source['listing_version_id'] ?? '')) {
                $selectionError = ['listing_version_id' => 'Listing terms changed. Refresh before staging.'];
            }
            if ($selectionError === null && $selection['variant_id'] !== null) {
                $variantMatches = (string) ($source['listing_type'] ?? '') === 'product'
                    && collect($terms['variants'] ?? [])->contains(
                        static fn (mixed $variant): bool => is_array($variant)
                            && (string) ($variant['id'] ?? '') === $selection['variant_id']
                    );
                if (! $variantMatches) {
                    $selectionError = ['variant_id' => 'The selected product variant is not part of this listing version.'];
                }
            }
            if ($selectionError === null && $selection['package_id'] !== null) {
                $packageMatches = collect($terms['package_tiers'] ?? [])->contains(
                    static fn (mixed $package): bool => is_array($package)
                        && (string) ($package['id'] ?? '') === $selection['package_id']
                );
                if (! $packageMatches) {
                    $selectionError = ['package_id' => 'The selected package is not part of this listing version.'];
                }
            }
            if ($selectionError === null && $selection['variant_id'] !== null && $selection['package_id'] !== null) {
                $selectionError = ['variant_id' => 'Choose either a variant or a package.'];
            }
            if ($selectionError === null && $selection['deal_chain_combination_id'] !== null) {
                $combinationMatches = collect($terms['deal_chain_combinations'] ?? [])->contains(
                    static fn (mixed $combo): bool => is_array($combo)
                        && (string) ($combo['id'] ?? '') === $selection['deal_chain_combination_id']
                );
                if (! $combinationMatches) {
                    $selectionError = ['deal_chain_combination_id' => 'The saved Deal Chain combination is not part of this listing version.'];
                }
            }
            $addonIds = $item['addon_ids'] ?? [];
            if ($selectionError === null && (! is_array($addonIds) || array_filter($addonIds, static fn (mixed $addonId): bool => ! is_string($addonId)) !== [])) {
                $selectionError = ['addon_ids' => 'Choose valid seller add-ons.'];
            }
            if ($selectionError === null) {
                foreach ($addonIds as $addonId) {
                    $addon = collect($terms['addons'] ?? [])->first(
                        static fn (mixed $candidate): bool => is_array($candidate)
                            && (string) ($candidate['id'] ?? '') === $addonId
                            && ($candidate['status'] ?? 'available') === 'available'
                    );
                    if ($addon === null || (string) ($source['listing_type'] ?? '') !== 'service') {
                        $selectionError = ['addon_ids' => 'A selected seller add-on is not available for this listing.'];
                        break;
                    }
                    $selection['addon_ids'][] = (string) $addon['id'];
                }
            }
            if ($selectionError !== null) {
                foreach ($selectionError as $field => $message) {
                    $errors["items.{$index}.{$field}"] = [$message];
                }

                continue;
            }

            $resolved[] = [
                'source' => $source,
                'quantity' => (int) $item['quantity'],
                'recipe' => $recipe,
                'recipe_definition' => $recipe === null ? null : $recipeCatalog[$recipe] ?? null,
                'slot_overrides' => $slotOverrides,
                'selection' => $selection,
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
     * @param  array<string, mixed>  $selection
     * @return array{needs: int, invitations: int, dependencies: int}
     */
    private function appendPlan(
        string $dealChainId,
        string $coordinatorUserId,
        string $correlationId,
        DateTimeInterface $now,
        int &$ordinal,
        ?string $recipe,
        int $recipeVersion,
        ?array $recipeDefinition,
        array $source,
        int $quantity,
        array $selection,
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
                'node_key' => $node['key'],
                'node_role' => $node['role'],
                'recipe_code' => $recipe ?? 'direct_listing',
                'recipe_version' => $recipeVersion,
                'source_listing_id' => (string) ($source['listing_id'] ?? $source['id']),
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

            $override = $slotOverrides[$node['key']] ?? null;
            $invitationListing = null;
            $invitationSelection = [];

            if ($node['is_primary']) {
                $invitationListing = $source;
                $invitationSelection = $selection;
            } elseif (is_array($override)) {
                $overrideListingId = (string) ($override['listing_id'] ?? '');
                $invitationListing = $overrideListingId !== ''
                    ? $this->listingSource->findActiveApproved($overrideListingId)
                    : null;

                if ($invitationListing === null || (string) $invitationListing['owner_user_id'] === $coordinatorUserId) {
                    throw new DealCoordinationError(
                        'PARTNER_LISTING_NOT_AVAILABLE',
                        'The selected partner listing is no longer available.',
                        $correlationId,
                        status: 422,
                        fieldErrors: ['slot_overrides.'.$node['key'].'.listing_id' => ['Choose an active listing owned by another provider.']],
                    );
                }
            }

            if ($invitationListing !== null) {
                $invitationId = (string) Str::uuid7();
                $invitationScope = $this->invitationScope(
                    $invitationListing,
                    $quantity,
                    $invitationSelection,
                    $correlationId,
                );
                DB::table('deal_invitations')->insert([
                    'id' => $invitationId,
                    'deal_need_id' => $needId,
                    'invited_provider_user_id' => (string) $invitationListing['owner_user_id'],
                    'invited_by_user_id' => $coordinatorUserId,
                    'acting_for_user_id' => null,
                    'purpose' => $node['is_primary'] ? 'primary_listing_assignment' : 'deal_need_assignment',
                    'scope' => json_encode($invitationScope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'payload_version' => 1,
                    'status' => 'sent',
                    'expires_at' => $now->copy()->addDays(2),
                    'version' => 1,
                    'correlation_id' => $correlationId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $invitedProviderUserId = (string) $invitationListing['owner_user_id'];
                $this->notifications->recordIntent(new NotificationIntent(
                    recipientUserId: $invitedProviderUserId,
                    eventSourceType: 'deal_need',
                    eventSourceId: $needId,
                    eventType: 'deal.invitation_received',
                    attention: NotificationAttention::NeedsAction,
                    title: 'Deal Chain invitation received',
                    body: 'Review the invitation and respond to the proposed terms.',
                    actionUrl: route('deal-invitations.index', [], false),
                    idempotencyKey: 'deal.invitation_received:'.$needId.':v1:'.$invitedProviderUserId,
                    correlationId: $correlationId,
                ));

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
     * @param  array<string, mixed>  $selection
     * @return array<string, mixed>
     */
    private function invitationScope(array $source, int $quantity, array $selection, string $correlationId): array
    {
        $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
        $selectedPrice = null;
        $variantId = $selection['variant_id'] ?? null;
        $packageId = $selection['package_id'] ?? null;

        if ((string) ($source['listing_type'] ?? '') === 'product' && $variantId === null && ($terms['variants'] ?? []) !== []) {
            foreach ($terms['variants'] as $candidate) {
                if (is_array($candidate) && ($candidate['is_default'] ?? $candidate['isDefault'] ?? false) === true) {
                    $selectedPrice = $candidate;
                    $variantId = (string) ($candidate['id'] ?? '');
                    break;
                }
            }
            if ($selectedPrice === null) {
                throw new DealCoordinationError(
                    'VARIANT_REQUIRED',
                    'Choose a product variant before staging this agreement.',
                    $correlationId,
                    status: 422,
                );
            }
        } elseif ($variantId !== null || $packageId !== null) {
            $collection = $variantId !== null ? ($terms['variants'] ?? []) : ($terms['package_tiers'] ?? []);
            $selectedId = $variantId ?? $packageId;
            $selectedPrice = collect($collection)->first(
                static fn (mixed $candidate): bool => is_array($candidate) && (string) ($candidate['id'] ?? '') === (string) $selectedId,
            );
        }

        $unitAmount = is_array($selectedPrice)
            ? (isset($selectedPrice['price_amount_minor'])
                ? (int) $selectedPrice['price_amount_minor']
                : (is_numeric($selectedPrice['price'] ?? null) ? (int) round((float) $selectedPrice['price'] * 100) : null))
            : (isset($source['price_amount_minor']) ? (int) $source['price_amount_minor'] : null);
        $addonIds = array_values(array_unique(array_map('strval', (array) ($selection['addon_ids'] ?? []))));
        sort($addonIds, SORT_STRING);
        $addonTotal = 0;
        foreach ($addonIds as $addonId) {
            $addon = collect($terms['addons'] ?? [])->first(
                static fn (mixed $candidate): bool => is_array($candidate) && (string) ($candidate['id'] ?? '') === $addonId,
            );
            $addonTotal += is_array($addon) ? (int) ($addon['price_amount_minor'] ?? 0) : 0;
        }
        if ($unitAmount !== null) {
            $unitAmount += $addonTotal;
        }

        $resourceKey = '';
        if ((string) ($source['listing_type'] ?? '') === 'product' && is_array($selectedPrice)) {
            $resourceKey = trim((string) ($selectedPrice['resource_key'] ?? $selectedPrice['id'] ?? ''));
        }

        $selection = [
            'listing_version_id' => (string) $source['listing_version_id'],
            'variant_id' => $variantId,
            'resource_key' => $resourceKey !== '' ? $resourceKey : null,
            'package_id' => $packageId,
            'addon_ids' => $addonIds,
            'deal_chain_combination_id' => $selection['deal_chain_combination_id'] ?? null,
        ];
        $currency = strtoupper((string) (is_array($selectedPrice) ? ($selectedPrice['currency'] ?? $source['currency'] ?? 'PHP') : ($source['currency'] ?? 'PHP')));
        $eligibleLanes = array_values(array_filter(
            $this->listingSource->eligiblePaymentLanesForVersion((string) $source['listing_version_id']),
            static fn (string $lane): bool => in_array($lane, ['external_cash', 'p2p_transfer', 'protected_digital'], true),
        ));
        $lane = in_array('external_cash', $eligibleLanes, true) ? 'external_cash' : ($eligibleLanes[0] ?? 'external_cash');
        $scope = [
            'listing_id' => (string) ($source['listing_id'] ?? $source['id']),
            'listing_version_id' => (string) $source['listing_version_id'],
            'listing_version' => (int) $source['listing_version_number'],
            'title' => (string) $source['title'],
            'listing_type' => (string) $source['listing_type'],
            'work_shape' => (string) ($source['work_shape'] ?? ''),
            'quantity' => $quantity,
            'unit_amount_minor' => $unitAmount,
            'amount_minor' => $unitAmount === null ? null : $unitAmount * $quantity,
            'currency' => $currency,
            'lane' => $lane,
            ...$selection,
        ];
        ksort($scope, SORT_STRING);
        $termsHash = hash('sha256', json_encode($scope, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $bucket = $this->capacity->findOpenQuantityBucket(
            (string) $scope['listing_id'],
            (string) $scope['listing_version_id'],
            $resourceKey,
        );
        $capacityHash = hash('sha256', json_encode([
            'listing_id' => $scope['listing_id'],
            'listing_version_id' => $scope['listing_version_id'],
            'resource_key' => $resourceKey,
            'quantity' => $quantity,
            'capacity_id' => $bucket['id'] ?? null,
            'remaining_quantity' => $bucket['remaining_quantity'] ?? null,
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return [...$scope, 'terms_hash' => $termsHash, 'capacity_hash' => $capacityHash];
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
                'role' => $primaryKind === 'product' ? 'store' : 'labor',
                'need_kind' => $primaryKind,
                'title' => $primaryTitle,
                'description' => "Primary listing need · {$quantityLabel} · provider agreement required",
                'is_primary' => true,
            ]];
        }

        return array_values(array_map(
            static function (array $node) use ($primaryTitle, $primaryKind, $quantityLabel): array {
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
                $frontendType = strtolower((string) data_get($node, 'frontend.type', ''));
                $role = match ($frontendType) {
                    'delivery', 'courier' => 'courier',
                    'store', 'product' => 'store',
                    'audit' => 'audit',
                    'recycle' => 'recycle',
                    'labor', 'service' => 'labor',
                    default => 'other',
                };

                return [
                    'key' => (string) ($node['key'] ?? ''),
                    'role' => $role,
                    'need_kind' => $needKind,
                    'title' => $title,
                    'description' => $description,
                    'is_primary' => ($node['title_template'] ?? null) === 'primary_listing'
                        || ($node['need_kind_template'] ?? null) === 'primary_listing',
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
