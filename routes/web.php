<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BrowseController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\MyListingsController;
use App\Http\Controllers\OrderController;
use App\Http\Middleware\EnsureAuthenticated;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('/auth/sign-in', [AuthController::class, 'showSignIn'])->name('auth.sign-in');
Route::post('/auth/phone/login', [AuthController::class, 'loginWithPhonePassword'])->middleware('throttle:auth-login')->name('auth.phone.login');
Route::post('/auth/email/login', [AuthController::class, 'loginWithEmail'])->middleware('throttle:auth-login')->name('auth.email.login');
Route::get('/auth/register', [AuthController::class, 'showRegister'])->name('auth.register');
Route::post('/auth/register/request', [AuthController::class, 'registerRequest'])->middleware('throttle:auth-otp-request')->name('auth.register.request');
Route::post('/auth/register/verify', [AuthController::class, 'registerVerify'])->middleware('throttle:auth-otp-verify')->name('auth.register.verify');
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

Route::post('/onboarding', [HomeController::class, 'onboarding'])
    ->middleware([EnsureAuthenticated::class, 'throttle:auth-onboarding'])
    ->name('onboarding.store');
Route::get('/my-listings', MyListingsController::class)
    ->middleware(EnsureAuthenticated::class)
    ->name('listings.mine');

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
});
