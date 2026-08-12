<x-mail::message>
# Reset your password

Hi {{ $user->email }},

We received a request to reset your Serbizyu password. Use the button below to choose a new one. This link expires in 60 minutes and can be used once.

<x-mail::button :url="$resetUrl">
Reset password
</x-mail::button>

If you did not request this, you can safely ignore this email — your password will not change.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
