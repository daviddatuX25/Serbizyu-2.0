<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class FinalizeOrderRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $header = $this->header('Idempotency-Key');
        if (is_string($header) && $header !== '') {
            $this->merge(['idempotency_key' => trim($header)]);
        }

        if (! $this->filled('idempotency_key')) {
            $this->merge([
                'idempotency_key' => 'ui-finalize:'.$this->route('order').':'.(string) $this->input('expected_order_version', '0'),
            ]);
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
            'expected_order_version' => ['required', 'integer', 'min:1'],
            'idempotency_key' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9._:-]{8,128}$/'],
        ];
    }
}
