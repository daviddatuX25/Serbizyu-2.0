<?php

declare(strict_types=1);

namespace App\Modules\DealCoordination\Application;

use App\Shared\Contracts\WorkMilestoneReaderPort;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class WorkCompletedGateBackfill
{
    public function __construct(
        private readonly WorkMilestoneReaderPort $workMilestones,
        private readonly DealWorkGateAdapter $gates,
    ) {}

    public function reconcile(): void
    {
        $dependencies = DB::table('deal_dependencies')
            ->where('status', 'active')
            ->where('dependency_type', 'blocks')
            ->where('condition_code', 'work_completed')
            ->orderBy('id')
            ->get();

        $unknownConditions = DB::table('deal_dependencies')
            ->whereNotIn('condition_code', ['part_ready', 'delivery_signed', 'work_completed'])
            ->orderBy('id')
            ->get(['id', 'condition_code']);
        foreach ($unknownConditions as $dependency) {
            Log::warning('F05 dependency gate history retained without relabeling: unsupported condition.', [
                'dependency_id' => (string) $dependency->id,
                'condition_code' => (string) $dependency->condition_code,
            ]);
        }

        foreach ($dependencies as $dependency) {
            foreach ([$dependency->predecessor_need_id, $dependency->successor_need_id] as $needId) {
                $confirmations = DB::table('deal_need_confirmations as confirmation')
                    ->join('deal_needs as need', function ($join): void {
                        $join->on('need.id', '=', 'confirmation.deal_need_id')
                            ->on('need.deal_chain_id', '=', 'confirmation.deal_chain_id');
                    })
                    ->where('confirmation.deal_chain_id', $dependency->deal_chain_id)
                    ->where('confirmation.deal_need_id', $needId)
                    ->orderBy('confirmation.id')
                    ->get(['confirmation.deal_chain_id', 'confirmation.deal_need_id', 'confirmation.order_id', 'need.status as need_status']);

                if ($confirmations->isEmpty()) {
                    Log::warning('F05 dependency gate left blocked: no confirmed child Order.', [
                        'dependency_id' => (string) $dependency->id,
                        'deal_need_id' => (string) $needId,
                    ]);
                }

                foreach ($confirmations as $confirmation) {
                    if (in_array((string) $confirmation->need_status, ['superseded', 'cancelled', 'replacement_needed', 'failed'], true)) {
                        Log::warning('F05 dependency gate left blocked: confirmed need is not a current epoch.', [
                            'dependency_id' => (string) $dependency->id,
                            'confirmation_order_id' => (string) $confirmation->order_id,
                            'deal_need_id' => (string) $needId,
                            'need_status' => (string) $confirmation->need_status,
                        ]);

                        continue;
                    }

                    $work = $this->workMilestones->workForOrder((string) $confirmation->order_id);
                    if ($work === null
                        || $work['deal_chain_id'] !== (string) $dependency->deal_chain_id
                        || $work['deal_need_id'] !== (string) $needId) {
                        Log::warning('F05 dependency gate left blocked: confirmed Order has no compatible current Work.', [
                            'dependency_id' => (string) $dependency->id,
                            'confirmation_order_id' => (string) $confirmation->order_id,
                            'deal_need_id' => (string) $needId,
                        ]);

                        continue;
                    }

                    $this->gates->registerConfirmedNeedWork(
                        (string) $confirmation->deal_chain_id,
                        (string) $confirmation->deal_need_id,
                        (string) $confirmation->order_id,
                        $work['work_instance_id'],
                        (string) Str::uuid7(),
                    );
                }
            }
        }
    }
}
