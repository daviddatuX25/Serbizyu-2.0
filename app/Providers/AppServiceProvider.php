<?php

namespace App\Providers;

use App\Modules\IdentityAccess\Application\ConsentActingForAuthorizer;
use App\Modules\IdentityAccess\Application\Contracts\NotificationChannel;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Application\DemoFixtureService;
use App\Modules\IdentityAccess\Infrastructure\Auth\DisabledOAuthLoginPort;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use App\Modules\IdentityAccess\Infrastructure\Notifications\LogOtpDelivery;
use App\Modules\IdentityAccess\Infrastructure\Notifications\MailpitNotificationChannel;
use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\Contracts\PublicListingReader;
use App\Modules\Listings\Application\OrderCapacityAdapter;
use App\Modules\Listings\Application\OrderListingSourceAdapter;
use App\Modules\Listings\Infrastructure\ListingRepository;
use App\Shared\Contracts\ActingForAuthorizer;
use App\Shared\Contracts\FixtureManager;
use App\Shared\Contracts\OAuthLoginPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OwnerListingReader;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EnvironmentValidator::class);
        $this->app->singleton(FakeOtpDelivery::class);
        $this->app->bind(ListingCommandStore::class, ListingRepository::class);
        $this->app->bind(OwnerListingReader::class, ListingRepository::class);
        $this->app->bind(PublicListingReader::class, ListingRepository::class);
        $this->app->bind(OrderListingSourcePort::class, OrderListingSourceAdapter::class);
        $this->app->bind(OrderCapacityPort::class, OrderCapacityAdapter::class);
        $this->app->bind(NotificationChannel::class, MailpitNotificationChannel::class);
        $this->app->bind(FixtureManager::class, DemoFixtureService::class);
        $this->app->bind(ActingForAuthorizer::class, ConsentActingForAuthorizer::class);
        $this->app->bind(OAuthLoginPort::class, DisabledOAuthLoginPort::class);

        $this->app->bind(OtpDeliveryChannel::class, function ($app): OtpDeliveryChannel {
            $mode = (string) config('serbizyu.providers.notifications.mode', 'disabled');
            $environment = (string) config('serbizyu.environment', config('app.env', 'local'));

            if (in_array($environment, ['local'], true) && in_array($mode, ['local', 'disabled', 'fake'], true)) {
                return $app->make(LogOtpDelivery::class);
            }

            // testing/capstone and other disposable modes use the inspectable fake adapter.
            return $app->make(FakeOtpDelivery::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $appUrl = (string) config('app.url', '');
        if (str_starts_with($appUrl, 'https://')) {
            URL::forceScheme('https');
        }

        if ((bool) config('serbizyu.validate_on_boot', true)) {
            app(EnvironmentValidator::class)->validate(config('serbizyu', []));
        }

        RateLimiter::for('listing-writes', function (Request $request): Limit {
            $actor = (string) (Auth::id() ?? $request->ip() ?? 'guest');

            return Limit::perMinute(30)->by($actor.'|'.$request->ip());
        });

        RateLimiter::for('listing-submits', function (Request $request): Limit {
            $actor = (string) (Auth::id() ?? $request->ip() ?? 'guest');

            return Limit::perMinute(10)->by($actor.'|'.$request->ip());
        });

        // Auth limiters — openspec/changes/hybrid-browser-auth-phone-step-up (P0b matrix).
        RateLimiter::for('auth-login', function (Request $request): Limit {
            $identifier = strtolower(trim((string) (
                $request->input('email')
                ?? $request->input('phone')
                ?? ''
            )));

            return Limit::perMinute(5)->by($identifier.'|'.$request->ip());
        });

        RateLimiter::for('auth-otp-request', function (Request $request): Limit {
            $phone = strtolower(trim((string) $request->input('phone', '')));

            return Limit::perMinute(6)->by($phone.'|'.$request->ip());
        });

        RateLimiter::for('auth-otp-verify', function (Request $request): Limit {
            $phone = strtolower(trim((string) $request->input('phone', '')));

            return Limit::perMinute(10)->by($phone.'|'.$request->ip());
        });

        RateLimiter::for('auth-onboarding', function (Request $request): Limit {
            $actor = (string) (Auth::id() ?? $request->ip() ?? 'guest');

            return Limit::perMinute(10)->by($actor.'|'.$request->ip());
        });

        RateLimiter::for('auth-email-link', function (Request $request): Limit {
            $actor = (string) (Auth::id() ?? $request->ip() ?? 'guest');

            return Limit::perMinute(6)->by($actor.'|'.$request->ip());
        });

        // P0c — password recovery (openspec hybrid-browser-auth-phone-step-up §16).
        RateLimiter::for('auth-password-reset', function (Request $request): Limit {
            $identifier = strtolower(trim((string) (
                $request->input('email')
                ?? $request->input('phone')
                ?? ''
            )));

            return Limit::perMinute(3)->by($identifier.'|'.$request->ip());
        });

        RateLimiter::for('auth-password-reset-confirm', function (Request $request): Limit {
            return Limit::perMinute(3)->by($request->ip() ?? 'guest');
        });

        // Central password policy — defined once, used by onboarding + reset Form Requests.
        Password::defaults(function (): Password {
            return Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();
        });
    }
}
