<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ListingVersion extends Model
{
    protected $table = 'listing_versions';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'terms' => 'array',
            'payment_lane_availability' => 'array',
            'availability_capacity_summary' => 'array',
            'effective_from' => 'immutable_datetime',
            'effective_to' => 'immutable_datetime',
            'published_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Listing, $this> */
    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class, 'listing_id');
    }
}
