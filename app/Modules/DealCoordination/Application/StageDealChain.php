<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Application\ActorContext;
use App\Shared\Application\AuditRecorder;
use App\Shared\Application\DealChainCandidateRoleClassifier;
use App\Shared\Application\DealChainPlanDefinition;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\KernelException;
use App\Shared\Application\NotificationIntent;
use App\Shared\Application\OutboxWriter;
use App\Shared\Contracts\DealChainRecipeCatalogPort;
use App\Shared\Contracts\NotificationAttention;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

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

        return DB::transaction(function () use ($coordinatorUserId, $items, $idempotencyKey, $correlationId): array {
            $recipeCatalog = $this->catalog->published();
            $allPinned = true;
            foreach ($items as $item) {
                if (! is_string($item['listing_version_id'] ?? null) || $item['listing_version_id'] === '') {
                    $allPinned = false;
                    break;
                }
            }
            $resolvedItems = $allPinned ? null : $this->resolveItems($items, $coordinatorUserId, $recipeCatalog, $correlationId);
            $fingerprintItems = $allPinned
                ? array_map(static function (array $item) use ($recipeCatalog): array {
                    $recipe = $item['deal_chain'] ?? null;

                    return [
                        'listing_id' => strtolower((string) $item['id']),
                        'quantity' => (int) $item['quantity'],
                        'recipe' => $recipe,
                        'recipe_version' => $recipe === null ? 1 : ($recipeCatalog[$recipe]['catalog_version'] ?? 1),
                        'slot_overrides' => $item['slot_overrides'] ?? null,
                        'selection' => [
                            'listing_version_id' => (string) $item['listing_version_id'],
                            'variant_id' => $item['variant_id'] ?? null,
                            'package_id' => $item['package_id'] ?? null,
                            'addon_ids' => array_values((array) ($item['addon_ids'] ?? [])),
                            'deal_chain_combination_id' => $item['deal_chain_combination_id'] ?? null,
                            'quantity' => (int) $item['quantity'],
                        ],
                    ];
                }, $items)
                : array_map(static fn (array $item): array => [
                    'listing_id' => $item['source']['listing_id'] ?? $item['source']['id'],
                    'quantity' => $item['quantity'],
                    'recipe' => $item['recipe'],
                    'recipe_version' => $item['recipe_definition']['catalog_version'] ?? 1,
                    'slot_overrides' => $item['slot_overrides'] ?? null,
                    'selection' => $item['selection'],
                ], $resolvedItems);
            try {
                $reservation = $this->idempotency->begin(
                    scope: 'deal_chain.stage:'.$coordinatorUserId,
                    key: $idempotencyKey,
                    fingerprint: [
                        'operation' => 'deal_chain.stage',
                        'coordinator_user_id' => $coordinatorUserId,
                        'items' => $fingerprintItems,
                    ],
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
                return is_array($reservation->replayPayload) ? $reservation->replayPayload : [];
            }
            $resolvedItems ??= $this->resolveItems($items, $coordinatorUserId, $recipeCatalog, $correlationId);
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
                    item: $item,
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
     * @return list<array<string, mixed>>
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
            $terms = is_array($source['terms'] ?? null) ? $source['terms'] : [];
            $combination = null;
            $selection = [
                'listing_version_id' => (string) $source['listing_version_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'package_id' => $item['package_id'] ?? null,
                'addon_ids' => [],
                'deal_chain_combination_id' => $item['deal_chain_combination_id'] ?? null,
                'quantity' => (int) $item['quantity'],
            ];
            $selectionError = null;
            if (isset($item['listing_version_id']) && $item['listing_version_id'] !== (string) $source['listing_version_id']) {
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
                $combination = collect($terms['deal_chain_combinations'] ?? [])->first(
                    static fn (mixed $combo): bool => is_array($combo)
                        && (string) ($combo['id'] ?? '') === $selection['deal_chain_combination_id']
                );
                if ($combination === null) {
                    $selectionError = ['deal_chain_combination_id' => 'The saved Deal Chain combination is not part of this listing version.'];
                }
            }
            if ($selectionError === null && $combination !== null
                && (! is_string($item['listing_version_id'] ?? null) || $item['listing_version_id'] === '')) {
                $selectionError = ['listing_version_id' => 'Refresh the listing before choosing a saved partnership.'];
            }
            if ($selectionError === null && $combination !== null && $recipe !== null) {
                $selectionError = ['deal_chain' => 'Choose either a saved partnership or a catalog plan, not both.'];
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
                            && ($candidate['status'] ?? 'available') === 'available',
                    );
                    $listingType = (string) ($source['listing_type'] ?? '');
                    $productExtra = $listingType === 'product'
                        && ! array_key_exists('partner_role', $addon ?? [])
                        && ! array_key_exists('partner_fixture_keys', $addon ?? [])
                        && ! array_key_exists('settlement_mode', $addon ?? [])
                        && ! in_array(strtolower((string) ($addon['code'] ?? '')), [
                            'turnkey_parts',
                            'safety_audit',
                            'courier_delivery',
                            'product_install',
                        ], true);
                    if ($addon === null || ($listingType !== 'service' && ! $productExtra)) {
                        $selectionError = ['addon_ids' => 'A selected seller add-on is not available for this listing.'];
                        break;
                    }
                    $addonPriceMinor = filter_var($addon['price_amount_minor'] ?? null, FILTER_VALIDATE_INT);
                    if ($listingType === 'product' && ($addonPriceMinor === false || $addonPriceMinor < 0)) {
                        $selectionError = ['addon_ids' => 'A selected product extra has no authored price.'];

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

            try {
                if ($combination !== null) {
                    $plan = DealChainPlanDefinition::normalize($combination);
                    foreach ($plan['nodes'] as $nodeIndex => $node) {
                        $plan['nodes'][$nodeIndex]['need_kind'] = $node['is_primary']
                            ? (string) $source['listing_type']
                            : ($node['role'] === 'store' ? 'product' : 'service');
                        $plan['nodes'][$nodeIndex]['description'] = 'Saved partnership role · provider agreement required';
                    }
                } else {
                    $definition = $recipe === null ? null : ($recipeCatalog[$recipe] ?? null);
                    $plan = [
                        'nodes' => $this->nodesFor($recipe, $source, (int) $item['quantity'], $definition),
                        'dependencies' => $this->dependenciesFor($definition),
                        'recipe' => $recipe ?? 'direct_listing',
                        'recipe_version' => (int) ($definition['catalog_version'] ?? 1),
                    ];
                }
            } catch (InvalidArgumentException $error) {
                $errors["items.{$index}.deal_chain_combination_id"] = [$error->getMessage()];

                continue;
            }
            $nodeKeys = array_column($plan['nodes'], 'key');
            foreach (array_keys($slotOverrides ?? []) as $overrideKey) {
                if (! in_array((string) $overrideKey, $nodeKeys, true)) {
                    $errors["items.{$index}.slot_overrides.{$overrideKey}"] = ['Choose a stable node ID from the selected plan.'];
                }
            }
            $bindings = [];
            foreach ($plan['nodes'] as $node) {
                $override = $slotOverrides[$node['key']] ?? null;
                $binding = null;
                if ($node['is_primary']) {
                    if ($combination !== null && ($override !== null
                        || (($node['listing_id'] ?? null) !== null && $node['listing_id'] !== (string) $source['listing_id'])
                        || (($source['listing_type'] === 'product') !== ($node['role'] === 'store')))) {
                        $errors["items.{$index}.deal_chain_combination_id"] = ['The primary node must remain the listing you selected.'];

                        continue;
                    }
                    if ($combination !== null && ! DealChainCandidateRoleClassifier::matchesNeedRole(
                        $node['role'],
                        (string) $source['listing_type'],
                        (string) $source['category_code'],
                        (string) $source['title'],
                        (string) ($source['terms']['fixture_key'] ?? ''),
                    )) {
                        $errors["items.{$index}.deal_chain_combination_id"] = ['The primary node must match this listing’s provider role.'];

                        continue;
                    }
                    $binding = $source;
                } else {
                    $requiresChoice = $combination !== null && $node['assignment_mode'] !== 'preferred_partner';
                    $listingId = is_array($override) ? ($override['listing_id'] ?? null) : ($node['listing_id'] ?? null);
                    if ($requiresChoice && $override === null) {
                        $errors["items.{$index}.slot_overrides.{$node['key']}.listing_id"] = ['Choose a provider for this partnership role.'];

                        continue;
                    }
                    if (is_string($listingId) && $listingId !== '' && Str::isUuid($listingId)) {
                        $binding = $this->listingSource->findActiveApproved($listingId);
                    }
                    if ($binding === null && ($combination !== null || $override !== null)) {
                        $errors["items.{$index}.slot_overrides.{$node['key']}.listing_id"] = ['Choose an active provider listing for this role.'];

                        continue;
                    }
                    if ($binding !== null && ! DealChainCandidateRoleClassifier::matchesNeedRole(
                        $node['role'],
                        (string) $binding['listing_type'],
                        (string) $binding['category_code'],
                        (string) $binding['title'],
                        (string) ($binding['terms']['fixture_key'] ?? ''),
                    )) {
                        $errors["items.{$index}.slot_overrides.{$node['key']}.listing_id"] = ['Choose a listing matching this provider role.'];

                        continue;
                    }
                }
                if ($binding === null) {
                    continue;
                }
                if ((string) $binding['owner_user_id'] === $userId) {
                    $errors["items.{$index}.slot_overrides.{$node['key']}.listing_id"] = ['Choose a listing owned by another provider.'];

                    continue;
                }
                $candidateVersionId = is_array($override)
                    ? ($override['listing_version_id'] ?? $override['listingVersionId'] ?? null)
                    : ($node['listing_version_id'] ?? null);
                if (is_array($override)
                    && $candidateVersionId === null
                    && (string) ($override['listing_id'] ?? '') === (string) ($node['listing_id'] ?? '')) {
                    $candidateVersionId = $node['listing_version_id'] ?? null;
                }
                if ($candidateVersionId !== null
                    && (! is_string($candidateVersionId) || $candidateVersionId !== (string) $binding['listing_version_id'])) {
                    $errors["items.{$index}.slot_overrides.{$node['key']}.listing_version_id"] = [
                        'This partner listing changed. Refresh the partnership before staging.',
                    ];

                    continue;
                }
                $offer = $this->invitationScope($binding, (int) $item['quantity'], $node['is_primary'] ? $selection : [], $correlationId);
                if ($combination !== null && $offer['amount_minor'] === null) {
                    $errors["items.{$index}.slot_overrides.{$node['key']}.listing_id"] = ['Choose a listing with confirmed pricing before sending this partnership.'];

                    continue;
                }
                $bindings[$node['key']] = [
                    'provider_id' => (string) $binding['owner_user_id'],
                    'scope' => $offer,
                ];
            }

            $resolved[] = [
                'source' => $source,
                'quantity' => (int) $item['quantity'],
                'recipe' => $recipe,
                'recipe_definition' => $recipe === null ? null : $recipeCatalog[$recipe] ?? null,
                'slot_overrides' => $slotOverrides,
                'selection' => $selection,
                'plan' => $plan,
                'bindings' => $bindings,
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
     * @param  array<string, mixed>  $item
     * @return array{needs: int, invitations: int, dependencies: int}
     */
    private function appendPlan(
        string $dealChainId,
        string $coordinatorUserId,
        string $correlationId,
        CarbonInterface $now,
        int &$ordinal,
        array $item,
    ): array {
        $source = $item['source'];
        $plan = $item['plan'];
        $nodes = $plan['nodes'];
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
                'recipe_code' => $plan['recipe'],
                'recipe_version' => $plan['recipe_version'],
                'source_listing_id' => (string) ($source['listing_id'] ?? $source['id']),
                'need_kind' => $node['need_kind'],
                'title' => $item['bindings'][$node['key']]['scope']['title'] ?? $node['title'],
                'description' => $node['description'],
                'status' => 'open',
                'requested_at' => $now,
                'version' => 1,
                'correlation_id' => $correlationId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $needsCount++;

            $binding = $item['bindings'][$node['key']] ?? null;
            if ($binding !== null) {
                $invitationId = (string) Str::uuid7();
                $invitationScope = $binding['scope'];
                DB::table('deal_invitations')->insert([
                    'id' => $invitationId,
                    'deal_need_id' => $needId,
                    'invited_provider_user_id' => $binding['provider_id'],
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
                $invitedProviderUserId = $binding['provider_id'];
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

        foreach ($plan['dependencies'] as [$predecessor, $successor, $condition]) {
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
                $hasExplicitPrimary = array_key_exists('is_primary', $node);
                $legacyPrimary = ($node['title_template'] ?? null) === 'primary_listing'
                    || ($node['need_kind_template'] ?? null) === 'primary_listing';
                $isPrimary = $hasExplicitPrimary ? (bool) $node['is_primary'] : $legacyPrimary;

                $needKind = (string) ($node['need_kind'] ?? '');
                if ($isPrimary || ($needKind === '' && ! $hasExplicitPrimary)) {
                    $needKind = $primaryKind;
                }

                $title = $isPrimary || (! $hasExplicitPrimary && ($node['title_template'] ?? null) === 'primary_listing')
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
                    'is_primary' => $isPrimary,
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
