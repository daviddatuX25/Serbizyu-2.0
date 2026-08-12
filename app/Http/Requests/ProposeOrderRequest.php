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
        ];
    }
}
