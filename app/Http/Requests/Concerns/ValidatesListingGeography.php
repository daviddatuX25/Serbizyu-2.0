<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

trait ValidatesListingGeography
{
    /**
     * @return array<string, array<int, string>>
     */
    protected function geographyRules(): array
    {
        return [
            'geography' => ['nullable', 'array'],
            'geography.area_code' => ['nullable', 'string', 'max:50'],
            'geography.region_code' => ['nullable', 'string', 'max:20'],
            'geography.region_name' => ['nullable', 'string', 'max:100'],
            'geography.province_code' => ['nullable', 'string', 'max:20'],
            'geography.province_name' => ['nullable', 'string', 'max:100'],
            'geography.municipality_code' => ['nullable', 'string', 'max:20'],
            'geography.municipality_name' => ['nullable', 'string', 'max:100'],
            'geography.postal_code' => ['nullable', 'string', 'max:10'],
            'geography.barangay_code' => ['nullable', 'string', 'max:64'],
            'geography.barangay_name' => ['nullable', 'string', 'max:100'],
            'geography.address_line_1' => ['nullable', 'string', 'max:255'],
            'geography.stall_location' => ['nullable', 'string', 'max:255'],
            'geography.street_address' => ['nullable', 'string', 'max:255'],
            'geography.landmark' => ['nullable', 'string', 'max:255'],
            'geography.coordinates' => ['nullable', 'array'],
            'geography.coordinates.lat' => ['nullable', 'numeric', 'between:4.0,22.0'],
            'geography.coordinates.lng' => ['nullable', 'numeric', 'between:116.0,127.0'],
            'geography.coordinates.accuracy_m' => ['nullable', 'numeric', 'min:0'],
            'geography.coordinates.source' => ['nullable', 'string', 'in:gps,manual,default'],
            'geography.coordinates.captured_at' => ['nullable', 'string', 'max:50'],
            'geography.has_pinned_coordinates' => ['nullable', 'boolean'],
            'geography.service_radius_km' => ['nullable', 'numeric', 'min:0.5', 'max:100.0'],
        ];
    }
}
