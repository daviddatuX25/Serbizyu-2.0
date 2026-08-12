<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class OnboardingRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $languagePreferences = $this->input('language_preferences');
        $language = $this->input('language_code');

        if ($language === null && is_array($languagePreferences)) {
            $language = $languagePreferences[0] ?? null;
        }

        if ($language === 'ilo') {
            $language = 'fil';
        }

        $this->merge([
            'area_code' => $this->input('area_code') ?? $this->input('service_area_display'),
            'language_code' => $language,
            'low_data_mode' => $this->input('low_data_mode')
                ?? data_get($this->input('accessibility_preferences'), 'low_data_mode', false),
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'provider_intent' => ['required', 'boolean'],
            'display_name' => ['required', 'string', 'max:120'],
            'area_code' => ['nullable', 'string', 'max:64'],
            'service_area_display' => ['nullable', 'string', 'max:64'],
            'language_code' => ['nullable', 'string', 'in:fil,en'],
            'language_preferences' => ['nullable', 'array'],
            'low_data_mode' => ['sometimes', 'boolean'],
            'accessibility_preferences' => ['nullable', 'array'],
            'help_preference' => ['sometimes', 'string', 'in:self_managed,assistance_requested'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'password_confirmation' => ['required', 'string'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
        ];
    }
}
