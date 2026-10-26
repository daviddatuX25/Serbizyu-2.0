<?php

declare(strict_types=1);

use App\Http\Controllers\A9DeliveryController;
use App\Http\Controllers\AdminDealChainCatalogController;
use App\Http\Controllers\AdminIdentityVerificationController;
use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AppointmentBookingController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BrowseController;
use App\Http\Controllers\CapabilityController;
use App\Http\Controllers\CommunicationsController;
use App\Http\Controllers\StaffWorkspaceController;
use App\Http\Controllers\StaffGovernanceController;
use App\Http\Controllers\LuponPacketController;
use App\Http\Controllers\DealChainController;
use App\Http\Controllers\DealChainReviewController;
use App\Http\Controllers\DealInvitationController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\IdentityEvidenceController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ListingReviewController;
use App\Http\Controllers\MyListingsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderWorkChallengeController;
use App\Http\Controllers\PaymentObligationController;
use App\Http\Controllers\RequestController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TelemetryController;
use App\Http\Controllers\TenderWorkspaceController;
use App\Http\Controllers\WorkEvidenceController;
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
Route::get('/requests/create', [RequestController::class, 'create'])->name('requests.create');
Route::get('/requests/{id}', [RequestController::class, 'show'])->whereUuid('id')->name('requests.show');
Route::get('/listings/create', [ListingController::class, 'create'])->name('listings.create');
Route::get('/listings/create/service', [ListingController::class, 'createService'])->name('listings.create.service');
Route::get('/listings/create/product', [ListingController::class, 'createProduct'])->name('listings.create.product');
Route::get('/listings/{listing}', [ListingController::class, 'show'])->whereUuid('listing')->name('listings.show');
Route::post('/listings', [ListingController::class, 'store'])
    ->middleware('throttle:listing-writes')
    ->name('listings.store');
Route::patch('/listings/{listing}', [ListingController::class, 'update'])
    ->middleware('throttle:listing-writes')
    ->name('listings.update');
Route::post('/listings/{listing}/submit', [ListingController::class, 'submit'])
    ->middleware('throttle:listing-submits')
    ->name('listings.submit');
Route::post('/listings/{listing}/pause', [ListingController::class, 'pause'])
    ->middleware('throttle:listing-writes')
    ->name('listings.pause');
Route::post('/listings/{listing}/resume', [ListingController::class, 'resume'])
    ->middleware('throttle:listing-writes')
    ->name('listings.resume');
Route::post('/listings/{listing}/archive', [ListingController::class, 'archive'])
    ->middleware('throttle:listing-writes')
    ->name('listings.archive');
Route::post('/listings/{listing}/protected-edit-attempt', [ListingController::class, 'protectedEditAttempt'])
    ->middleware('throttle:listing-writes')
    ->name('listings.protected-edit-attempt');
Route::post('/api/telemetry/events', [TelemetryController::class, 'recordEvents'])
    ->middleware('throttle:60,1')
    ->name('telemetry.events');
Route::get('/api/deal-chains/slot-candidates', [DealChainController::class, 'slotCandidates'])
    ->middleware('throttle:60,1')
    ->name('deal-chains.slot-candidates');
Route::middleware(EnsureAuthenticated::class)->group(function (): void {
    Route::get('/stock', [StockController::class, 'index'])->name('stock.index');
    Route::get('/stock/{capacity}', [StockController::class, 'show'])->whereUuid('capacity')->name('stock.show');
    Route::post('/stock/{capacity}/adjustments', [StockController::class, 'adjust'])->whereUuid('capacity')->name('stock.adjustment');
    Route::get('/my-requests', [TenderWorkspaceController::class, 'requests'])->name('requests.mine');
    Route::get('/my-quotes', [TenderWorkspaceController::class, 'quotes'])->name('quotes.mine');
    Route::get('/money-history', [PaymentObligationController::class, 'moneyHistory'])->name('payments.money-history');
    Route::get('/listings/{listing}/appointment-slots', [AppointmentController::class, 'slots'])->name('appointments.slots');
    Route::post('/listings/{listing}/appointment-holds', [AppointmentController::class, 'hold'])->name('appointments.holds');
    Route::get('/listings/{listing}/appointment-booking', [AppointmentBookingController::class, 'show'])->name('listings.appointment-booking');
    Route::get('/agenda', [AgendaController::class, 'index'])->name('agenda.index');
    Route::post('/agenda/blocks', [AgendaController::class, 'storeBlock'])->name('agenda.blocks.store');
    Route::delete('/agenda/blocks/{block}', [AgendaController::class, 'destroyBlock'])->name('agenda.blocks.destroy');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/summary', [NotificationController::class, 'summary'])->name('notifications.summary');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead'])
        ->whereUuid('notification')->name('notifications.read');
    Route::post('/orders/{order}/conversation', [CommunicationsController::class, 'openOrder'])
        ->whereUuid('order')->name('conversations.orders.open');
    Route::post('/deal-chains/{dealChain}/relay', [CommunicationsController::class, 'openRelay'])
        ->whereUuid('dealChain')->name('conversations.relay.open');
    Route::post('/support-cases', [CommunicationsController::class, 'createCase'])->name('support-cases.store');
    Route::post('/support-cases/{case}/conversation', [CommunicationsController::class, 'openCase'])
        ->whereUuid('case')->name('conversations.cases.open');
    Route::get('/conversations/{conversation}', [CommunicationsController::class, 'show'])
        ->whereUuid('conversation')->name('conversations.show');
    Route::get('/conversations/{conversation}/messages', [CommunicationsController::class, 'messages'])
        ->whereUuid('conversation')->name('conversations.messages.index');
    Route::post('/conversations/{conversation}/messages', [CommunicationsController::class, 'storeMessage'])
        ->whereUuid('conversation')->name('conversations.messages.store');
    Route::get('/conversations/{conversation}/attachments/{evidence}', [CommunicationsController::class, 'downloadAttachment'])
        ->whereUuid('conversation')->whereUuid('evidence')->name('conversations.attachments.download');
    Route::post('/orders/{order}/schedule-change-requests', [AppointmentController::class, 'proposeChange'])->name('orders.schedule-change-requests.store');
    Route::post('/orders/{order}/schedule-change-requests/{request}/{action}', [AppointmentController::class, 'respondToChange'])
        ->where('action', 'accept|reject|withdraw')->name('orders.schedule-change-requests.respond');
    Route::post('/orders/{order}/payment-obligations/{obligation}/lane', [PaymentObligationController::class, 'chooseLane'])->name('orders.payment-obligations.lane');
    Route::post('/orders/{order}/payment-obligations/{obligation}/cash/report', [PaymentObligationController::class, 'reportCash'])->name('orders.payment-obligations.cash.report');
    Route::post('/orders/{order}/payment-obligations/{obligation}/cash/acknowledge', [PaymentObligationController::class, 'acknowledgeCash'])->name('orders.payment-obligations.cash.acknowledge');
    Route::post('/orders/{order}/payment-obligations/{obligation}/p2p/proof', [PaymentObligationController::class, 'uploadP2pProof'])->name('orders.payment-obligations.p2p.proof');
    Route::post('/orders/{order}/payment-obligations/{obligation}/p2p/verify', [PaymentObligationController::class, 'verifyP2pPayment'])->name('orders.payment-obligations.p2p.verify');
    Route::post('/orders/{order}/payment-obligations/{obligation}/p2p/reject', [PaymentObligationController::class, 'rejectP2pProof'])->name('orders.payment-obligations.p2p.reject');
    Route::get('/orders/{order}/payment-obligations/{obligation}/p2p/proof', [PaymentObligationController::class, 'downloadP2pProof'])->name('orders.payment-obligations.p2p.proof.show');
    Route::post('/orders/{order}/payment-obligations/{obligation}/mismatch', [PaymentObligationController::class, 'flagPaymentMismatch'])->name('orders.payment-obligations.mismatch');
    Route::post('/orders/{order}/deliveries', [A9DeliveryController::class, 'create'])->name('orders.deliveries.create');
    Route::post('/orders/{order}/deliveries/{delivery}/files', [A9DeliveryController::class, 'upload'])->name('orders.deliveries.files.store');
    Route::post('/orders/{order}/deliveries/{delivery}/submit', [A9DeliveryController::class, 'submit'])->name('orders.deliveries.submit');
    Route::post('/orders/{order}/revision-requests', [A9DeliveryController::class, 'requestRevision'])->name('orders.deliveries.revision');
    Route::post('/orders/{order}/deliveries/{delivery}/accept', [A9DeliveryController::class, 'accept'])->name('orders.deliveries.accept');
    Route::get('/orders/{order}/deliveries/{delivery}/files/{file}', [A9DeliveryController::class, 'download'])->name('orders.deliveries.files.show');
    Route::get('/account/capabilities', [CapabilityController::class, 'index'])->name('account.capabilities.index');
    Route::post('/account/capabilities', [CapabilityController::class, 'store'])->name('account.capabilities.store');
    Route::delete('/account/capabilities/{role}', [CapabilityController::class, 'destroy'])->name('account.capabilities.destroy');
    Route::get('/account/readiness', [CapabilityController::class, 'readiness'])->name('account.readiness');
    Route::post('/requests', [RequestController::class, 'store'])->name('requests.store');
    Route::post('/requests/{id}/quotes', [RequestController::class, 'storeQuote'])->name('requests.quotes.store');
    Route::post('/requests/{id}/quotes/{quote}/accept', [RequestController::class, 'acceptQuote'])->name('requests.quotes.accept');
    Route::post('/requests/{id}/quotes/{quote}/counter', [RequestController::class, 'counterQuote'])->name('requests.quotes.counter');
    Route::get('/requests/{id}/quotes/{quote}/appointment-slots', [AppointmentController::class, 'quoteSlots'])->name('requests.quotes.appointment-slots');
    Route::post('/requests/{id}/quotes/{quote}/appointment-holds', [AppointmentController::class, 'quoteHold'])->name('requests.quotes.appointment-holds');
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/listings/{listing}/book', [OrderController::class, 'start'])
        ->middleware('throttle:30,1')
        ->name('orders.start');
    Route::post('/listings/{listing}/orders', [OrderController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('orders.propose');
    Route::get('/orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('/orders/{order}/accept', [OrderController::class, 'accept'])->middleware('throttle:30,1')->name('orders.accept');
    Route::post('/orders/{order}/decline', [OrderController::class, 'decline'])->middleware('throttle:30,1')->name('orders.decline');
    Route::post('/orders/{order}/counter', [OrderController::class, 'counter'])->middleware('throttle:30,1')->name('orders.counter');
    Route::post('/orders/{order}/amend', [OrderController::class, 'amend'])->middleware('throttle:30,1')->name('orders.amend');
    Route::post('/orders/{order}/proposals/{proposal}/accept', [OrderController::class, 'acceptProposal'])->middleware('throttle:30,1')->name('orders.proposals.accept');
    Route::post('/orders/{order}/work/propose-completion', [OrderController::class, 'proposeWorkCompletion'])
        ->name('orders.work.propose-completion');
    Route::post('/orders/{order}/work/signoff', [OrderController::class, 'signoffWork'])
        ->name('orders.work.signoff');
    Route::post('/orders/{order}/work-nodes/{node}', [OrderController::class, 'advanceWorkNode'])
        ->name('orders.work-nodes.advance');
    Route::post('/orders/{order}/work-nodes/{node}/clearance-challenges', [OrderWorkChallengeController::class, 'issue'])
        ->whereUuid('order')
        ->middleware('throttle:work-challenge-issue')
        ->name('orders.work-challenges.issue');
    Route::post('/orders/{order}/work-nodes/{node}/clearance-challenges/{challenge}/verify', [OrderWorkChallengeController::class, 'verify'])
        ->whereUuid('order')
        ->whereUuid('challenge')
        ->middleware('throttle:work-challenge-verify')
        ->name('orders.work-challenges.verify');
    Route::post('/orders/{order}/work-nodes/{node}/evidence', [WorkEvidenceController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('orders.work-evidence.store');
    Route::get('/orders/{order}/work-evidence/{evidence}', [WorkEvidenceController::class, 'show'])
        ->name('orders.work-evidence.show');
    Route::get('/orders/{order}/handoff', [OrderController::class, 'handoffShow'])->name('orders.handoff.show');
    Route::post('/orders/{order}/handoff/prepared', [OrderController::class, 'markPrepared'])->name('orders.handoff.prepared');
    Route::post('/orders/{order}/handoff/custody', [OrderController::class, 'offerCustody'])->name('orders.handoff.custody');
    Route::post('/orders/{order}/handoff/custody/{transfer}/accept', [OrderController::class, 'acceptCustody'])->name('orders.handoff.custody.accept');
    Route::post('/orders/{order}/handoff/receipt', [OrderController::class, 'recordReceipt'])->name('orders.handoff.receipt');
    Route::post('/deal-chains/authorize', [DealChainController::class, 'authorize'])
        ->middleware('throttle:30,1')
        ->name('deal-chains.authorize');
    Route::post('/orders/{order}/reviews', [ReviewController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('reviews.store');
    Route::post('/deal-chains/{dealChain}/reviews', [DealChainReviewController::class, 'store'])
        ->middleware('throttle:30,1')
        ->name('deal-chains.reviews.store');
    Route::get('/deal-chains/{dealChain}', [DealChainController::class, 'show'])
        ->name('deal-chains.show');
    Route::post('/deal-chains/{dealChain}/needs/{need}/confirm-agreement', [DealChainController::class, 'confirmAgreement'])
        ->middleware('throttle:30,1')->name('deal-chains.needs.confirm-agreement');
    Route::post('/deal-chains/{dealChain}/needs/{need}/withdraw', [DealChainController::class, 'withdrawPartner'])
        ->middleware('throttle:30,1')->name('deal-chains.needs.withdraw');
    Route::post('/deal-chains/{dealChain}/needs/{need}/replace', [DealChainController::class, 'chooseReplacement'])
        ->middleware('throttle:30,1')->name('deal-chains.needs.replace');
    Route::get('/deal-invitations', [DealInvitationController::class, 'index'])->name('deal-invitations.index');
    Route::post('/deal-invitations/{invitation}/respond', [DealChainController::class, 'respondToInvitation'])
        ->middleware('throttle:30,1')
        ->name('deal-invitations.respond');

    // Participant identity evidence & verifications
    Route::post('/account/identity/evidence', [IdentityEvidenceController::class, 'store'])->name('account.identity.evidence.store');
    Route::get('/account/identity/evidence', [IdentityEvidenceController::class, 'index'])->name('account.identity.evidence.index');
    Route::get('/account/identity/evidence/{id}/file', [IdentityEvidenceController::class, 'download'])->name('account.identity.evidence.download');
    Route::delete('/account/identity/evidence/{id}', [IdentityEvidenceController::class, 'destroy'])->name('account.identity.evidence.destroy');
    Route::get('/account/identity/trust-level', [IdentityEvidenceController::class, 'trustLevel'])->name('account.identity.trust-level');

    Route::middleware(EnsureAuthenticated::class.':admin')->group(function (): void {
        // Admin identity verification review & retention holds
        Route::get('/admin/identity-verifications', [AdminIdentityVerificationController::class, 'index'])->name('admin.identity-verifications.index');
        Route::post('/admin/identity-verifications/{id}/review', [AdminIdentityVerificationController::class, 'review'])->name('admin.identity-verifications.review');
        Route::post('/admin/identity/retention-holds', [AdminIdentityVerificationController::class, 'createRetentionHold'])->name('admin.identity.retention-holds.store');
        Route::delete('/admin/identity/retention-holds/{id}', [AdminIdentityVerificationController::class, 'releaseRetentionHold'])->name('admin.identity.retention-holds.destroy');
    });
});

Route::get('/users/{userId}/trust-profile', [IdentityEvidenceController::class, 'publicTrustProfile'])->name('users.trust-profile');

Route::middleware(EnsureAuthenticated::class.':admin')->group(function (): void {
    Route::post('/admin/payment-mismatches/{case}/resolve', [PaymentObligationController::class, 'resolveMismatch'])->name('admin.payment-mismatches.resolve');
    Route::post('/admin/support-cases/{case}/assign', [StaffGovernanceController::class, 'assign'])
        ->whereUuid('case')->name('admin.support-cases.assign');
    Route::post('/admin/support-cases/{case}/resolve', [StaffGovernanceController::class, 'resolve'])
        ->whereUuid('case')->name('admin.support-cases.resolve');
    Route::post('/admin/command-approvals', [StaffGovernanceController::class, 'requestApproval'])
        ->name('admin.command-approvals.store');
    Route::post('/admin/command-approvals/{approval}/approve', [StaffGovernanceController::class, 'approve'])
        ->whereUuid('approval')->name('admin.command-approvals.approve');
    Route::post('/admin/command-approvals/{approval}/execute', [StaffGovernanceController::class, 'execute'])
        ->whereUuid('approval')->name('admin.command-approvals.execute');
    Route::post('/admin/support-cases/{case}/lupon-packets', [LuponPacketController::class, 'create'])
        ->whereUuid('case')->name('admin.lupon-packets.store');
    Route::get('/admin/lupon-packets/{packet}/artifacts/{artifact}', [LuponPacketController::class, 'artifact'])
        ->whereUuid('packet')->whereUuid('artifact')->name('admin.lupon-packets.artifact');
    Route::post('/admin/lupon-packets/{packet}/transmission', [LuponPacketController::class, 'transmit'])
        ->whereUuid('packet')->name('admin.lupon-packets.transmission');
    Route::post('/admin/lupon-packets/{packet}/returned-paperwork', [LuponPacketController::class, 'returnedPaperwork'])
        ->whereUuid('packet')->name('admin.lupon-packets.returned-paperwork');
    Route::get('/admin/lupon-packets/{packet}/returned-paperwork', [LuponPacketController::class, 'returnedPaperworkFile'])
        ->whereUuid('packet')->name('admin.lupon-packets.returned-paperwork-file');
    Route::post('/admin/lupon-packets/{packet}/archive', [LuponPacketController::class, 'archive'])
        ->whereUuid('packet')->name('admin.lupon-packets.archive');
    Route::get('/admin', [StaffWorkspaceController::class, 'inbox'])->name('admin.triage');
    Route::get('/admin/triage', [StaffWorkspaceController::class, 'inbox'])->name('admin.triage.index');
    Route::get('/admin/inspect', [StaffWorkspaceController::class, 'inspect'])->name('admin.inspect');
    Route::get('/admin/orders', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'orders')->name('admin.orders.index');
    Route::get('/admin/listings', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'listings')->name('admin.listings.index');
    Route::post('/admin/listings/{listing}/approve', [ListingReviewController::class, 'approve'])
        ->whereUuid('listing')->name('admin.listings.approve');
    Route::post('/admin/listings/{listing}/reject', [ListingReviewController::class, 'reject'])
        ->whereUuid('listing')->name('admin.listings.reject');
    Route::get('/admin/tenders', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'tenders')->name('admin.tenders.index');
    Route::get('/admin/users', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'users')->name('admin.users.index');
    Route::prefix('/admin/catalogs')
        ->name('admin.catalogs.')
        ->group(function (): void {
            Route::get('/work', fn (WorkCatalog $catalog) => Inertia::render('Admin/Catalogs/WorkCatalog', [
                'workCatalog' => $catalog->frontend(),
            ]))->name('work');
            Route::get('/deal-chains', [AdminDealChainCatalogController::class, 'index'])->name('deal-chains');
            Route::post('/deal-chains/recipes', [AdminDealChainCatalogController::class, 'storeRecipe'])->name('deal-chains.recipes.store');
            Route::post('/deal-chains/recipes/{recipeCode}/publish', [AdminDealChainCatalogController::class, 'publishRecipe'])->name('deal-chains.recipes.publish');
            Route::get('/taxonomy', fn () => Inertia::render('Admin/Catalogs/TaxonomyStudio'))->name('taxonomy');
        });
    Route::get('/admin/financials', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'financials')->name('admin.financials.index');
    Route::get('/admin/disputes', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'disputes')->name('admin.disputes.index');
    Route::get('/admin/telemetry', [StaffWorkspaceController::class, 'registry'])->defaults('kind', 'telemetry')->name('admin.telemetry.index');
});
Route::get('/picks', fn (DealChainCatalog $catalog) => Inertia::render('Picks', [
    'dealChainCatalog' => $catalog->frontend(),
]))->name('picks');
Route::get('/dev/mobile-kernel', fn () => Inertia::render('Dev/MobileKernelShowcase'))->name('dev.mobile-kernel');
Route::get('/dev/true-ui-kit', fn () => Inertia::render('Dev/TrueUIKitShowcase'))->name('dev.true-ui-kit');
Route::redirect('/dev/ui-kit', '/dev/true-ui-kit');
