<?php

declare(strict_types=1);

namespace App\Modules\Listings\Application\Projections;

/**
 * Controlled listing response shape shared by command responses and public readers.
 *
 * @phpstan-type ListingAttributes array<string, mixed>
 */
final readonly class ListingProjection
{
    /** @param array<string, mixed> $attributes */
    private function __construct(private array $attributes) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function owner(array $attributes): self
    {
        return self::from($attributes, public: false);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function public(array $attributes): self
    {
        return self::from($attributes, public: true);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return $this->attributes;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private static function from(array $attributes, bool $public): self
    {
        $projection = [
            'id' => (string) $attributes['id'],
            'title' => (string) $attributes['title'],
            'description' => (string) $attributes['description'],
            'category_code' => (string) $attributes['category_code'],
            'listing_type' => (string) $attributes['listing_type'],
            'status' => (string) $attributes['status'],
            'review_status' => (string) $attributes['review_status'],
            'state' => (string) $attributes['state'],
            'version' => (int) $attributes['version'],
            'expected_version' => (int) $attributes['expected_version'],
            'current_version' => (int) $attributes['current_version'],
            'area' => (string) $attributes['area'],
            'public' => $public,
        ];
        if (array_key_exists('work_shape', $attributes)) {
            $projection['work_shape'] = (string) $attributes['work_shape'];
        }

        if (array_key_exists('fixture_key', $attributes)) {
            $projection['fixture_key'] = (string) $attributes['fixture_key'];
        }

        if (array_key_exists('price_amount_minor', $attributes) && $attributes['price_amount_minor'] !== null) {
            $projection['price_amount_minor'] = (int) $attributes['price_amount_minor'];
            $projection['currency'] = isset($attributes['currency'])
                ? (string) $attributes['currency']
                : null;
        }
        if (array_key_exists('capacity_summary', $attributes) && $attributes['capacity_summary'] !== null) {
            $projection['capacity_summary'] = (string) $attributes['capacity_summary'];
        }

        if (array_key_exists('package_tiers', $attributes) && is_array($attributes['package_tiers'])) {
            $projection['package_tiers'] = $attributes['package_tiers'];
        }

        if (array_key_exists('milestone_stages', $attributes) && is_array($attributes['milestone_stages'])) {
            $projection['milestone_stages'] = $attributes['milestone_stages'];
        }

        foreach (['work_catalog', 'work_specification', 'addons', 'partner_candidates', 'deal_chain_combinations', 'deal_chain_specification', 'media', 'inclusions', 'variants', 'geography'] as $catalogField) {
            if (array_key_exists($catalogField, $attributes) && is_array($attributes[$catalogField])) {
                $projection[$catalogField] = $attributes[$catalogField];
            }
        }

        foreach (['catalog_source', 'work_catalog_code', 'pricing_mode', 'stall_location'] as $stringField) {
            if (array_key_exists($stringField, $attributes) && is_string($attributes[$stringField])) {
                $projection[$stringField] = $attributes[$stringField];
            }
        }

        if (array_key_exists('work_set_version', $attributes) && is_numeric($attributes['work_set_version'])) {
            $projection['work_set_version'] = (int) $attributes['work_set_version'];
        }

        $projection['cover_thumbnail_url'] = isset($attributes['cover_thumbnail_url']) && is_string($attributes['cover_thumbnail_url']) && $attributes['cover_thumbnail_url'] !== ''
            ? $attributes['cover_thumbnail_url']
            : null;
        $projection['has_video'] = (bool) ($attributes['has_video'] ?? false);
        if ($public) {
            $projection['owner_name'] = (string) $attributes['owner_name'];
            $projection['owner'] = [
                'display_name' => (string) data_get($attributes, 'owner.display_name'),
            ];
        } elseif (array_key_exists('owner_user_id', $attributes)) {
            $projection['owner_user_id'] = (string) $attributes['owner_user_id'];
        }

        return new self($projection);
    }
}
