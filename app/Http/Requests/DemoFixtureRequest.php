<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class DemoFixtureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'fixture_identifier' => ['required', 'string', 'max:128'],
            'challenge_code' => ['sometimes', 'nullable', 'string', 'max:32'],
        ];
    }
}
