<?php

declare(strict_types=1);

namespace App\Shared\Application;

use Illuminate\Support\Str;
use InvalidArgumentException;

final class DealChainPlanDefinition
{
    public const VERSION = 1;

    public const CONDITIONS = ['part_ready', 'delivery_signed', 'work_completed'];

    private const MAX_NODES = 16;

    /**
     * @param  array<string, mixed>  $combination
     * @return array{
     *     nodes: list<array{key: string, role: string, title: string, listing_id: ?string, listing_version_id: ?string, assignment_mode: string, is_primary: bool}>,
     *     dependencies: list<array{0: string, 1: string, 2: string}>,
     *     recipe: string,
     *     recipe_version: int
     * }
     */
    public static function normalize(array $combination): array
    {
        if (($combination['planVersion'] ?? null) !== self::VERSION) {
            throw new InvalidArgumentException('Review and save this partnership using the current plan format.');
        }
        $rawNodes = $combination['nodes'] ?? null;
        $rawDependencies = $combination['dependencies'] ?? null;
        if (! is_array($rawNodes) || ! array_is_list($rawNodes)
            || $rawNodes === [] || count($rawNodes) > self::MAX_NODES
            || ! is_array($rawDependencies) || ! array_is_list($rawDependencies)
            || count($rawDependencies) > 120) {
            throw new InvalidArgumentException('A partnership needs a bounded node list and explicit dependency rules.');
        }

        $nodes = [];
        $primaryCount = 0;
        foreach ($rawNodes as $node) {
            if (! is_array($node) || ! self::validKey($node['id'] ?? null)
                || ! is_bool($node['isPrimary'] ?? null)
                || ! is_string($node['type'] ?? null)) {
                throw new InvalidArgumentException('Each partnership node needs a stable ID, type and explicit primary marker.');
            }
            $key = $node['id'];
            if (isset($nodes[$key])) {
                throw new InvalidArgumentException('Partnership node IDs must be unique.');
            }
            $role = match (strtolower($node['type'])) {
                'store', 'parts', 'product' => 'store',
                'delivery', 'courier' => 'courier',
                'labor', 'service', 'installation', 'diagnostic', 'tools' => 'labor',
                'audit' => 'audit',
                'recycle', 'hauling' => 'recycle',
                default => null,
            };
            if ($role === null) {
                throw new InvalidArgumentException('This partnership contains an unsupported provider role.');
            }
            if (($node['allowBypass'] ?? false) !== false) {
                throw new InvalidArgumentException('This partnership cannot enable an ungoverned dependency bypass.');
            }
            $editorCondition = $node['conditionCode'] ?? null;
            if ($editorCondition !== null
                && ! in_array($editorCondition, [...self::CONDITIONS, 'all_inputs_ready'], true)) {
                throw new InvalidArgumentException('This partnership contains an unsupported execution condition.');
            }
            $listingId = $node['listingId'] ?? null;
            if ($listingId !== null && (! is_string($listingId) || ! Str::isUuid($listingId))) {
                throw new InvalidArgumentException('Choose a valid listing reference for the partnership role.');
            }
            $listingVersionId = $node['listingVersionId'] ?? $node['listing_version_id'] ?? null;
            if ($listingVersionId !== null && (! is_string($listingVersionId) || ! Str::isUuid($listingVersionId))) {
                throw new InvalidArgumentException('Refresh the selected partner listing before saving this partnership.');
            }
            $mode = $node['assignmentMode'] ?? ($listingId === null ? 'buyer_choice' : 'preferred_partner');
            if (! in_array($mode, ['preferred_partner', 'open_pool', 'buyer_choice'], true)) {
                throw new InvalidArgumentException('This partnership contains an unsupported assignment mode.');
            }
            if (($node['isOpenSlot'] ?? false) === true) {
                $mode = 'buyer_choice';
            }
            $primary = $node['isPrimary'];
            if ($primary) {
                $primaryCount++;
            }
            $nodes[$key] = [
                'key' => $key,
                'role' => $role,
                'title' => is_string($node['title'] ?? null) ? $node['title'] : 'Partner',
                'listing_id' => $listingId,
                'listing_version_id' => $listingVersionId,
                'assignment_mode' => $mode,
                'is_primary' => $primary,
            ];
        }
        if ($primaryCount !== 1) {
            throw new InvalidArgumentException('A partnership must have exactly one primary listing node.');
        }

        $dependencies = [];
        $pairs = [];
        $degrees = array_fill_keys(array_keys($nodes), 0);
        $successors = array_fill_keys(array_keys($nodes), []);
        foreach ($rawDependencies as $edge) {
            if (! is_array($edge)) {
                throw new InvalidArgumentException('Each partnership dependency must name its two nodes and condition.');
            }
            if (($edge['status'] ?? 'active') === 'removed') {
                continue;
            }
            $predecessor = $edge['predecessorId'] ?? null;
            $successor = $edge['successorId'] ?? null;
            $condition = $edge['conditionCode'] ?? null;
            if (($edge['status'] ?? 'active') !== 'active'
                || ($edge['dependencyType'] ?? null) !== 'blocks'
                || ! self::validKey($predecessor) || ! self::validKey($successor)
                || ! isset($nodes[$predecessor], $nodes[$successor])
                || $predecessor === $successor
                || ! in_array($condition, self::CONDITIONS, true)
                || ($edge['allowBypass'] ?? false) !== false) {
                throw new InvalidArgumentException('A partnership dependency has an invalid endpoint or unsupported rule.');
            }
            if (($condition === 'part_ready' && $nodes[$predecessor]['role'] !== 'store')
                || ($condition === 'delivery_signed' && $nodes[$predecessor]['role'] !== 'courier')) {
                throw new InvalidArgumentException('The dependency condition does not match its source role.');
            }
            $pair = $predecessor."\0".$successor;
            if (isset($pairs[$pair])) {
                throw new InvalidArgumentException('Use one explicit condition for each partnership link.');
            }
            $pairs[$pair] = true;
            $degrees[$successor]++;
            $successors[$predecessor][] = $successor;
            $dependencies[] = [$predecessor, $successor, $condition];
        }

        $ready = [];
        foreach ($degrees as $key => $degree) {
            if ($degree === 0) {
                $ready[] = $key;
            }
        }
        $visited = 0;
        for ($index = 0; $index < count($ready); $index++) {
            $visited++;
            foreach ($successors[$ready[$index]] as $successor) {
                $degrees[$successor]--;
                if ($degrees[$successor] === 0) {
                    $ready[] = $successor;
                }
            }
        }
        if ($visited !== count($nodes)) {
            throw new InvalidArgumentException('Partnership dependencies cannot form a cycle.');
        }

        return [
            'nodes' => array_values($nodes),
            'dependencies' => $dependencies,
            'recipe' => is_string($combination['recipeId'] ?? null) && $combination['recipeId'] !== ''
                ? $combination['recipeId'] : 'saved_listing',
            'recipe_version' => is_int($combination['catalogVersion'] ?? null) && $combination['catalogVersion'] > 0
                ? $combination['catalogVersion'] : 1,
        ];
    }

    /** @return list<string> */
    public static function eventTypesForCondition(string $condition): array
    {
        return match ($condition) {
            'part_ready' => ['work.ready_for_collection'],
            'delivery_signed' => ['work.delivered_to_site', 'work.completed'],
            'work_completed' => ['work.completed'],
            default => [],
        };
    }

    private static function validKey(mixed $key): bool
    {
        return is_string($key) && preg_match('/^[A-Za-z0-9_-]{1,191}$/D', $key) === 1;
    }
}
