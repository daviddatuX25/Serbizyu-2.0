<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'users';

    /** @var list<string> */
    protected $fillable = [
        'phone_e164',
        'status',
        'primary_access_tier',
        'locale',
        'timezone',
    ];

    /** @var list<string> */
    protected $hidden = [
        'remember_token',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }
}
