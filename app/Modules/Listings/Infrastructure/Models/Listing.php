<?php

declare(strict_types=1);

namespace App\Modules\Listings\Infrastructure\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Listing extends Model
{
    protected $table = 'listings';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'geography' => 'array',
            'archived_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /** @return HasMany<ListingVersion, $this> */
    public function versions(): HasMany
    {
        return $this->hasMany(ListingVersion::class, 'listing_id');
    }
}
