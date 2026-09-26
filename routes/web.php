<?php

declare(strict_types=1);

use App\Http\Controllers\AdminIdentityVerificationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BrowseController;
use App\Http\Controllers\CapabilityController;
use App\Http\Controllers\DealChainController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\IdentityEvidenceController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\MyListingsController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\RequestController;
use App\Http\Middleware\EnsureAuthenticated;
use App\Modules\Catalogs\Application\DealChainCatalog;
use App\Modules\Catalogs\Application\WorkCatalog;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', BrowseController::class)->name('home');
Route::get('/mockup', static fn () => Inertia::render('MockupPreview'))->name('mockup');
Route::get('/auth/sign-in', [AuthController::class, 'showSignIn'])->name('auth.sign-in');
Route::post('/auth/phone/login', [AuthController::class, 'loginWithPhonePassword'])->middleware('throttle:auth-login')->name('auth.phone.login');
Route::post('/auth/email/login', [AuthController::class, 'loginWithEmail'])->middleware('throttle:auth-login')->name('auth.email.login');
Route::get('/auth/register', [AuthController::class, 'showRegister'])->name('auth.register');
Route::post('/auth/register/request', [AuthController::class, 'registerRequest'])->middleware('throttle:auth-otp-request')->name('auth.register.request');
Route::post('/auth/register/verify', [AuthController::class, 'registerVerify'])->middleware('throttle:auth-otp-verify')->name('auth.register.verify');
Route::post('/auth/register/reset', [AuthController::class, 'registerReset'])->name('auth.register.reset');
Route::post('/auth/email/link', [AuthController::class, 'linkEmail'])
    ->middleware([EnsureAuthenticated::class, 'throttle:auth-email-link'])
    ->name('auth.email.link');
Route::get('/auth/phone', [AuthController::class, 'show'])->name('auth.phone');
Route::post('/auth/phone/request', [AuthController::class, 'requestCode'])->middleware('throttle:auth-otp-request')->name('auth.phone.request');
Route::post('/auth/phone/verify', [AuthController::class, 'verifyCode'])->middleware('throttle:auth-otp-verify')->name('auth.phone.verify');
Route::get('/auth/password/forgot', [AuthController::class, 'showForgot'])->name('auth.password.forgot');
Route::post('/auth/password/email', [AuthController::class, 'sendResetLink'])->middleware('throttle:auth-password-reset')->name('auth.password.email');
Route::post('/auth/password/phone', [AuthController::class, 'requestSmsReset'])->middleware('throttle:auth-password-reset')->name('auth.password.phone');
Route::get('/auth/password/reset', [AuthController::class, 'showReset'])->name('auth.password.reset');
Route::post('/auth/password/reset', [AuthController::class, 'resetWithToken'])->middleware('throttle:auth-password-reset-confirm')->name('auth.password.reset.submit');
Route::post('/auth/password/phone/verify', [AuthController::class, 'resetWithSmsOtp'])->middleware('throttle:auth-password-reset-confirm')->name('auth.password.phone.verify');
Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
Route::get('/health/ready', [HealthController::class, 'readiness'])->name('health.ready');
Route::get('/onboarding', [HomeController::class, 'showOnboarding'])
    ->middleware([EnsureAuthenticated::class])
    ->name('onboarding');
Route::post('/onboarding', [HomeController::class, 'onboarding'])
    ->middleware([EnsureAuthenticated::class, 'throttle:auth-onboarding'])
    ->name('onboarding.store');
Route::get('/my-listings', MyListingsController::class)
    ->middleware(EnsureAuthenticated::class)
    ->name('listings.mine');
Route::get('/my-listings/{listing}', [MyListingsController::class, 'show'])
    ->middleware(EnsureAuthenticated::class)
    ->name('listings.preview');

Route::get('/browse', BrowseController::class)->name('browse');
Route::get('/listings/{listing}', [ListingController::class, 'show'])->name('listings.show');
Route::post('/listings', [ListingController::class, 'store'])
    ->middleware('throttle:listing-writes')
    ->name('listings.store');
Route::patch('/listings/{listing}', [ListingController::class, 'update'])
    ->middleware('throttle:listing-writes')
    ->name('listings.update');
Route::post('/listings/{listing}/submit', [ListingController::class, 'submit'])
    ->middleware('throttle:listing-submits')
    ->name('listings.submit');
Route::post('/listings/{listing}/protected-edit-attempt', [ListingController::class, 'protectedEditAttempt'])
    ->middleware('throttle:listing-writes')
    ->name('listings.protected-edit-attempt');

Route::middleware(EnsureAuthenticated::class)->group(function (): void {
    Route::get('/account/capabilities', [CapabilityController::class, 'index'])->name('account.capabilities.index');
    Route::post('/account/capabilities', [CapabilityController::class, 'store'])->name('account.capabilities.store');
    Route::delete('/account/capabilities/{role}', [CapabilityController::class, 'destroy'])->name('account.capabilities.destroy');
    Route::get('/account/readiness', [CapabilityController::class, 'readiness'])->name('account.readiness');
    Route::get('/requests/create', [RequestController::class, 'create'])->name('requests.create');
    Route::post('/requests', [RequestController::class, 'store'])->name('requests.store');
    Route::get('/listings/create/service', [ListingController::class, 'createService'])->name('listings.create.service');
    Route::get('/listings/create/product', [ListingController::class, 'createProduct'])->name('listings.create.product');
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/listings/{listing}/book', [OrderController::class, 'start'])
        ->middleware('throttle:30,1')
        ->name('orders.start');
    Route::post('/listings/{listing}/orders', [OrderController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('orders.propose');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('/orders/{order}/finalize', [OrderController::class, 'finalize'])
        ->middleware('throttle:30,1')
        ->name('orders.finalize');
    Route::post('/orders/{order}/work/propose-completion', [OrderController::class, 'proposeWorkCompletion'])
        ->name('orders.work.propose-completion');
    Route::post('/orders/{order}/work/signoff', [OrderController::class, 'signoffWork'])
        ->name('orders.work.signoff');
    Route::post('/orders/{order}/courier/pickup', [OrderController::class, 'courierPickup'])
        ->name('orders.courier.pickup');
    Route::post('/orders/{order}/courier/handoff', [OrderController::class, 'courierHandoff'])
        ->name('orders.courier.handoff');
    Route::post('/deal-chains/authorize', [DealChainController::class, 'authorize'])
        ->middleware('throttle:30,1')
        ->name('deal-chains.authorize');
    Route::get('/deal-chains/{dealChain}', [DealChainController::class, 'show'])
        ->name('deal-chains.show');
    Route::get('/api/deal-chains/slot-candidates', [DealChainController::class, 'slotCandidates'])
        ->name('deal-chains.slot-candidates');

    // Participant identity evidence & verifications
    Route::post('/account/identity/evidence', [IdentityEvidenceController::class, 'store'])->name('account.identity.evidence.store');
    Route::get('/account/identity/evidence', [IdentityEvidenceController::class, 'index'])->name('account.identity.evidence.index');
    Route::get('/account/identity/evidence/{id}/file', [IdentityEvidenceController::class, 'download'])->name('account.identity.evidence.download');
    Route::delete('/account/identity/evidence/{id}', [IdentityEvidenceController::class, 'destroy'])->name('account.identity.evidence.destroy');
    Route::get('/account/identity/trust-level', [IdentityEvidenceController::class, 'trustLevel'])->name('account.identity.trust-level');

    // Admin identity verification review & retention holds
    Route::get('/admin/identity-verifications', [AdminIdentityVerificationController::class, 'index'])->name('admin.identity-verifications.index');
    Route::post('/admin/identity-verifications/{id}/review', [AdminIdentityVerificationController::class, 'review'])->name('admin.identity-verifications.review');
    Route::post('/admin/identity/retention-holds', [AdminIdentityVerificationController::class, 'createRetentionHold'])->name('admin.identity.retention-holds.store');
    Route::delete('/admin/identity/retention-holds/{id}', [AdminIdentityVerificationController::class, 'releaseRetentionHold'])->name('admin.identity.retention-holds.destroy');
});

Route::get('/users/{userId}/trust-profile', [IdentityEvidenceController::class, 'publicTrustProfile'])->name('users.trust-profile');

Route::get('/admin', fn () => Inertia::render('Admin/Triage'))->name('admin.triage');
Route::get('/admin/triage', fn () => Inertia::render('Admin/Triage'))->name('admin.triage.index');
Route::get('/admin/inspect', function () {
    return Inertia::render('Admin/Inspector/Show', [
        'orderRef' => request()->query('ref', request()->query('order', 'ORD-2026-09')),
    ]);
})->name('admin.inspect');
Route::get('/admin/inspector', function () {
    return Inertia::render('Admin/Inspector/Show', [
        'orderRef' => request()->query('ref', request()->query('order', 'ORD-2026-09')),
    ]);
})->name('admin.inspector');
Route::get('/admin/orders', fn () => Inertia::render('Admin/Orders/Index'))->name('admin.orders.index');
Route::get('/admin/listings', fn () => Inertia::render('Admin/Listings/Index'))->name('admin.listings.index');
Route::get('/admin/tenders', fn () => Inertia::render('Admin/Tenders/Index'))->name('admin.tenders.index');
Route::get('/admin/requests', fn () => Inertia::render('Admin/Tenders/Index'))->name('admin.requests.index');
Route::get('/admin/users', fn () => Inertia::render('Admin/Users/Index'))->name('admin.users.index');
Route::get('/admin/catalogs/work', fn (WorkCatalog $catalog) => Inertia::render('Admin/Catalogs/WorkCatalog', [
    'workCatalog' => $catalog->frontend(),
]))->name('admin.catalogs.work');
Route::get('/admin/catalogs/deal-chains', fn (DealChainCatalog $catalog) => Inertia::render('Admin/Catalogs/DealChainStudio', [
    'dealChainCatalog' => $catalog->frontend(),
]))->name('admin.catalogs.deal-chains');
Route::get('/admin/catalogs/taxonomy', fn () => Inertia::render('Admin/Catalogs/TaxonomyStudio'))->name('admin.catalogs.taxonomy');
Route::get('/admin/financials', fn () => Inertia::render('Admin/Financials/Index'))->name('admin.financials.index');
Route::get('/admin/disputes', fn () => Inertia::render('Admin/Disputes/Index'))->name('admin.disputes.index');
Route::get('/admin/telemetry', fn () => Inertia::render('Admin/System/TelemetryIndex'))->name('admin.telemetry.index');
Route::get('/admin/system-health', fn () => Inertia::render('Admin/System/TelemetryIndex'))->name('admin.system-health');
Route::get('/admin/outbox', fn () => Inertia::render('Admin/System/TelemetryIndex'))->name('admin.outbox');
Route::get('/admin/audit', fn () => Inertia::render('Admin/System/TelemetryIndex'))->name('admin.audit');
Route::get('/admin/holds', fn () => Inertia::render('Admin/Disputes/Index'))->name('admin.holds');
Route::get('/admin/capabilities', fn () => Inertia::render('Admin/Users/Index'))->name('admin.capabilities');
Route::get('/picks', fn (DealChainCatalog $catalog) => Inertia::render('Picks', [
    'dealChainCatalog' => $catalog->frontend(),
]))->name('picks');
Route::get('/dev/mobile-kernel', fn () => Inertia::render('Dev/MobileKernelShowcase'))->name('dev.mobile-kernel');
Route::get('/dev/true-ui-kit', fn () => Inertia::render('Dev/TrueUIKitShowcase'))->name('dev.true-ui-kit');
