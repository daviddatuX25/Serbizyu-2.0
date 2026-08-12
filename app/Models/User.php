<?php

namespace App\Models;

use App\Mail\Auth\PasswordResetLink;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Send the password reset notification via the product mailable
     * (ADR-R-030 decision 12), bypassing the framework default notification.
     */
    public function sendPasswordResetNotification($token): void
    {
        Mail::to($this)->send(new PasswordResetLink($this, $token));
    }

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'users';

    /** @var list<string> */
    protected $fillable = [
        'phone_e164',
        'email',
        'status',
        'primary_access_tier',
        'locale',
        'timezone',
        'password',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
