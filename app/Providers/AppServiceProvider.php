<?php

namespace App\Providers;

use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\Catalogs\Application\WorkCatalog;
use App\Modules\DealCoordination\Application\DealChainCourierAuthority;
use App\Modules\DealCoordination\Application\DealDeliveredToSiteHandler;
use App\Modules\DealCoordination\Application\DealNeedOrderLinkService;
use App\Modules\DealCoordination\Application\DealChainCurrentChildrenReader;
use App\Modules\DealCoordination\Application\DealChainConversationParticipantsReader;
use App\Modules\DealCoordination\Application\DealReadyForCollectionHandler;
use App\Modules\DealCoordination\Application\DealWorkCompletedHandler;
use App\Modules\DealCoordination\Application\DealWorkGateAdapter;
use App\Modules\IdentityAccess\Application\ConsentActingForAuthorizer;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryChannel;
use App\Modules\IdentityAccess\Application\Contracts\OtpDeliveryInspector;
use App\Modules\IdentityAccess\Application\DemoFixtureService;
use App\Modules\IdentityAccess\Application\IdentityAccessApplicationParticipantDisplayNameReader;
use App\Modules\IdentityAccess\Application\PrivateEvidenceReader;
use App\Modules\IdentityAccess\Application\RoleAssignmentService;
use App\Modules\IdentityAccess\Application\StaffAccessService;
use App\Modules\IdentityAccess\Infrastructure\Auth\DisabledOAuthLoginPort;
use App\Modules\IdentityAccess\Infrastructure\Notifications\FakeOtpDelivery;
use App\Modules\IdentityAccess\Infrastructure\Notifications\LogOtpDelivery;
use App\Modules\Listings\Application\Contracts\ListingCommandStore;
use App\Modules\Listings\Application\Contracts\PublicListingReader;
use App\Modules\Listings\Application\OrderCapacityAdapter;
use App\Modules\Listings\Application\OrderListingSourceAdapter;
use App\Modules\Listings\Infrastructure\ListingRepository;
use App\Modules\Operations\Application\InAppNotificationHandler;
use App\Modules\Operations\Infrastructure\DatabaseNotificationsAdapter;
use App\Modules\OrdersWork\Application\DefaultWorkContractRegistry;
use App\Modules\OrdersWork\Application\FormDealNeedChildOrder;
use App\Modules\OrdersWork\Application\OrderConversationScopeReader;
use App\Modules\OrdersWork\Application\ConversationEvidenceReader;
use App\Modules\PaymentObligations\Application\PaymentConversationEvidenceReader;
use App\Modules\OrdersWork\Application\DealPartnerOrderAdapter;
use App\Modules\OrdersWork\Application\FormQuoteAwardOrder;
use App\Modules\OrdersWork\Application\OrderReferenceReaderAdapter;
use App\Modules\OrdersWork\Application\ScanWorkEvidenceHandler;
use App\Modules\OrdersWork\Application\WorkContractRegistry;
use App\Modules\OrdersWork\Application\WorkMilestoneReaderAdapter;
use App\Modules\OrdersWork\Infrastructure\LocalEvidenceScanner;
use App\Modules\PaymentObligations\Application\OrderPaymentObligationAdapter;
use App\Modules\PaymentObligations\Application\DealChildFinancialStateReader;
use App\Modules\TrustSupport\Application\ListingReviewService;
use App\Modules\TrustSupport\Application\DealCourierReconciliationCaseAdapter;
use App\Modules\OrdersWork\Application\ReviewOrderReaderAdapter;
use App\Modules\TrustSupport\Application\TrustSupportCaseAdapter;
use App\Shared\Application\InboxConsumer;
use App\Shared\Application\OutboxConsumerHandler;
use App\Shared\Application\OutboxDispatcher;
use App\Shared\Contracts\ActingForAuthorizer;
use App\Shared\Contracts\ChildOrderFormationPort;
use App\Shared\Contracts\DealChainRecipeCatalogPort;
use App\Shared\Contracts\DealChainCurrentChildrenPort;
use App\Shared\Contracts\DealChainConversationParticipantsPort;
use App\Shared\Contracts\DealNeedOrderLinkPort;
use App\Shared\Contracts\DealChildFinancialStatePort;
use App\Shared\Contracts\OrderConversationScopePort;
use App\Shared\Contracts\WorkConversationEvidencePort;
use App\Shared\Contracts\PaymentConversationEvidencePort;
use App\Shared\Contracts\PrivateEvidenceReaderPort;
use App\Shared\Contracts\DealCourierReconciliationPort;
use App\Shared\Contracts\ReviewOrderReaderPort;
use App\Shared\Contracts\DealPartnerOrderPort;
use App\Shared\Contracts\DealWorkGatePort;
use App\Shared\Contracts\EvidenceScanPort;
use App\Shared\Contracts\FixtureManager;
use App\Shared\Contracts\ListingReviewReaderPort;
use App\Shared\Contracts\ListingTelemetryQueryPort;
use App\Shared\Contracts\NotificationsPort;
use App\Shared\Contracts\OAuthLoginPort;
use App\Shared\Contracts\OrderCapacityPort;
use App\Shared\Contracts\OrderHandoffCourierAuthorityPort;
use App\Shared\Contracts\OrderListingSourcePort;
use App\Shared\Contracts\OrderPaymentObligationPort;
use App\Shared\Contracts\OrderReferenceReaderPort;
use App\Shared\Contracts\OwnerListingReader;
use App\Shared\Contracts\ParticipantDisplayNameReaderPort;
use App\Shared\Contracts\PaymentMismatchCasePort;
use App\Shared\Contracts\QuoteAwardOrderFormationPort;
use App\Shared\Contracts\RoleCapabilityReaderPort;
use App\Shared\Contracts\StaffAccessPort;
use App\Shared\Contracts\WorkMilestoneReaderPort;
use App\Shared\Contracts\WorkSpecificationPort;
use App\Shared\Infrastructure\Telemetry\ListingTelemetryService;
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
        $this->app->singleton(OtpDeliveryInspector::class, FakeOtpDelivery::class);
        $this->app->bind(ListingCommandStore::class, ListingRepository::class);
        $this->app->bind(OwnerListingReader::class, ListingRepository::class);
        $this->app->bind(PublicListingReader::class, ListingRepository::class);
        $this->app->bind(OrderListingSourcePort::class, OrderListingSourceAdapter::class);
        $this->app->bind(OrderCapacityPort::class, OrderCapacityAdapter::class);
        $this->app->bind(OrderPaymentObligationPort::class, OrderPaymentObligationAdapter::class);
        $this->app->bind(OrderReferenceReaderPort::class, OrderReferenceReaderAdapter::class);
        $this->app->bind(OrderHandoffCourierAuthorityPort::class, DealChainCourierAuthority::class);
        $this->app->bind(ParticipantDisplayNameReaderPort::class, IdentityAccessApplicationParticipantDisplayNameReader::class);
        $this->app->bind(PaymentMismatchCasePort::class, TrustSupportCaseAdapter::class);
        $this->app->bind(ChildOrderFormationPort::class, FormDealNeedChildOrder::class);
        $this->app->bind(DealNeedOrderLinkPort::class, DealNeedOrderLinkService::class);
        $this->app->bind(DealWorkGatePort::class, DealWorkGateAdapter::class);
        $this->app->bind(WorkMilestoneReaderPort::class, WorkMilestoneReaderAdapter::class);
        $this->app->bind(NotificationsPort::class, DatabaseNotificationsAdapter::class);
        $this->app->bind(DealPartnerOrderPort::class, DealPartnerOrderAdapter::class);
        $this->app->bind(DealChildFinancialStatePort::class, DealChildFinancialStateReader::class);
        $this->app->bind(DealChainCurrentChildrenPort::class, DealChainCurrentChildrenReader::class);
        $this->app->bind(DealCourierReconciliationPort::class, DealCourierReconciliationCaseAdapter::class);
        $this->app->bind(ReviewOrderReaderPort::class, ReviewOrderReaderAdapter::class);
        $this->app->bind(DealChainConversationParticipantsPort::class, DealChainConversationParticipantsReader::class);
        $this->app->bind(OrderConversationScopePort::class, OrderConversationScopeReader::class);
        $this->app->bind(WorkConversationEvidencePort::class, ConversationEvidenceReader::class);
        $this->app->bind(PaymentConversationEvidencePort::class, PaymentConversationEvidenceReader::class);
        $this->app->bind(PrivateEvidenceReaderPort::class, PrivateEvidenceReader::class);
        foreach ([
            \App\Shared\Contracts\CommandApprovalStorePort::class => \App\Shared\Infrastructure\DatabaseCommandApprovalStore::class,
            \App\Shared\Contracts\AdministrativeHoldReaderPort::class => \App\Modules\TrustSupport\Application\AdministrativeHoldReaderAdapter::class,
            \App\Shared\Contracts\AdministrativeOrderVersionPort::class => \App\Modules\OrdersWork\Application\AdministrativeOrderVersionAdapter::class,
            \App\Shared\Contracts\AdministrativeWorkVersionPort::class => \App\Modules\OrdersWork\Application\AdministrativeWorkVersionAdapter::class,
            \App\Shared\Contracts\AdministrativePaymentVersionPort::class => \App\Modules\PaymentObligations\Application\AdministrativePaymentVersionAdapter::class,
            \App\Shared\Contracts\StaffDirectoryPort::class => \App\Modules\IdentityAccess\Application\StaffDirectoryAdapter::class,
            \App\Shared\Contracts\LuponEvidenceReaderPort::class => \App\Modules\IdentityAccess\Application\LuponEvidenceReader::class,
            \App\Shared\Contracts\LuponReturnedPaperworkPort::class => \App\Modules\IdentityAccess\Application\LuponReturnedPaperworkStore::class,
            \App\Shared\Contracts\CohortClassificationReaderPort::class => \App\Shared\Infrastructure\DatabaseCohortClassificationReader::class,
            \App\Shared\Contracts\StaffCaseReaderPort::class => \App\Modules\TrustSupport\Application\StaffCaseReaderAdapter::class,
            \App\Shared\Contracts\StaffOrdersReaderPort::class => \App\Modules\OrdersWork\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffPaymentsReaderPort::class => \App\Modules\PaymentObligations\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffListingsReaderPort::class => \App\Modules\Listings\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffTendersReaderPort::class => \App\Modules\Tenders\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffIdentityReaderPort::class => \App\Modules\IdentityAccess\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffDealChainsReaderPort::class => \App\Modules\DealCoordination\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffTrustSupportReaderPort::class => \App\Modules\TrustSupport\Application\StaffDomainReader::class,
            \App\Shared\Contracts\StaffEvidenceReaderPort::class => \App\Modules\IdentityAccess\Application\StaffEvidenceReader::class,
            \App\Shared\Contracts\StaffAuditReaderPort::class => \App\Shared\Infrastructure\DatabaseStaffAuditReader::class,
        ] as $contract => $implementation) {
            $this->app->bind($contract, $implementation);
        }
        $this->app->bind(FixtureManager::class, DemoFixtureService::class);
        $this->app->bind(ActingForAuthorizer::class, ConsentActingForAuthorizer::class);
        $this->app->bind(StaffAccessPort::class, StaffAccessService::class);
        $this->app->bind(RoleCapabilityReaderPort::class, RoleAssignmentService::class);
        $this->app->bind(OAuthLoginPort::class, DisabledOAuthLoginPort::class);
        $this->app->singleton(WorkContractRegistry::class, DefaultWorkContractRegistry::class);
        $this->app->singleton(WorkSpecificationPort::class, WorkCatalog::class);
        $this->app->bind(QuoteAwardOrderFormationPort::class, FormQuoteAwardOrder::class);
        $this->app->singleton(DealChainRecipeCatalogPort::class, DealChainCatalog::class);
        $this->app->bind(EvidenceScanPort::class, LocalEvidenceScanner::class);
        $this->app->tag([ScanWorkEvidenceHandler::class], OutboxConsumerHandler::class);
        $this->app->tag([InAppNotificationHandler::class], OutboxConsumerHandler::class);
        $this->app->tag([
            DealReadyForCollectionHandler::class,
            DealDeliveredToSiteHandler::class,
            DealWorkCompletedHandler::class,
        ], OutboxConsumerHandler::class);
        $this->app->singleton(OutboxDispatcher::class, fn ($app): OutboxDispatcher => new OutboxDispatcher(
            $app->tagged(OutboxConsumerHandler::class),
            $app->make(InboxConsumer::class),
        ));
        $this->app->singleton(ListingTelemetryQueryPort::class, ListingTelemetryService::class);
        $this->app->singleton(ListingReviewReaderPort::class, ListingReviewService::class);
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
        $isNgrok = (isset($_SERVER['HTTP_HOST']) && str_contains((string) $_SERVER['HTTP_HOST'], 'ngrok'))
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        if (str_starts_with($appUrl, 'https://') || $isNgrok) {
            URL::forceScheme('https');
            $_SERVER['HTTPS'] = 'on';
            if ($this->app->bound('request')) {
                $this->app->make('request')->server->set('HTTPS', 'on');
            }
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

        RateLimiter::for('work-challenge-issue', function (Request $request): Limit {
            return Limit::perMinute(6)->by((string) (Auth::id() ?? $request->ip()));
        });

        RateLimiter::for('work-challenge-verify', function (Request $request): Limit {
            return Limit::perMinute(10)->by((string) (Auth::id() ?? $request->ip()));
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
