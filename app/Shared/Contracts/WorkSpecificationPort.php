<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

/**
 * Shared port for deterministic Work node normalization, structural signature hashing,
 * 1-to-many category/listing-type variation compounding, and fast option lookup.
 */
interface WorkSpecificationPort
{
    /**
     * @param  array<int, array<string, mixed>>  $rawSteps
     * @return list<array{
     *     id: string,
     *     ordinal: int,
     *     title: string,
     *     description: string,
     *     node_kind: string,
     *     evidence_type: string,
     *     evidence_description: string,
     *     control_mode: string,
     *     mandatory: bool,
     *     duration_label: string|null
     * }>
     */
    public function normalizeNodes(array $rawSteps, string $workShape = 'A1'): array;

    /**
     * @param  array<int, array<string, mixed>>  $nodes
     */
    public function computeSignature(string $workShape, array $nodes): string;

    /**
     * @param  array<int, array<string, mixed>>  $rawStages
     * @return array{
     *     signature_hash: string,
     *     work_shape: string,
     *     catalog_code: string,
     *     based_on_catalog_code: string|null,
     *     is_custom_variation: bool,
     *     category_code: string,
     *     listing_type: string,
     *     nodes: list<array<string, mixed>>
     * }
     */
    public function resolveAndRecordListingWork(
        string $workShape,
        string $categoryCode,
        string $listingType,
        string $listingTitle,
        array $rawStages,
        ?string $selectedCatalogCode = null,
    ): array;

    /**
     * @return array{
     *     recommended: list<array<string, mixed>>,
     *     other_archetypes: list<array<string, mixed>>
     * }
     */
    public function optionsFor(?string $categoryCode = null, ?string $listingType = null): array;

    /**
     * @return array<string, mixed>|null
     */
    public function publishedForShape(string $shape): ?array;
}
