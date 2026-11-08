<?php

declare(strict_types=1);

use App\Modules\Listings\Application\CreateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (DB::connection()->getDatabaseName() !== 'serbizyu_pilot_qa_f04_20261103'
    || storage_path() !== '/tmp/serbizyu-controlled-pilot-qa-f04-20261103'
    || ! $app->environment('local') || config('serbizyu.providers.payment.mode') !== 'disabled'
    || config('serbizyu.providers.notifications.mode') !== 'disabled') {
    throw new RuntimeException('F04 fixture requires its explicit disposable target.');
}
$path = storage_path('app/private/f04-product-fixture.json');
if (is_file($path)) {
    if (getenv('F04_ADD_DIRECT_EXTRA') === '1') {
        $fixture = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $listing = DB::table('listings')->where('id', $fixture['product']['id'])->sole();
        if ($listing->status !== 'draft') {
            throw new RuntimeException('Extra precondition may only extend this private fixture draft.');
        }
        $version = DB::table('listing_versions')->where('listing_id', $listing->id)->where('version_number', $listing->current_version)->sole();
        $terms = json_decode($version->terms, true, flags: JSON_THROW_ON_ERROR);
        if (($terms['addons'] ?? []) === [] || array_key_exists('partner_role', $terms['addons'][0] ?? [])) {
            app(App\Modules\Listings\Application\UpdateListingDraft::class)->handle(
                (string) $listing->id,
                new ResourceActor((string) $listing->owner_user_id, (string) $listing->owner_user_id),
                (int) $listing->version,
                ['addons' => [['id' => 'f04-gift-wrap', 'code' => 'f04_gift_wrap', 'title' => 'Synthetic protective wrap', 'description' => 'Independent seller extra, not a partner fee.', 'price_amount_minor' => 3000, 'currency' => 'PHP', 'status' => 'available']]],
                (string) Str::uuid7(),
            );
            echo "Appended private product-extra precondition; original version retained.\n";
        }
    }
    echo "Existing F04 fixture retained without resets.\n";
    exit;
}
Artisan::call('db:seed', ['--class' => Database\Seeders\ControlledPilotQaSeeder::class, '--no-interaction' => true]);
echo Artisan::output();
$baseline = json_decode(file_get_contents(storage_path('app/private/serbizyu_pilot_qa_f04_20261103.json')), true, flags: JSON_THROW_ON_ERROR);
$actors = $baseline['actors'];

/** @return array{listing: array<string, mixed>, version: object} */
function f04Service(string $ownerId, string $title, ?int $price): array
{
    $input = ['title' => $title, 'description' => 'Synthetic F04 eligible partner only; no real service.', 'category_code' => 'repairs', 'listing_type' => 'service', 'work_shape' => 'A1'];
    if ($price !== null) {
        $input['price_amount_minor'] = $price;
        $input['currency'] = 'PHP';
        $input['package_tiers'] = [['id' => 'standard', 'title' => 'Synthetic service', 'price' => $price / 100]];
    }
    $listing = app(CreateListingDraft::class)->handle(new ResourceActor($ownerId, $ownerId), $input, (string) Str::uuid7());
    DB::table('listings')->where('id', $listing['id'])->update(['status' => 'active', 'review_status' => 'approved']);
    DB::table('listing_versions')->where('listing_id', $listing['id'])->update(['price_amount_minor' => $price, 'currency' => $price === null ? null : 'PHP', 'published_at' => now()]);
    return ['listing' => $listing, 'version' => DB::table('listing_versions')->where('listing_id', $listing['id'])->sole()];
}

$fixture = DB::transaction(function () use ($actors, $baseline): array {
    $audit = f04Service($actors['provider']['id'], 'F04 independent safety audit', 5000);
    $recycle = f04Service($actors['courier']['id'], 'F04 scrap recycle recovery', 2500);
    $unpriced = f04Service($actors['checker']['id'], 'F04 unpriced safety audit', null);
    $zero = f04Service($actors['maker']['id'], 'F04 zero-price recycle assessment', 0);
    $combo = [
        'id' => 'f04-audit-recycle', 'title' => 'Product with audit and recovery', 'icon' => 'ShieldCheck', 'description' => 'Independent synthetic audit and recovery agreements.', 'isDefault' => true,
        'planVersion' => 1, 'recipeId' => 'custom_chain', 'catalogVersion' => 1, 'isCustom' => true,
        'nodes' => [
            ['id' => 'product', 'role' => 'YOUR PRODUCT', 'title' => 'F04 product', 'sub' => 'Variant price', 'type' => 'store', 'bg' => '#ECFDF5', 'color' => '#059669', 'tier' => 0, 'isPrimary' => true],
            ['id' => 'audit', 'role' => 'AUDIT', 'title' => 'F04 independent safety audit', 'sub' => 'PHP 50', 'type' => 'audit', 'bg' => '#F3E8FF', 'color' => '#7E22CE', 'tier' => 1, 'isPrimary' => false, 'listingId' => $audit['listing']['id'], 'listingVersionId' => $audit['version']->id, 'feeMinor' => 5000, 'assignmentMode' => 'preferred_partner'],
            ['id' => 'recycle', 'role' => 'RECYCLE', 'title' => 'F04 scrap recycle recovery', 'sub' => 'PHP 25', 'type' => 'recycle', 'bg' => '#DCFCE7', 'color' => '#15803D', 'tier' => 2, 'isPrimary' => false, 'listingId' => $recycle['listing']['id'], 'listingVersionId' => $recycle['version']->id, 'feeMinor' => 2500, 'assignmentMode' => 'preferred_partner'],
        ],
        'slots' => [
            ['id' => 'audit', 'roleType' => 'AUDIT', 'slotLabel' => 'Audit', 'providerName' => 'F04 independent safety audit', 'fee' => 50, 'feeMinor' => 5000, 'listingId' => $audit['listing']['id'], 'listingVersionId' => $audit['version']->id, 'assignmentMode' => 'preferred_partner', 'rating' => null],
            ['id' => 'recycle', 'roleType' => 'RECYCLE', 'slotLabel' => 'Recovery', 'providerName' => 'F04 scrap recycle recovery', 'fee' => 25, 'feeMinor' => 2500, 'listingId' => $recycle['listing']['id'], 'listingVersionId' => $recycle['version']->id, 'assignmentMode' => 'preferred_partner', 'rating' => null],
        ],
        'dependencies' => [
            ['id' => 'product-audit', 'predecessorId' => 'product', 'successorId' => 'audit', 'conditionCode' => 'part_ready', 'dependencyType' => 'blocks', 'status' => 'active'],
            ['id' => 'audit-recycle', 'predecessorId' => 'audit', 'successorId' => 'recycle', 'conditionCode' => 'work_completed', 'dependencyType' => 'blocks', 'status' => 'active'],
        ],
    ];
    $variants = [['id' => 'compact', 'name' => 'Compact', 'price' => 125, 'stock' => 3, 'is_default' => false], ['id' => 'standard', 'name' => 'Standard', 'price' => 175, 'stock' => 8, 'is_default' => true]];
    $product = app(CreateListingDraft::class)->handle(new ResourceActor($actors['merchant']['id'], $actors['merchant']['id']), [
        'title' => 'F04 synthetic replaceable component', 'description' => 'Synthetic product role and fulfillment QA; no real goods or payment.',
        'category_code' => 'repairs', 'listing_type' => 'product', 'work_shape' => 'A4', 'price_amount_minor' => 17500, 'currency' => 'PHP',
        'variants' => $variants, 'inclusions' => ['Synthetic selected variant only'], 'prep_lead_time' => 'in_stock',
        'deal_chain_combinations' => [$combo], 'deal_chain_specification' => ['selected_combo_id' => 'f04-audit-recycle', 'based_on_recipe_code' => 'custom_chain', 'based_on_catalog_version' => 1, 'is_custom_variation' => true, 'combination_count' => 1],
    ], (string) Str::uuid7());
    $version = DB::table('listing_versions')->where('listing_id', $product['id'])->sole();
    return ['synthetic_only' => true, 'actors' => $actors, 'product' => $product, 'audit' => $audit, 'recycle' => $recycle, 'unpriced_audit' => $unpriced, 'zero_recycle' => $zero,
        'service_only_listing_id' => $baseline['listing_id'], 'original_version_id' => $version->id, 'original_terms_hash' => hash('sha256', $version->terms), 'original_variants' => $variants,
        'original_graph' => $combo, 'precondition' => 'Partner/service fixtures are published; product remains private draft until actual owner submit/staff approval.'];
});
umask(0077);
file_put_contents($path, json_encode($fixture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL);
chmod($path, 0600);
file_put_contents(storage_path('app/private/f04-access.json'), json_encode(['synthetic_only' => true, 'password' => config('serbizyu.qa.password')], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL);
chmod(storage_path('app/private/f04-access.json'), 0600);
echo "Private F04 product/partner fixture prepared; product is a draft.\n";
