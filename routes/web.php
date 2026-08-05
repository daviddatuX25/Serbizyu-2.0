<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BrowseController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\MyListingsController;
use App\Http\Middleware\EnsureAuthenticated;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::get('/auth/phone', [AuthController::class, 'show'])->name('auth.phone');
Route::post('/auth/phone/request', [AuthController::class, 'requestCode'])->middleware('throttle:6,1')->name('auth.phone.request');
Route::post('/auth/phone/verify', [AuthController::class, 'verifyCode'])->middleware('throttle:12,1')->name('auth.phone.verify');
Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
Route::get('/health/ready', [HealthController::class, 'readiness'])->name('health.ready');

Route::post('/onboarding', [HomeController::class, 'onboarding'])->name('onboarding.store');
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
