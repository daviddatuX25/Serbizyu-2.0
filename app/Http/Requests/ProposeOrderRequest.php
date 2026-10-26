<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ProposeOrderRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $header = $this->header('Idempotency-Key');
        if (is_string($header) && $header !== '') {
            $this->merge(['idempotency_key' => trim($header)]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'expected_listing_version' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9._:-]{8,128}$/'],
            'amount_minor' => ['sometimes', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:999'],
            'variant_id' => ['sometimes', 'nullable', 'string', 'max:191'],
            'package_id' => ['sometimes', 'nullable', 'string', 'max:191'],
            'listing_version_id' => ['sometimes', 'uuid'],
            'appointment_reservation_id' => ['sometimes', 'uuid'],
            'lane' => ['sometimes', 'string', 'in:external_cash,p2p_transfer,protected_digital'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'slot' => ['sometimes', 'array'],
            'deal_chain_combination_id' => ['nullable', 'string', 'max:191'],
            'addon_ids' => ['sometimes', 'array'],
            'addon_ids.*' => ['required', 'string', 'max:191'],
        ];
    }
}
