<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateListingDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:4000'],
            'category_code' => ['required', 'string', 'regex:/^[a-z0-9][a-z0-9_-]{1,63}$/'],
            'listing_type' => ['required', 'string', 'in:service,product'],
            'work_shape' => ['required', 'string', 'in:A1,A3,A4,A9'],
            'price_amount_minor' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'pricing_mode' => ['nullable', 'string', 'in:fixed,range,packages'],
            'package_tiers' => ['nullable', 'array'],
            'addons' => ['nullable', 'array'],
            'milestone_stages' => ['nullable', 'array'],
            'work_catalog_code' => ['nullable', 'string', 'max:120'],
            'inclusions' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
        ];
    }
}
