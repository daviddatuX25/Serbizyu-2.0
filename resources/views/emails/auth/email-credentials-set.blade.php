<x-mail::message>
# Email sign-in is ready

Hi {{ $user->email }},

Your Serbizyu account can now sign in with this email and the password you just set. Your verified mobile number stays the trust contact for Tagudin notices and high-trust steps.

<x-mail::button :url="config('app.url').'/auth/sign-in'">
Sign in
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
