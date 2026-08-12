<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class PasswordResetLink extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    public function __construct(
        public User $user,
        public string $token,
    ) {
        $this->resetUrl = route('auth.password.reset', [
            'token' => $token,
            'email' => $user->email,
        ]);
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your Serbizyu password',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.auth.password-reset-link',
            with: [
                'resetUrl' => $this->resetUrl,
            ],
        );
    }

    /** @return array<int, Attachment> */
    public function attachments(): array
    {
        return [];
    }
}
