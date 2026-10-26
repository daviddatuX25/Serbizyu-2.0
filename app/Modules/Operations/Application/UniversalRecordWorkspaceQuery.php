<?php

declare(strict_types=1);

namespace App\Modules\Operations\Application;

use App\Shared\Contracts\StaffAuditReaderPort;
use App\Shared\Contracts\StaffDealChainsReaderPort;
use App\Shared\Contracts\StaffEvidenceReaderPort;
use App\Shared\Contracts\StaffIdentityReaderPort;
use App\Shared\Contracts\StaffListingsReaderPort;
use App\Shared\Contracts\StaffOrdersReaderPort;
use App\Shared\Contracts\StaffPaymentsReaderPort;
use App\Shared\Contracts\StaffTendersReaderPort;
use App\Shared\Contracts\StaffTrustSupportReaderPort;

final class UniversalRecordWorkspaceQuery
{
    public function __construct(
        private readonly StaffOrdersReaderPort $orders,
        private readonly StaffPaymentsReaderPort $payments,
        private readonly StaffTrustSupportReaderPort $trustSupport,
        private readonly StaffListingsReaderPort $listings,
        private readonly StaffIdentityReaderPort $identity,
        private readonly StaffTendersReaderPort $tenders,
        private readonly StaffDealChainsReaderPort $dealChains,
        private readonly StaffEvidenceReaderPort $evidence,
        private readonly StaffAuditReaderPort $audit,
    ) {}

    /** @return array<string, mixed>|null */
    public function execute(string $referenceOrId): ?array
    {
        $record = null;
        foreach ([$this->orders, $this->payments, $this->trustSupport, $this->listings, $this->identity, $this->tenders, $this->dealChains] as $reader) {
            $record = $reader->resolve($referenceOrId);
            if ($record !== null) break;
        }
        if ($record === null) return null;

        $rails = array_merge(['agreement' => null, 'work' => null, 'payment' => null, 'case' => []], $record['rails'] ?? []);
        $siblings = [];
        $evidence = array_values($record['evidence'] ?? []);
        $conversations = [];
        $responsibility = $record['responsibility'] ?? null;
        $orderId = $record['order_id'] ?? null;
        $order = null;
        if ($orderId !== null && ($record['kind'] ?? null) !== 'order') {
            $order = $this->orders->resolve((string) $orderId);
            if ($order !== null) {
                $rails = $this->mergeRails($rails, $order['rails'] ?? []);
                $siblings[] = $this->sibling($order);
            }
        } elseif (($record['kind'] ?? null) === 'order') {
            $order = $record;
        }

        if ($orderId === null && $order !== null) $orderId = $order['id'] ?? null;
        $listingId = $order['listing_id'] ?? $record['listing_id'] ?? null;
        $rawStock = $listingId === null ? null : $this->listings->stockFactsForListing((string) $listingId);
        $stock = $rawStock === null ? null : $this->normalizeStockFacts($rawStock);
        if ($orderId !== null) {
            if (($record['kind'] ?? null) !== 'payment') {
                $paymentRail = $this->payments->primaryRailForOrder((string) $orderId);
                if ($paymentRail !== null) $rails['payment'] = $paymentRail;
            }
            $evidence = array_merge($evidence, $this->orders->evidenceForOrder((string) $orderId));
            $evidence = array_merge($evidence, $this->payments->evidenceForOrder((string) $orderId));
            $relatedCases = $this->trustSupport->casesForOrder((string) $orderId);
            foreach ($relatedCases as $relatedCase) {
                if ((string) ($relatedCase['id'] ?? '') === (string) ($record['case_id'] ?? $record['id'])) continue;
                $caseContext = $this->trustSupport->safeCaseWorkspace((string) ($relatedCase['case_id'] ?? $relatedCase['id']));
                $rails = $this->mergeRails($rails, $caseContext['rails'] ?? []);
                $conversations = array_merge($conversations, $caseContext['conversations'] ?? []);
                $caseEvidenceIds = $caseContext['evidence_ids'] ?? [];
                if ($caseEvidenceIds !== []) $evidence = array_merge($evidence, $this->evidence->metadataForIds($caseEvidenceIds));
            }
            if ($responsibility === null && $relatedCases !== []) $responsibility = $relatedCases[0]['responsibility'] ?? null;
            $chainId = $order['deal_chain_id'] ?? $record['deal_chain_id'] ?? null;
            if ($chainId !== null) {
                $chain = $this->dealChains->resolve((string) $chainId);
                if ($chain !== null) $siblings[] = $this->sibling($chain);
                foreach ($this->dealChains->currentChildOrderIds((string) $chainId) as $childOrderId) {
                    $child = $this->orders->resolve((string) $childOrderId);
                    if ($child !== null && (string) $child['id'] !== (string) ($order['id'] ?? '')) $siblings[] = $this->sibling($child);
                }
            }
        } elseif (($record['kind'] ?? null) === 'deal_chain') {
            foreach ($this->dealChains->currentChildOrderIds((string) $record['id']) as $childOrderId) {
                $child = $this->orders->resolve((string) $childOrderId);
                if ($child !== null) $siblings[] = $this->sibling($child);
            }
        }

        if (($record['kind'] ?? null) === 'case' || isset($record['case_id'])) {
            $caseContext = $this->trustSupport->safeCaseWorkspace((string) ($record['case_id'] ?? $record['id']));
            $rails = $this->mergeRails($rails, $caseContext['rails'] ?? []);
            $responsibility = $caseContext['responsibility'] ?? $responsibility;
            $conversations = $caseContext['conversations'] ?? [];
            $evidenceIds = $caseContext['evidence_ids'] ?? [];
            if ($evidenceIds !== []) $evidence = array_merge($evidence, $this->evidence->metadataForIds($evidenceIds));
        }

        $targets = [['target_type' => $this->auditTargetType((string) $record['kind']), 'target_id' => (string) $record['id']]];
        if ($orderId !== null && (string) $record['id'] !== (string) $orderId) $targets[] = ['target_type' => 'order', 'target_id' => (string) $orderId];
        foreach ($rails['case'] as $caseRail) {
            if (isset($caseRail['id'])) {
                $caseKind = (string) ($caseRail['kind'] ?? 'support_case');
                $targets[] = ['target_type' => $this->auditTargetType($caseKind), 'target_id' => (string) $caseRail['id']];
            }
        }
        $targetMap = [];
        foreach ($targets as $target) $targetMap[$target['target_type'].':'.$target['target_id']] = $target;
        $audit = $this->audit->forTargets(array_values($targetMap));
        $rails['case'] = $this->uniqueCaseRails(array_values($rails['case'] ?? []));
        $responsibility ??= ['party' => 'none', 'user_id' => null, 'label' => 'No current responsibility'];

        return [
            'id' => (string) $record['id'], 'kind' => (string) $record['kind'],
            'reference' => (string) $record['reference'], 'title' => (string) $record['title'],
            'version' => (int) ($record['version'] ?? 1), 'rails' => $rails,
            'stock' => $stock, 'siblings' => $this->uniqueSiblings($siblings),
            'responsibility' => $responsibility,
            'facts' => is_array($record['facts'] ?? null) ? $record['facts'] : [],
            'listing_details' => ($record['kind'] ?? null) === 'listing' && is_array($record['listing_details'] ?? null)
                ? $record['listing_details'] : null,
            'evidence' => $this->uniqueEvidence($evidence), 'conversations' => $conversations, 'audit' => $audit,
            'actions' => $record['actions'] ?? [
                'assign' => ['enabled' => false, 'reason' => 'Staff assignment commands are not available yet.'],
                'resolve' => ['enabled' => false, 'reason' => 'Case resolution commands are not available yet.'],
                'hold' => ['enabled' => false, 'reason' => 'Administrative hold commands are not available yet.'],
            ],
        ];
    }

    /** @param array<string, mixed> $current @param array<string, mixed> $addition @return array<string, mixed> */
    private function mergeRails(array $current, array $addition): array
    {
        foreach (['agreement', 'work', 'payment'] as $rail) {
            if (isset($addition[$rail]) && $addition[$rail] !== null) $current[$rail] = $addition[$rail];
        }
        if (isset($addition['case'])) {
            $cases = is_array($addition['case']) ? $addition['case'] : [$addition['case']];
            $current['case'] = array_merge($current['case'] ?? [], $cases);
        }
        return $current;
    }

    /** @param array<string, mixed> $facts @return array{state:string,label:string,facts:list<array{label:string,value:string}>} */
    private function normalizeStockFacts(array $facts): array
    {
        $buckets = $facts['buckets'] ?? [];
        $movements = collect($facts['latest_movements'] ?? [])->keyBy('resource_key');
        $states = array_values(array_unique(array_map(static fn (array $bucket): string => (string) $bucket['availability_status'], $buckets)));
        $state = $buckets === [] ? 'not_configured' : (count($states) === 1 ? $states[0] : 'mixed');
        $rows = [];
        foreach ($buckets as $bucket) {
            $resource = trim((string) ($bucket['resource_key'] ?? ''));
            $label = $resource === '' ? 'Default stock' : 'Variant '.$resource;
            $rows[] = ['label' => $label, 'value' => (string) ($bucket['availability_status'] ?? 'unknown')];
            if (isset($bucket['quantity'])) $rows[] = ['label' => $label.' on hand', 'value' => (string) $bucket['quantity']];
            if (isset($bucket['remaining_quantity'])) $rows[] = ['label' => $label.' available', 'value' => (string) $bucket['remaining_quantity']];
            $movement = $movements->get($resource);
            if ($movement !== null) {
                $rows[] = ['label' => $label.' held', 'value' => (string) $movement['held']];
                $rows[] = ['label' => $label.' committed', 'value' => (string) $movement['committed']];
            }
            if (($bucket['stock_policy'] ?? null) !== null) $rows[] = ['label' => $label.' policy', 'value' => (string) $bucket['stock_policy']];
        }
        return ['state' => $state, 'label' => 'Current listing stock', 'facts' => $rows];
    }

    /** @param array<string, mixed> $record @return array<string, mixed> */
    private function sibling(array $record): array
    {
        return [
            'id' => (string) $record['id'], 'kind' => (string) $record['kind'],
            'reference' => (string) $record['reference'], 'title' => (string) $record['title'],
            'state' => (string) $record['status'],
            'inspect_url' => '/admin/inspect?ref='.rawurlencode((string) $record['reference']),
        ];
    }

    /** @param list<array<string,mixed>> $siblings @return list<array<string,mixed>> */
    private function uniqueSiblings(array $siblings): array
    {
        $unique = [];
        foreach ($siblings as $sibling) $unique[(string) $sibling['id']] = $sibling;
        return array_values($unique);
    }

    /** @param list<array<string,mixed>> $rails @return list<array<string,mixed>> */
    private function uniqueCaseRails(array $rails): array
    {
        $unique = [];
        foreach ($rails as $rail) $unique[(string) ($rail['kind'] ?? $rail['label']).':'.(string) $rail['id']] = $rail;
        return array_values($unique);
    }

    /** @param list<array<string,mixed>> $evidence @return list<array<string,mixed>> */
    private function uniqueEvidence(array $evidence): array
    {
        $unique = [];
        foreach ($evidence as $item) $unique[(string) $item['id']] = $item;
        return array_values($unique);
    }

    private function auditTargetType(string $kind): string
    {
        return match ($kind) {
            'payment' => 'payment_obligation',
            'case' => 'support_case',
            'identity_verification' => 'identity_verification',
            'deal_chain' => 'deal_chain',
            default => $kind,
        };
    }
}
