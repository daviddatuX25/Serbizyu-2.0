<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegisterPhoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'max:32'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'digits:6'],
        ];
    }
}
