<?php

namespace App\Providers;

use App\Modules\IdentityAccess\Application\Contracts\NotificationChannel;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use App\Modules\IdentityAccess\Infrastructure\Notifications\LogOtpDelivery;
use App\Modules\IdentityAccess\Infrastructure\Notifications\MailpitNotificationChannel;
use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\Contracts\PublicListingReader;
use App\Modules\Listings\Infrastructure\ListingRepository;
use App\Shared\Support\EnvironmentValidator;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

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
        $this->app->bind(PublicListingReader::class, ListingRepository::class);
        $this->app->bind(NotificationChannel::class, MailpitNotificationChannel::class);

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
    }
}
