<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateListingDraftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'expected_version' => ['required', 'integer', 'min:1'],
            'title' => ['sometimes', 'string', 'min:3', 'max:120'],
            'description' => ['sometimes', 'string', 'min:10', 'max:4000'],
            'category_code' => ['sometimes', 'string', 'regex:/^[a-z0-9][a-z0-9_-]{1,63}$/'],
            'listing_type' => ['sometimes', 'string', 'in:service,product'],
        ];
    }
}
