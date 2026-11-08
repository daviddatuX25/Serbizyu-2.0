<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\Listings\Application\UpdateListingDraft;
use App\Shared\Application\ResourceActor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class SavedPartnershipQaSeeder extends Seeder
{
    private const PASSWORD = 'SavedPlanQaOnly-2026!';

    private const ACCOUNTS = [
        'buyer' => ['id' => '019b0000-0000-7000-8000-000000000001', 'phone' => '+639170000101', 'email' => 'savedplan-buyer@example.test', 'name' => 'Saved Plan QA Buyer', 'role' => 'buy'],
        'primary' => ['id' => '019b0000-0000-7000-8000-000000000002', 'phone' => '+639170000102', 'email' => 'savedplan-primary@example.test', 'name' => 'Saved Plan QA Primary Provider', 'role' => 'provide'],
        'partner' => ['id' => '019b0000-0000-7000-8000-000000000003', 'phone' => '+639170000103', 'email' => 'savedplan-partner@example.test', 'name' => 'Saved Plan QA Partner Provider', 'role' => 'provide'],
    ];

    public function run(CreateListingDraft $create, UpdateListingDraft $update): void
    {
        $environment = (string) config('app.env');
        $database = (string) DB::connection()->getDatabaseName();
        if (! in_array($environment, ['local', 'testing'], true)
            || ! str_starts_with($database, 'serbizyu_savedplan_qa_')
            || (string) config('serbizyu.providers.payment.mode') !== 'disabled'
            || (string) config('serbizyu.providers.notifications.mode') !== 'disabled'
            || ! in_array((string) config('serbizyu.providers.evidence.mode'), ['local', 'disabled'], true)) {
            throw new RuntimeException('SavedPlan QA seeding requires local/testing, a serbizyu_savedplan_qa_* database, and disabled provider modes.');
        }
        if (! Schema::hasTable('users') || ! Schema::hasTable('listings') || ! Schema::hasTable('listing_versions')) {
            throw new RuntimeException('Run migrations before SavedPlan QA seeding.');
        }

        foreach (self::ACCOUNTS as $account) {
            if (User::query()->where('id', $account['id'])->orWhere('phone_e164', $account['phone'])->orWhere('email', $account['email'])->exists()) {
                foreach (self::ACCOUNTS as $expected) {
                    if (! User::query()->where('id', $expected['id'])->where('email', $expected['email'])->where('phone_e164', $expected['phone'])->exists()) {
                        throw new RuntimeException('QA fixture identity collision or incomplete seed; no existing rows were changed. Use a new isolated QA database.');
                    }
                }
                if (! DB::table('listings')->where('owner_user_id', self::ACCOUNTS['primary']['id'])->exists()
                    || ! DB::table('listings')->where('owner_user_id', self::ACCOUNTS['partner']['id'])->exists()) {
                    throw new RuntimeException('Incomplete QA fixture; no rows were changed. Use a new isolated QA database.');
                }
                $this->command->info('SavedPlan QA fixture already exists; leaving every account and listing unchanged.');
                $this->printFixtureIds();

                return;
            }
        }

        [$primaryId, $partnerId] = DB::transaction(function () use ($create, $update): array {
            foreach (self::ACCOUNTS as $account) {
                $user = User::factory()->withEmailPassword($account['email'], self::PASSWORD)->create([
                    'id' => $account['id'],
                    'phone_e164' => $account['phone'],
                ]);
                DB::table('user_profiles')->where('user_id', $user->id)->update(['display_name' => $account['name']]);
                if (Schema::hasTable('role_assignments')) {
                    DB::table('role_assignments')->insert([
                        'id' => (string) Str::uuid7(), 'user_id' => $user->id, 'role_code' => $account['role'],
                        'status' => 'active', 'granted_by_user_id' => $user->id, 'effective_at' => now(), 'scope' => '{}',
                        'version' => 1, 'correlation_id' => (string) Str::uuid7(), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
            }

            $partnerId = $this->createListing($create, $update, self::ACCOUNTS['partner'], 'Saved Plan QA preferred follow-up labor', false);
            $primaryId = $this->createListing($create, $update, self::ACCOUNTS['primary'], 'Saved Plan QA primary labor', true, $partnerId);

            return [$primaryId, $partnerId];
        });
        $this->command->info('SavedPlan QA logins: savedplan-buyer@example.test (+639170000101), savedplan-primary@example.test (+639170000102), savedplan-partner@example.test (+639170000103); test-only password: '.self::PASSWORD);
        $this->command->info("Listings: primary={$primaryId}, partner={$partnerId}; combination=savedplan-qa-labor-followup-v1");
    }

    /** @param array{id:string,phone:string,email:string,name:string,role:string} $owner */
    private function createListing(CreateListingDraft $create, UpdateListingDraft $update, array $owner, string $title, bool $primary, ?string $partnerId = null): string
    {
        $actor = new ResourceActor($owner['id'], $owner['id']);
        $correlation = (string) Str::uuid7();
        $listing = $create->handle($actor, [
            'title' => $title, 'description' => 'Synthetic browser QA service; no real provider, payment, or fulfillment.',
            'category_code' => 'repairs', 'listing_type' => 'service', 'work_shape' => 'A1',
            'scope' => 'Synthetic saved partnership scenario', 'price_amount_minor' => $primary ? 25000 : 18000, 'currency' => 'PHP',
            'package_tiers' => [['id' => 'standard', 'title' => 'Standard', 'price' => $primary ? 250 : 180, 'sub' => 'QA service', 'inclusions' => ['One service']]],
            'addons' => [['id' => 'rush', 'code' => 'rush', 'title' => 'QA rush option', 'price_amount_minor' => 5000, 'status' => 'available']],
        ], $correlation);
        $id = (string) $listing['id'];
        if ($primary) {
            $update->handle($id, $actor, (int) $listing['version'], [
                'deal_chain_combinations' => [[
                    'id' => 'savedplan-qa-labor-followup-v1', 'title' => 'QA labor with preferred follow-up labor', 'planVersion' => 1,
                    'nodes' => [
                        ['id' => 'savedplan-qa-primary', 'type' => 'labor', 'title' => 'Primary labor', 'isPrimary' => true, 'listingId' => $id, 'assignmentMode' => 'preferred_partner'],
                        ['id' => 'savedplan-qa-followup', 'type' => 'labor', 'title' => 'Preferred follow-up labor', 'isPrimary' => false, 'listingId' => $partnerId, 'assignmentMode' => 'preferred_partner'],
                    ],
                    'dependencies' => [['id' => 'savedplan-qa-edge', 'predecessorId' => 'savedplan-qa-primary', 'successorId' => 'savedplan-qa-followup', 'conditionCode' => 'work_completed', 'dependencyType' => 'blocks', 'status' => 'active']],
                ]],
            ], $correlation);
        }
        DB::table('listings')->where('id', $id)->update(['status' => 'active', 'review_status' => 'approved', 'updated_at' => now()]);
        $version = (int) DB::table('listings')->where('id', $id)->value('current_version');
        DB::table('listing_versions')->where('listing_id', $id)->where('version_number', $version)->update(['published_at' => now()]);

        return $id;
    }

    private function printFixtureIds(): void
    {
        $this->command->info('Fixture identifiers: savedplan-buyer@example.test, savedplan-primary@example.test, savedplan-partner@example.test; combination=savedplan-qa-labor-followup-v1. Existing fixture rows are not rewritten.');
        foreach (['primary', 'partner'] as $role) {
            $id = DB::table('listings')->where('owner_user_id', self::ACCOUNTS[$role]['id'])->orderBy('created_at')->value('id');
            $this->command->info("{$role} listing: {$id}");
        }
    }
}
