<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesListingGeography;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateListingDraftRequest extends FormRequest
{
    use ValidatesListingGeography;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return array_merge([
            'expected_version' => ['required', 'integer', 'min:1'],
            'title' => ['sometimes', 'string', 'min:3', 'max:120'],
            'description' => ['sometimes', 'string', 'min:10', 'max:4000'],
            'category_code' => ['sometimes', 'string', 'regex:/^[a-z0-9][a-z0-9_-]{1,63}$/'],
            'listing_type' => ['sometimes', 'string', 'in:service,product'],
            'work_shape' => ['sometimes', 'string', 'in:A1,A3,A4,A9'],
            'price_amount_minor' => ['nullable', 'integer', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'pricing_mode' => ['nullable', 'string', 'in:fixed,range,packages'],
            'package_tiers' => ['nullable', 'array'],
            'addons' => ['nullable', 'array'],
            'milestone_stages' => ['nullable', 'array'],
            'work_catalog_code' => ['nullable', 'string', 'max:120'],
            'work_set_version' => ['nullable', 'integer', 'min:1'],
            'inclusions' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
            'media' => ['nullable', 'array'],
            'deal_chain_combinations' => ['nullable', 'array'],
            'deal_chain_specification' => ['nullable', 'array'],
            'stall_location' => ['nullable', 'string', 'max:255'],
        ], $this->geographyRules());
    }
}
