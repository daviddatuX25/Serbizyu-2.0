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
        ];
    }
}
