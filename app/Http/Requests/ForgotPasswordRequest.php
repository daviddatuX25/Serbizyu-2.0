<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'email' => ['required_without:phone', 'nullable', 'string', 'email', 'max:255'],
            'phone' => ['required_without:email', 'nullable', 'string', 'max:32'],
        ];
    }
}
