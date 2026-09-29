<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Modules\Catalogs\Application\DealChainCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use JsonException;

final class AdminDealChainCatalogController extends Controller
{
    /**
     * Display the Admin Deal Chain Studio with live catalog and partner candidates.
     */
    public function index(DealChainCatalog $catalog): InertiaResponse
    {
        return Inertia::render('Admin/Catalogs/DealChainStudio', [
            'dealChainCatalog' => $catalog->frontend(),
            'partnerCandidates' => $catalog->partnerListings(),
            'availableCategories' => [
                ['code' => 'repairs', 'name' => 'Repairs & Maintenance'],
                ['code' => 'local-services', 'name' => 'Local Trades & Services'],
                ['code' => 'greeting-cards', 'name' => 'Cards & Crafts'],
                ['code' => 'local-food', 'name' => 'Local Food & Bakery'],
                ['code' => 'crafts', 'name' => 'Handmade Crafts'],
                ['code' => 'print-assist', 'name' => 'Print & Office Assist'],
                ['code' => 'home-help', 'name' => 'Home & Yard Care'],
                ['code' => 'courier', 'name' => 'Express Courier & Transit'],
            ],
        ]);
    }

    /**
     * Create and publish a brand new deal chain recipe archetype.
     *
     * @throws JsonException|ValidationException
     */
    public function storeRecipe(Request $request, DealChainCatalog $catalog): RedirectResponse|JsonResponse
    {
        $validated = $this->validateRecipePayload($request, isNew: true);
        $recipeCode = Str::snake(strtolower(trim((string) $validated['recipe_code'])));

        return $this->persistNewVersion($recipeCode, $validated, $request);
    }

    /**
     * Increment catalog version and publish an updated deal chain recipe.
     *
     * @throws JsonException|ValidationException
     */
    public function publishRecipe(Request $request, string $recipeCode, DealChainCatalog $catalog): RedirectResponse|JsonResponse
    {
        $normalizedCode = Str::snake(strtolower(trim($recipeCode)));
        $validated = $this->validateRecipePayload($request, isNew: false);

        return $this->persistNewVersion($normalizedCode, $validated, $request);
    }

    /**
     * Validate the recipe payload and verify DAG acyclicity.
     *
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    private function validateRecipePayload(Request $request, bool $isNew): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:160'],
            'pattern' => ['required', 'string', 'max:60'],
            'description' => ['required', 'string', 'max:600'],
            'category_codes' => ['required', 'array', 'min:1'],
            'category_codes.*' => ['required', 'string', 'max:60'],
            'listing_types' => ['required', 'array', 'min:1'],
            'listing_types.*' => ['required', 'string', 'in:service,product'],
            'work_shapes' => ['required', 'array', 'min:1'],
            'work_shapes.*' => ['required', 'string', 'max:20'],
            'extra_fee_amount_minor' => ['required', 'integer', 'min:0', 'max:100000000'],
            'nodes' => ['required', 'array', 'min:2', 'max:16'],
            'nodes.*.key' => ['required', 'string', 'max:60'],
            'nodes.*.need_kind' => ['nullable', 'string', 'max:60'],
            'nodes.*.title' => ['required', 'string', 'max:160'],
            'nodes.*.description_template' => ['nullable', 'string', 'max:300'],
            'nodes.*.frontend' => ['required', 'array'],
            'nodes.*.frontend.role' => ['required', 'string', 'max:80'],
            'nodes.*.frontend.title' => ['required', 'string', 'max:160'],
            'nodes.*.frontend.sub' => ['nullable', 'string', 'max:160'],
            'nodes.*.frontend.type' => ['required', 'string', 'in:store,delivery,labor,audit'],
            'nodes.*.slot_requirement' => ['nullable', 'array'],
            'nodes.*.slot_requirement.role' => ['nullable', 'string', 'max:60'],
            'nodes.*.slot_requirement.capability_codes' => ['nullable', 'array'],
            'nodes.*.slot_requirement.default_assignment_mode' => ['nullable', 'string', 'in:preferred_partner,open_pool,buyer_choice'],
            'nodes.*.slot_requirement.estimated_fee_minor' => ['nullable', 'integer', 'min:0'],
            'dependencies' => ['present', 'array'],
            'dependencies.*.predecessor' => ['required', 'string', 'max:60'],
            'dependencies.*.successor' => ['required', 'string', 'max:60'],
            'dependencies.*.condition_code' => ['required', 'string', 'max:60'],
            'dependencies.*.allow_bypass' => ['nullable', 'boolean'],
        ];

        if ($isNew) {
            $rules['recipe_code'] = ['required', 'string', 'regex:/^[a-z0-9_]+$/', 'max:60'];
        }

        $validated = $request->validate($rules);

        // Verify Node Keys Uniqueness
        $nodeKeys = [];
        foreach ($validated['nodes'] as $index => $node) {
            $key = (string) $node['key'];
            if (isset($nodeKeys[$key])) {
                throw ValidationException::withMessages([
                    "nodes.{$index}.key" => "Duplicate node key '{$key}'. Every step in a deal chain must have a unique key.",
                ]);
            }
            $nodeKeys[$key] = true;
        }

        // Verify Agnostic Dependencies and Acyclicity
        $this->verifyAcyclicGraph(
            nodeKeys: array_keys($nodeKeys),
            dependencies: (array) ($validated['dependencies'] ?? []),
        );

        return $validated;
    }

    /**
     * Enforce that directed edges reference valid nodes and form a strict Directed Acyclic Graph (DAG).
     *
     * @param  list<string>  $nodeKeys
     * @param  list<array{predecessor: string, successor: string, condition_code: string}>  $dependencies
     *
     * @throws ValidationException
     */
    private function verifyAcyclicGraph(array $nodeKeys, array $dependencies): void
    {
        $nodeSet = array_flip($nodeKeys);
        $adj = [];
        $inDegree = [];

        foreach ($nodeKeys as $k) {
            $adj[$k] = [];
            $inDegree[$k] = 0;
        }

        foreach ($dependencies as $idx => $dep) {
            $from = (string) $dep['predecessor'];
            $to = (string) $dep['successor'];

            if (! isset($nodeSet[$from])) {
                throw ValidationException::withMessages([
                    "dependencies.{$idx}.predecessor" => "Predecessor node '{$from}' does not exist in nodes list.",
                ]);
            }

            if (! isset($nodeSet[$to])) {
                throw ValidationException::withMessages([
                    "dependencies.{$idx}.successor" => "Successor node '{$to}' does not exist in nodes list.",
                ]);
            }

            if ($from === $to) {
                throw ValidationException::withMessages([
                    "dependencies.{$idx}" => "Self-referencing dependency cycle detected on node '{$from}'.",
                ]);
            }

            $adj[$from][] = $to;
            $inDegree[$to]++;
        }

        // Kahn's Algorithm for Topological Sort / Cycle Detection
        $queue = [];
        foreach ($nodeKeys as $k) {
            if ($inDegree[$k] === 0) {
                $queue[] = $k;
            }
        }

        $visitedCount = 0;
        while ($queue !== []) {
            $curr = array_shift($queue);
            $visitedCount++;

            foreach ($adj[$curr] as $neighbor) {
                $inDegree[$neighbor]--;
                if ($inDegree[$neighbor] === 0) {
                    $queue[] = $neighbor;
                }
            }
        }

        if ($visitedCount !== count($nodeKeys)) {
            throw ValidationException::withMessages([
                'dependencies' => 'Acyclic graph violation: deal chain dependencies contain a cycle or loop.',
            ]);
        }
    }

    /**
     * Insert a new immutable version in deal_chain_catalog_versions.
     *
     * @param  array<string, mixed>  $payload
     *
     * @throws JsonException
     */
    private function persistNewVersion(string $recipeCode, array $payload, Request $request): RedirectResponse|JsonResponse
    {
        $currentMaxVersion = DB::table('deal_chain_catalog_versions')
            ->where('recipe_code', $recipeCode)
            ->max('catalog_version');

        $nextVersion = ((int) ($currentMaxVersion ?? 0)) + 1;

        $patternCapsule = array_values(array_map(
            static fn (array $n): string => strtoupper((string) ($n['frontend']['type'] ?? 'LABOR')),
            (array) $payload['nodes'],
        ));

        $normalizedNodes = array_values(array_map(
            static function (array $n): array {
                $nodeData = [
                    'key' => (string) $n['key'],
                    'need_kind' => (string) ($n['need_kind'] ?? ($n['frontend']['type'] === 'store' ? 'product' : 'service')),
                    'title' => (string) $n['title'],
                    'description_template' => (string) ($n['description_template'] ?? "{$n['title']} · provider agreement required"),
                    'frontend' => [
                        'role' => (string) $n['frontend']['role'],
                        'title' => (string) $n['frontend']['title'],
                        'sub' => (string) ($n['frontend']['sub'] ?? 'Provider agreement required'),
                        'type' => (string) $n['frontend']['type'],
                    ],
                ];

                if (isset($n['slot_requirement']) && is_array($n['slot_requirement'])) {
                    $nodeData['slot_requirement'] = $n['slot_requirement'];
                }

                if (isset($n['listing_id']) && is_string($n['listing_id'])) {
                    $nodeData['listing_id'] = $n['listing_id'];
                }

                if (isset($n['provider_name']) && is_string($n['provider_name'])) {
                    $nodeData['provider_name'] = $n['provider_name'];
                }

                if (isset($n['price_minor']) && is_numeric($n['price_minor'])) {
                    $nodeData['price_minor'] = (int) $n['price_minor'];
                }

                return $nodeData;
            },
            (array) $payload['nodes'],
        ));

        $normalizedDependencies = array_values(array_map(
            static fn (array $d): array => [
                'predecessor' => (string) $d['predecessor'],
                'successor' => (string) $d['successor'],
                'condition_code' => (string) $d['condition_code'],
                'allow_bypass' => (bool) ($d['allow_bypass'] ?? false),
            ],
            (array) $payload['dependencies'],
        ));

        $definition = [
            'pattern_capsule' => $patternCapsule,
            'nodes' => $normalizedNodes,
            'dependencies' => $normalizedDependencies,
        ];

        $now = now();
        $id = (string) Str::uuid7();

        DB::table('deal_chain_catalog_versions')->insert([
            'id' => $id,
            'recipe_code' => $recipeCode,
            'catalog_version' => $nextVersion,
            'title' => (string) $payload['title'],
            'pattern' => (string) $payload['pattern'],
            'description' => (string) $payload['description'],
            'status' => 'published',
            'category_codes' => json_encode(array_values((array) $payload['category_codes']), JSON_THROW_ON_ERROR),
            'listing_types' => json_encode(array_values((array) $payload['listing_types']), JSON_THROW_ON_ERROR),
            'work_shapes' => json_encode(array_values((array) $payload['work_shapes']), JSON_THROW_ON_ERROR),
            'extra_fee_amount_minor' => (int) $payload['extra_fee_amount_minor'],
            'currency' => 'PHP',
            'rating' => 5.0,
            'booked_count' => 0,
            'definition' => json_encode($definition, JSON_THROW_ON_ERROR),
            'payload_version' => 1,
            'correlation_id' => (string) Str::uuid7(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $message = "Published recipe '{$payload['title']}' as version {$nextVersion} successfully.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'recipe_code' => $recipeCode,
                'catalog_version' => $nextVersion,
                'message' => $message,
            ], 201);
        }

        return redirect()->route('admin.catalogs.deal-chains')->with('status', $message);
    }
}
