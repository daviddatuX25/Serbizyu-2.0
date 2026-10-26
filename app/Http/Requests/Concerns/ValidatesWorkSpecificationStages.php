<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

use App\Shared\Contracts\WorkSpecificationPort;

trait ValidatesWorkSpecificationStages
{
    /** @return array<string, list<string>> */
    protected function workStageRules(string $prefix): array
    {
        $rules = [
            $prefix => ['nullable', 'array'],
            "{$prefix}.*" => ['array'],
            "{$prefix}.*.id" => ['nullable', 'string', 'max:128', 'distinct'],
            "{$prefix}.*.num" => ['nullable', 'string', 'max:20'],
            "{$prefix}.*.title" => ['required', 'string', 'max:200'],
            "{$prefix}.*.desc" => ['nullable', 'string', 'max:1000'],
            "{$prefix}.*.description" => ['nullable', 'string', 'max:1000'],
            "{$prefix}.*.dur" => ['nullable', 'string', 'max:100'],
            "{$prefix}.*.duration_label" => ['nullable', 'string', 'max:100'],
            "{$prefix}.*.evidence" => ['nullable', 'string', 'max:500'],
            "{$prefix}.*.evidenceType" => ['nullable', 'string', 'in:photo_required,video_required,meter_log,receipt_upload,dual_sign,none,gps_checkin'],
            "{$prefix}.*.evidence_type" => ['nullable', 'string', 'in:photo_required,video_required,meter_log,receipt_upload,dual_sign,none,gps_checkin'],
            "{$prefix}.*.gateType" => ['nullable', 'string', 'in:arrival,execution,diagnostic,signoff'],
            "{$prefix}.*.clearanceMode" => ['nullable', 'string', 'in:worker_direct,customer_approval,physical_handoff'],
            "{$prefix}.*.clearance_mode" => ['nullable', 'string', 'in:worker_direct,customer_approval,physical_handoff'],
            "{$prefix}.*.controlMode" => ['nullable', 'string', 'in:provider_advance,customer_confirm,counterparty_handoff'],
            "{$prefix}.*.control_mode" => ['nullable', 'string', 'in:provider_advance,customer_confirm,counterparty_handoff'],
            "{$prefix}.*.approvalMethod" => ['nullable', 'string', 'in:app_confirm,presence_otp,worker_dropoff,none'],
            "{$prefix}.*.approval_method" => ['nullable', 'string', 'in:app_confirm,presence_otp,worker_dropoff,none'],
            "{$prefix}.*.handoffParty" => ['nullable', 'string', 'in:recipient_confirm,worker_dropoff'],
            "{$prefix}.*.handoff_party" => ['nullable', 'string', 'in:recipient_confirm,worker_dropoff'],
            "{$prefix}.*.metricUnit" => ['prohibited'],
            "{$prefix}.*.metric_unit" => ['prohibited'],
            "{$prefix}.*.requiredProofs" => ['nullable', 'array'],
            "{$prefix}.*.required_proofs" => ['nullable', 'array'],
            "{$prefix}.*.checklistItems" => ['nullable', 'array'],
            "{$prefix}.*.checklist_items" => ['nullable', 'array'],
            "{$prefix}.*.metricRequirements" => ['nullable', 'array'],
            "{$prefix}.*.metric_requirements" => ['nullable', 'array'],
        ];

        foreach (['requiredProofs', 'required_proofs'] as $field) {
            $rules["{$prefix}.*.{$field}.*"] = ['string', 'in:'.implode(',', WorkSpecificationPort::WORK_TOOLS)];
        }
        foreach (['checklistItems', 'checklist_items'] as $field) {
            $rules["{$prefix}.*.{$field}.*"] = ['array'];
            $rules["{$prefix}.*.{$field}.*.id"] = ['required', 'string', 'max:128'];
            $rules["{$prefix}.*.{$field}.*.label"] = ['required', 'string', 'max:200'];
            $rules["{$prefix}.*.{$field}.*.required"] = ['sometimes', 'boolean'];
        }
        foreach (['metricRequirements', 'metric_requirements'] as $field) {
            $rules["{$prefix}.*.{$field}.*"] = ['array'];
            $rules["{$prefix}.*.{$field}.*.id"] = ['required', 'string', 'max:128'];
            $rules["{$prefix}.*.{$field}.*.name"] = ['required', 'string', 'max:200'];
            $rules["{$prefix}.*.{$field}.*.unit"] = ['required', 'string', 'max:32'];
            $rules["{$prefix}.*.{$field}.*.required"] = ['sometimes', 'boolean'];
            foreach (['target', 'min', 'max'] as $bound) {
                $rules["{$prefix}.*.{$field}.*.{$bound}"] = ['sometimes', 'nullable', 'numeric'];
            }
        }

        return $rules;
    }
}
