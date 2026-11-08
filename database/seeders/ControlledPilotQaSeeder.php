<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Listings\Application\CreateListingDraft;
use App\Modules\OrdersWork\Application\SubmitOrderProposal;
use App\Shared\Application\IdempotencyGuard;
use App\Shared\Application\ResourceActor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class ControlledPilotQaSeeder extends Seeder
{
    private const DATABASE_PREFIX = 'serbizyu_pilot_qa_';

    private const APPROVED_STORAGE_PREFIX = '/tmp/serbizyu-controlled-pilot-qa-';

    private const PROVENANCE_SCOPE = 'controlled-pilot-qa-f01';

    private const PROVENANCE_KEY = 'controlled-pilot-baseline-v1';

    private const FIXTURE = [
        'buyer' => ['id' => '019b0000-0000-7100-8000-000000000101', 'phone' => '+639170001101', 'email' => 'pilot-f01-buyer@example.test', 'name' => 'Pilot QA Buyer', 'role' => 'buy'],
        'provider' => ['id' => '019b0000-0000-7100-8000-000000000102', 'phone' => '+639170001102', 'email' => 'pilot-f01-provider@example.test', 'name' => 'Pilot QA Provider', 'role' => 'provide'],
        'merchant' => ['id' => '019b0000-0000-7100-8000-000000000103', 'phone' => '+639170001103', 'email' => 'pilot-f01-merchant@example.test', 'name' => 'Pilot QA Merchant', 'role' => 'merchant'],
        'courier' => ['id' => '019b0000-0000-7100-8000-000000000104', 'phone' => '+639170001104', 'email' => 'pilot-f01-courier@example.test', 'name' => 'Pilot QA Courier', 'role' => 'provide'],
        'maker' => ['id' => '019b0000-0000-7100-8000-000000000105', 'phone' => '+639170001105', 'email' => 'pilot-f01-maker@example.test', 'name' => 'Pilot QA Staff Maker', 'role' => 'admin'],
        'checker' => ['id' => '019b0000-0000-7100-8000-000000000106', 'phone' => '+639170001106', 'email' => 'pilot-f01-checker@example.test', 'name' => 'Pilot QA Staff Checker', 'role' => 'operate'],
        'suspended_staff' => ['id' => '019b0000-0000-7100-8000-000000000107', 'phone' => '+639170001107', 'email' => 'pilot-f01-suspended@example.test', 'name' => 'Pilot QA Suspended Staff', 'role' => 'admin', 'status' => 'suspended'],
        'expired_staff' => ['id' => '019b0000-0000-7100-8000-000000000108', 'phone' => '+639170001108', 'email' => 'pilot-f01-expired@example.test', 'name' => 'Pilot QA Expired Staff', 'role' => 'admin', 'expired' => true],
    ];

    public function run(CreateListingDraft $create, SubmitOrderProposal $propose, IdempotencyGuard $idempotency): void
    {
        $this->preflight();
        $password = (string) config('serbizyu.qa.password');
        if ($password === '') {
            throw new RuntimeException('Set SERBIZYU_QA_PASSWORD for controlled pilot QA seeding.');
        }
        $database = (string) DB::connection()->getDatabaseName();
        $recordPath = storage_path('app/private/'.$database.'.json');
        DB::select('SELECT pg_advisory_lock(hashtext(?))', [self::PROVENANCE_SCOPE]);
        try {

            $manifest = DB::transaction(function () use ($create, $propose, $idempotency, $password): array {
                $this->preflightIdentitiesAndResources();
                $correlationId = '019b0000-0000-7100-8000-000000000199';
                $users = $this->ensureActors($password);
                $provenance = $idempotency->begin(self::PROVENANCE_SCOPE, self::PROVENANCE_KEY, ['fixture' => 'controlled-pilot-f01-v1'], $correlationId, null, 87600);
                $payload = $provenance->replayPayload;
                if ($payload === null || ! isset($payload['listing_id'], $payload['order_id'])) {
                    $listing = $create->handle(new ResourceActor($users['provider'], $users['provider']), [
                        'title' => 'Pilot QA A1 home repair service',
                        'description' => 'Synthetic pilot fixture only. No real provider, payment, or fulfillment. Agree the exact scope and schedule in the Order before any service begins.',
                        'category_code' => 'home-help', 'listing_type' => 'service', 'work_shape' => 'A1',
                        'scope' => 'Synthetic QA: inspect one Tagudin household door and provide a written repair plan; no real visit.',
                        'price_amount_minor' => 25000, 'currency' => 'PHP',
                        'package_tiers' => [['id' => 'standard', 'title' => 'Standard inspection', 'price' => 250, 'sub' => 'Synthetic QA package', 'inclusions' => ['One inspection plan']]],
                        'fixture_key' => 'controlled-pilot-f01-order-proposal-v1',
                    ], $correlationId);
                    $listingId = (string) $listing['id'];
                    DB::table('listings')->where('id', $listingId)->update(['status' => 'active', 'review_status' => 'approved', 'updated_at' => now()]);
                    DB::table('listing_versions')->where('listing_id', $listingId)->where('version_number', 1)->update(['price_amount_minor' => 25000, 'currency' => 'PHP', 'published_at' => now(), 'updated_at' => now()]);
                    $order = $propose->handle($users['buyer'], $listingId, 1, 'pilot-f01-proposal-v1', $correlationId, [
                        'amount_minor' => 25000, 'currency' => 'PHP', 'package_id' => 'standard', 'lane' => 'external_cash',
                        'note' => 'Synthetic QA proposal: please confirm the written inspection scope and agree a schedule; do not perform real work.',
                    ]);
                    $payload = ['listing_id' => $listingId, 'order_id' => (string) $order['order_id'], 'buyer_id' => $users['buyer'], 'provider_id' => $users['provider']];
                    $idempotency->succeed($provenance->row, $payload);
                }

                $current = $this->checkpoint((string) $payload['order_id']);

                return ['schema_version' => 1, 'fixture' => 'controlled-pilot-f01-v1', 'scenario_reference' => 'controlled-pilot-f01-order-proposal-v1', 'synthetic_evidence' => true,
                    'database' => (string) DB::connection()->getDatabaseName(), 'private_storage_root' => storage_path('app/private'),
                    'actors' => array_combine(array_keys(self::FIXTURE), array_map(fn (string $key): array => [
                        'id' => $users[$key], 'email' => self::FIXTURE[$key]['email'], 'phone' => self::FIXTURE[$key]['phone'],
                        'role' => self::FIXTURE[$key]['role'], 'role_status' => DB::table('role_assignments')->where('user_id', $users[$key])->where('role_code', self::FIXTURE[$key]['role'])->orderBy('created_at')->value('status'),
                    ], array_keys(self::FIXTURE))),
                    'listing_id' => $payload['listing_id'], 'order_id' => $payload['order_id'],
                    'initial_checkpoint' => 'order_proposed_awaiting_provider_acceptance',
                    'current_checkpoint' => $current['checkpoint'], 'current_proposal_status' => $current['proposal_status'],
                    'current_payment_status' => $current['payment_status'], 'next_actor' => $current['next_actor'], 'next_action' => $current['next_action'],
                    'staff_roles' => ['maker' => 'admin', 'checker' => 'operate'], 'publication_precondition' => 'Fixture-only direct publication; staff review was not exercised.',
                    'credential_status' => $this->credentialStatus($users, $password), 'generated_at' => now()->toIso8601String()];
            }, 3);
            $privateRoot = dirname($recordPath);
            if (! is_dir($privateRoot) && ! mkdir($privateRoot, 0700, true) && ! is_dir($privateRoot)) {
                throw new RuntimeException('Cannot create the private controlled pilot QA record directory.');
            }
            chmod($privateRoot, 0700);

            $temporary = $recordPath.'.'.bin2hex(random_bytes(6)).'.tmp';
            $bytes = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
            if (file_put_contents($temporary, $bytes, LOCK_EX) === false || ! chmod($temporary, 0600) || ! rename($temporary, $recordPath)) {
                @unlink($temporary);
                throw new RuntimeException('Controlled pilot QA setup committed, but private report export failed; rerun to re-export from database provenance.');
            }
            $this->command->info("Controlled pilot QA private run record: {$recordPath}");
        } finally {
            DB::select('SELECT pg_advisory_unlock(hashtext(?))', [self::PROVENANCE_SCOPE]);
        }
    }

    private function preflight(): void
    {
        $database = (string) DB::connection()->getDatabaseName();
        $storagePath = rtrim(storage_path(), '/');
        $privateRoot = rtrim(storage_path('app/private'), '/');
        if (DB::connection()->getDriverName() !== 'pgsql'
            || ! in_array((string) config('app.env'), ['local', 'testing'], true)
            || ! in_array((string) config('serbizyu.environment'), ['local', 'testing'], true)
            || (string) config('serbizyu.evidence_class') !== 'TEAM_TRAINING'
            || ! str_starts_with($database, self::DATABASE_PREFIX)
            || ! str_starts_with($storagePath, self::APPROVED_STORAGE_PREFIX)
            || preg_match('#^/tmp/serbizyu-controlled-pilot-qa-[A-Za-z0-9_-]+$#D', $storagePath) !== 1
            || (realpath($storagePath) !== false && realpath($storagePath) !== $storagePath)
            || (realpath($privateRoot) !== false && realpath($privateRoot) !== $privateRoot)
            || rtrim((string) config('filesystems.disks.local.root'), '/') !== $privateRoot
            || rtrim((string) config('filesystems.disks.private.root'), '/') !== $privateRoot
            || (string) config('serbizyu.providers.payment.mode') !== 'disabled'
            || (string) config('serbizyu.providers.notifications.mode') !== 'disabled'
            || ! in_array((string) config('serbizyu.providers.evidence.mode'), ['local', 'disabled'], true)) {
            throw new RuntimeException('Controlled pilot QA requires local/testing, an approved serbizyu_pilot_qa_* DB, its exact isolated private root and disabled external payment/notification providers.');
        }
        $requiredColumns = [
            'users' => ['id', 'phone_e164', 'email', 'password', 'status', 'primary_access_tier'],
            'user_profiles' => ['user_id', 'display_name'],
            'role_assignments' => ['id', 'user_id', 'role_code', 'status', 'effective_at', 'expires_at'],
            'listings' => ['id', 'owner_user_id', 'status', 'review_status', 'current_version'],
            'listing_versions' => ['id', 'listing_id', 'version_number', 'price_amount_minor', 'currency', 'terms', 'published_at'],
            'orders' => ['id', 'listing_id', 'buyer_user_id', 'provider_user_id', 'status', 'current_proposal_id'],
            'order_proposals' => ['id', 'order_id', 'status', 'expires_at'],
            'work_instances' => ['id', 'order_id', 'status', 'structure'],
            'payment_obligations' => ['id', 'order_id', 'status', 'payer_user_id', 'recipient_user_id'],
            'idempotency_keys' => ['id', 'scope', 'key', 'status', 'response_payload'],
        ];
        foreach ($requiredColumns as $table => $columns) {
            if (! Schema::hasTable($table) || array_diff($columns, Schema::getColumnListing($table)) !== []) {
                throw new RuntimeException("Controlled pilot QA requires the current migrated schema; {$table} is missing required columns.");
            }
        }
    }

    private function preflightIdentitiesAndResources(): void
    {
        $any = false;
        foreach (self::FIXTURE as $account) {
            $matches = User::query()->where('id', $account['id'])->orWhere('phone_e164', $account['phone'])->orWhere('email', $account['email'])->get();
            if ($matches->isNotEmpty()) {
                $any = true;
                if ($matches->count() !== 1 || (string) $matches[0]->id !== $account['id'] || (string) $matches[0]->phone_e164 !== $account['phone'] || (string) $matches[0]->email !== $account['email']) {
                    throw new RuntimeException('Controlled pilot QA actor identity collision; no fixture writes were made.');
                }
            }
        }
        $record = DB::table('idempotency_keys')->where('scope', self::PROVENANCE_SCOPE)->where('key', self::PROVENANCE_KEY)->first();
        if ($any && $record === null) {
            throw new RuntimeException('Partial controlled pilot QA identity collision without recoverable provenance; no fixture writes were made.');
        }
        if ($record === null && (DB::table('listings')->whereIn('owner_user_id', array_column(self::FIXTURE, 'id'))->exists()
            || DB::table('orders')->whereIn('buyer_user_id', array_column(self::FIXTURE, 'id'))->exists()
            || DB::table('orders')->whereIn('provider_user_id', array_column(self::FIXTURE, 'id'))->exists())) {
            throw new RuntimeException('Controlled pilot QA resource collision without recoverable provenance; no fixture writes were made.');
        }
        if ($record !== null) {
            foreach (self::FIXTURE as $key => $account) {
                $user = User::query()->whereKey($account['id'])->first();
                if ($user === null
                    || ! DB::table('role_assignments')->where('user_id', $account['id'])->where('role_code', $account['role'])->exists()) {
                    throw new RuntimeException("Controlled pilot QA actor/reference mismatch ({$key}); no fixture writes were made.");
                }
            }
        }
        if ($record !== null && (string) $record->status === 'succeeded') {
            $payload = json_decode((string) $record->response_payload, true);
            $listing = is_array($payload) && isset($payload['listing_id'])
                ? DB::table('listings')->where('id', $payload['listing_id'])->first() : null;
            $order = is_array($payload) && isset($payload['order_id'])
                ? DB::table('orders')->where('id', $payload['order_id'])->first() : null;
            if ($listing === null || $order === null
                || (string) $listing->owner_user_id !== self::FIXTURE['provider']['id']
                || (string) $order->listing_id !== (string) $payload['listing_id']
                || (string) $order->buyer_user_id !== self::FIXTURE['buyer']['id']
                || (string) $order->provider_user_id !== self::FIXTURE['provider']['id']
                || $order->current_proposal_id === null
                || ! DB::table('order_proposals')->where('id', $order->current_proposal_id)->where('order_id', $payload['order_id'])->exists()) {
                throw new RuntimeException('Controlled pilot QA fixture provenance/resource ownership mismatch; no fixture writes were made.');
            }
            $proposal = DB::table('order_proposals')->where('id', $order->current_proposal_id)->first();
            if (! in_array((string) $proposal->proposed_by_user_id, [self::FIXTURE['buyer']['id'], self::FIXTURE['provider']['id']], true)) {
                throw new RuntimeException('Controlled pilot QA current proposal has an unrelated actor; no fixture writes were made.');
            }
            if ($order->status === 'proposed') {
                $version = DB::table('listing_versions')->where('listing_id', $listing->id)
                    ->where('version_number', $listing->current_version)->first(['id']);
                if ($listing->status !== 'active' || $listing->review_status !== 'approved'
                    || $version === null || $version->id !== $proposal->source_listing_version_id) {
                    throw new RuntimeException('Controlled pilot QA current source terms changed or became unavailable; no fixture writes were made.');
                }
            }
            if (in_array($order->status, ['accepted', 'in_progress', 'completed'], true) || $order->current_terms_snapshot_id !== null) {
                $terms = DB::table('order_terms_snapshots')->where('id', $order->current_terms_snapshot_id)->where('order_id', $order->id)->first();
                $work = DB::table('work_instances')->where('order_id', $order->id)->first();
                $obligations = DB::table('payment_obligations')->where('order_id', $order->id)
                    ->whereNotIn('status', ['cancelled', 'superseded'])->get();
                if ($terms === null || $work === null || $obligations->count() !== 1
                    || (string) $obligations[0]->work_instance_id !== (string) $work->id
                    || (string) $obligations[0]->payer_user_id !== self::FIXTURE['buyer']['id']
                    || (string) $obligations[0]->recipient_user_id !== self::FIXTURE['provider']['id']) {
                    throw new RuntimeException('Controlled pilot QA accepted terms, Work or obligation reference mismatch; no fixture writes were made.');
                }
            }
        }
    }

    /** @return array<string, string> */
    private function ensureActors(string $password): array
    {
        $ids = [];
        foreach (self::FIXTURE as $key => $account) {
            $user = User::query()->whereKey($account['id'])->first();
            if ($user === null) {
                $user = User::factory()->withEmailPassword($account['email'], $password)->create([
                    'id' => $account['id'], 'phone_e164' => $account['phone'], 'status' => $account['status'] ?? 'active', 'primary_access_tier' => 'L1',
                ]);
                DB::table('user_profiles')->where('user_id', $user->id)->update(['display_name' => $account['name']]);
                DB::table('role_assignments')->insert(['id' => (string) Str::uuid7(), 'user_id' => $user->id, 'role_code' => $account['role'],
                    'status' => $account['expired'] ?? false ? 'expired' : (($account['status'] ?? 'active') === 'suspended' ? 'suspended' : 'active'),
                    'granted_by_user_id' => $user->id, 'effective_at' => $account['expired'] ?? false ? now()->subDays(2) : now(),
                    'expires_at' => $account['expired'] ?? false ? now()->subDay() : null, 'scope' => '{}', 'version' => 1,
                    'correlation_id' => (string) Str::uuid7(), 'created_at' => now(), 'updated_at' => now()]);
            }
            $ids[$key] = (string) $user->id;
        }

        return $ids;
    }

    /** @return array{checkpoint:string,next_actor:?string,next_action:string,proposal_status:?string,payment_status:?string} */
    private function checkpoint(string $orderId): array
    {
        $row = DB::table('orders')->where('id', $orderId)->first(['status', 'current_proposal_id']);
        if ($row === null) {
            throw new RuntimeException('The controlled pilot Order provenance points to a missing Order.');
        }
        $status = (string) $row->status;
        $proposal = $row->current_proposal_id === null ? null : DB::table('order_proposals')
            ->where('id', $row->current_proposal_id)->where('order_id', $orderId)->first(['status', 'expires_at', 'proposed_by_user_id']);
        $proposalStatus = $proposal === null ? null : (string) $proposal->status;
        if ($status === 'proposed' && $proposalStatus === 'proposed') {
            if ($proposal->expires_at === null || now()->lt($proposal->expires_at)) {
                $responder = (string) $proposal->proposed_by_user_id === self::FIXTURE['buyer']['id'] ? 'provider' : 'buyer';

                return ['checkpoint' => 'order_proposed_awaiting_'.$responder.'_acceptance', 'next_actor' => $responder,
                    'next_action' => 'Review the current counterparty proposal and accept, counter or decline its exact terms.',
                    'proposal_status' => $proposalStatus, 'payment_status' => null];
            }

            return ['checkpoint' => 'order_proposal_expired', 'next_actor' => null,
                'next_action' => 'The current proposal has expired; review the Order before creating or accepting another proposal.',
                'proposal_status' => $proposalStatus, 'payment_status' => null];
        }

        $work = DB::table('work_instances')->where('order_id', $orderId)->orderByDesc('created_at')->first(['status', 'structure']);
        $workStatus = $work === null ? null : (string) $work->status;
        if ($work !== null && is_string($work->structure)) {
            $structure = json_decode($work->structure, true);
            $nodes = is_array($structure['nodes'] ?? null) ? $structure['nodes'] : [];
            $activeId = $structure['active_node_id'] ?? null;
            $active = null;
            foreach ($nodes as $node) {
                if (is_array($node) && isset($node['id']) && (string) $node['id'] === (string) $activeId) {
                    $active = $node;
                    break;
                }
            }
            if (($structure['pending_customer_confirmation'] ?? false) === true
                || ($active['status'] ?? null) === 'awaiting_customer_confirmation') {
                return ['checkpoint' => 'order_'.$status.'_work_'.$workStatus, 'next_actor' => 'buyer',
                    'next_action' => 'Review the active provider-submitted Work step and sign off or raise a concern.',
                    'proposal_status' => $proposalStatus, 'payment_status' => null];
            }
            if (($active['status'] ?? null) === 'active'
                && in_array($active['control_mode'] ?? null, ['provider_advance', 'customer_confirm'], true)) {
                return ['checkpoint' => 'order_'.$status.'_work_'.$workStatus, 'next_actor' => 'provider',
                    'next_action' => 'Continue the active provider-owned Work step shown on the Order.',
                    'proposal_status' => $proposalStatus, 'payment_status' => null];
            }
        }

        $payment = DB::table('payment_obligations')->where('order_id', $orderId)
            ->whereNotIn('status', ['cancelled', 'superseded'])->orderByDesc('created_at')
            ->first(['status', 'payer_user_id', 'recipient_user_id']);
        $paymentStatus = $payment === null ? null : (string) $payment->status;
        if ($payment !== null && in_array($paymentStatus, ['due', 'payer_reported_cash', 'payer_submitted_p2p_proof', 'proof_rejected'], true)
            && ($workStatus === 'completed' || $status === 'completed')) {
            $actorUserId = in_array($paymentStatus, ['payer_reported_cash', 'payer_submitted_p2p_proof'], true)
                ? (string) $payment->recipient_user_id : (string) $payment->payer_user_id;
            $actor = $actorUserId === self::FIXTURE['buyer']['id'] ? 'buyer'
                : ($actorUserId === self::FIXTURE['provider']['id'] ? 'provider' : null);
            $action = $actor === 'provider' ? 'Review the reported synthetic payment and acknowledge or dispute its receipt.'
                : ($actor === 'buyer' ? 'Review the due payment obligation and report the synthetic payment or raise a concern.'
                    : 'Review the persisted payment obligation before taking further action.');

            return ['checkpoint' => 'order_'.$status.'_work_'.(string) $workStatus.'_payment_'.$paymentStatus,
                'next_actor' => $actor, 'next_action' => $action, 'proposal_status' => $proposalStatus, 'payment_status' => $paymentStatus];
        }

        if ($status === 'completed' || in_array($workStatus, ['completed', 'cancelled', 'failed'], true)) {
            return ['checkpoint' => 'order_'.$status.($workStatus === null ? '' : '_work_'.$workStatus), 'next_actor' => null,
                'next_action' => 'No active next action is recorded for this scenario checkpoint.',
                'proposal_status' => $proposalStatus, 'payment_status' => $paymentStatus];
        }

        return ['checkpoint' => 'order_'.$status.($workStatus === null ? '' : '_work_'.$workStatus), 'next_actor' => null,
            'next_action' => 'Review the persisted Order, proposal, and Work state before taking further action.',
            'proposal_status' => $proposalStatus, 'payment_status' => $paymentStatus];
    }

    /**
     * @param  array<string, string>  $users
     * @return array{config_password_matches_actor: array<string, bool>, existing_actor_passwords_reset: false}
     */
    private function credentialStatus(array $users, string $password): array
    {
        $matches = [];
        foreach ($users as $key => $id) {
            $hash = (string) DB::table('users')->where('id', $id)->value('password');
            $matches[$key] = $hash !== '' && Hash::check($password, $hash);
        }

        return ['config_password_matches_actor' => $matches, 'existing_actor_passwords_reset' => false];
    }
}
