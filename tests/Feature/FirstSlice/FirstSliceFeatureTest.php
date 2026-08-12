FirstSliceFeatureTest.php 296L cognitive
// /home/user/Serbizyu-2.0/tests/Feature/FirstSlice/FirstSliceFeatureTest.php
§ test test_guest_and_logout_have_safe_recovery_states (L45-L59)
    public function test_guest_and_logout_have_safe_recovery_states(): void
    {
        $this->postJson('/auth/phone/request', ['phone' => 'not-a-phone'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'PHONE_INVALID');

        $this->authenticateProvider();
        $this->logoutAuthenticatedUser();

        $this->inertiaGet('/')
            ->assertOk()
            ->assertJsonPath('props.slice.session', null);

        $this->get('/my-listings')->assertRedirect(route('auth.sign-in'));
    }
// ... 1 lines omitted
§ test test_onboarding_persists_additive_provider_readiness_facts_without_persona_switching (L61-L93)
    public function test_onboarding_persists_additive_provider_readiness_facts_without_persona_switching(): void
    {
        $userId = $this->authenticateProvider();

        $this->post('/onboarding', [
            'provider_intent' => true,
            'display_name' => 'Rosa Provider Fixture',
            'service_area_display' => 'Tagudin, Ilocos Sur',
            'language_preferences' => ['ilo', 'en'],
            'accessibility_preferences' => ['plain_language' => true],
            'category_code' => 'home-help',
            'listing_type' => 'service',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertRedirect();

        self::assertSame('L1', DB::table('users')->where('id', $userId)->value('primary_access_tier'));
        self::assertSame('Rosa Provider Fixture', DB::table('user_profiles')->where('user_id', $userId)->value('display_name'));
        self::assertDatabaseHas('role_assignments', [
            'user_id' => $userId,
            'role_code' => 'provide',
            'status' => 'active',
        ]);
        self::assertDatabaseHas('identity_verifications', [
            'user_id' => $userId,
            'verification_type' => 'provider_readiness',
            'status' => 'pending',
        ]);
        self::assertFalse(DB::getSchemaBuilder()->hasTable('onboarding_progress'));

        $this->inertiaGet('/')
            ->assertOk()
            ->assertJsonPath('props.slice.readiness.provider_intent', true)
            ->assertJsonPath('props.slice.readiness.can_create_draft', true);
    }
// ... 1 lines omitted
§ test test_owner_can_create_save_and_submit_a_listing_but_pending_review_is_not_public (L95-L147)
    public function test_owner_can_create_save_and_submit_a_listing_but_pending_review_is_not_public(): void
    {
        $this->authenticateProvider();
        $this->completeProviderOnboarding();

        $created = $this->postJson('/listings', [
            'title' => 'Household help in Tagudin',
            'description' => 'Reliable local help for errands and household tasks.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ])->assertCreated()->json('data');

        self::assertSame('draft', $created['status']);
        self::assertSame(1, $created['version']);

        $saved = $this->patchJson('/listings/'.$created['id'], [
            'expected_version' => 1,
            'title' => 'Household help around Tagudin',
            'description' => 'Reliable local help for errands, household tasks, and pickups.',
        ])->assertOk()->json('data');

        self::assertSame(2, $saved['version']);

        $this->postJson('/listings/'.$created['id'].'/submit', [
            'expected_version' => 2,
        ], [
            'Idempotency-Key' => 'submit-first-slice-0001',
        ])->assertOk()
            ->assertJsonPath('data.status', 'pending_review')
            ->assertJsonPath('data.review_status', 'pending');

        self::assertDatabaseHas('listings', [
            'id' => $created['id'],
            'status' => 'pending_review',
            'review_status' => 'pending',
        ]);
        self::assertDatabaseHas('listing_versions', [
            'listing_id' => $created['id'],
            'version_number' => 1,
        ]);

        $browse = $this->inertiaGet('/browse')->assertOk();
        $publicListings = $browse->json('props.slice.publicListings') ?? $browse->json('props.publicListings') ?? [];
        self::assertIsArray($publicListings);
        self::assertTrue(
            collect($publicListings)->contains(fn (array $row): bool => ($row['fixture_key'] ?? null) === DemoFixtures::ACTIVE_LISTING_FIXTURE),
            'Contract active Tagudin listing must remain in public browse.',
        );
        self::assertFalse(
            collect($publicListings)->contains(fn (array $row): bool => ($row['status'] ?? null) === 'pending_review'),
            'Pending review listings must stay out of public browse.',
        );
    }
// ... 1 lines omitted
§ test test_submit_is_idempotent_and_immutable_and_stale_writes_are_rejected (L149-L207)
    public function test_submit_is_idempotent_and_immutable_and_stale_writes_are_rejected(): void
    {
        $userId = $this->authenticateProvider();
        $this->completeProviderOnboarding();

        $created = $this->postJson('/listings', [
            'title' => 'Fixture service listing',
            'description' => 'A sufficiently descriptive service listing for the fixture.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ])->json('data');

        $this->patchJson('/listings/'.$created['id'], [
            'expected_version' => 1,
            'title' => 'Fixture service listing saved',
            'description' => 'A sufficiently descriptive saved service listing for the fixture.',
        ])->assertOk();

        $first = $this->postJson('/listings/'.$created['id'].'/submit', [
            'expected_version' => 2,
            'idempotency_key' => 'submit-first-slice-0002',
        ])->assertOk()->json('data');
        $second = $this->postJson('/listings/'.$created['id'].'/submit', [
            'expected_version' => 2,
            'idempotency_key' => 'submit-first-slice-0002',
        ])->assertOk()->json('data');

        self::assertSame($first['id'], $second['id']);
        self::assertSame(3, DB::table('listing_versions')->where('listing_id', $created['id'])->count());
        self::assertDatabaseHas('idempotency_keys', [
            'scope' => 'listing.submit:'.$created['id'].':'.$userId,
            'key' => 'submit-first-slice-0002',
            'status' => 'succeeded',
            'response_status' => 200,
            'fingerprint_version' => 1,
        ]);
        self::assertNotNull(DB::table('idempotency_keys')->where('key', 'submit-first-slice-0002')->value('response_payload'));
        self::assertDatabaseHas('audit_events', [
            'action' => 'listing.submit_review',
            'target_id' => $created['id'],
        ]);
        self::assertDatabaseHas('outbox_messages', [
            'aggregate_id' => $created['id'],
            'event_type' => 'listing.submitted_for_review',
        ]);

        $this->postJson('/listings/'.$created['id'].'/submit', [
            'expected_version' => 3,
            'idempotency_key' => 'submit-first-slice-0002',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'IDEMPOTENCY_KEY_REUSED');

        $this->patchJson('/listings/'.$created['id'], [
            'expected_version' => 1,
            'title' => 'Stale write',
            'description' => 'This must not overwrite the submitted listing.',
        ])->assertStatus(409)
            ->assertJsonPath('code', 'VERSION_CONFLICT');
    }
// ... 1 lines omitted
§ test test_public_discovery_includes_the_deterministic_active_tagudin_fixture_and_detail_is_safe (L209-L227)
    public function test_public_discovery_includes_the_deterministic_active_tagudin_fixture_and_detail_is_safe(): void
    {
        $this->authenticateProvider();
        $browse = $this->inertiaGet('/browse')->assertOk();
        $publicListings = $browse->json('props.slice.publicListings') ?? $browse->json('props.publicListings') ?? [];
        self::assertIsArray($publicListings);
        self::assertTrue(
            collect($publicListings)->contains(fn (array $row): bool => ($row['fixture_key'] ?? null) === DemoFixtures::ACTIVE_LISTING_FIXTURE),
            'Contract active Tagudin listing must remain in public browse.',
        );

        $listingId = FixtureRepository::ACTIVE_LISTING_ID;

        $this->inertiaGet('/listings/'.$listingId)
            ->assertOk()
            ->assertJsonPath('props.slice.activeListingDetail.fixture_key', DemoFixtures::ACTIVE_LISTING_FIXTURE)
            ->assertJsonMissingPath('props.slice.activeListingDetail.owner_phone_e164')
            ->assertJsonMissingPath('props.slice.activeListingDetail.private_profile');
    }
// ... 1 lines omitted
§ test test_non_owner_protected_edit_attempt_returns_safe_denial_with_correlation_id (L229-L249)
    public function test_non_owner_protected_edit_attempt_returns_safe_denial_with_correlation_id(): void
    {
        $this->authenticateProvider();
        $this->completeProviderOnboarding();
        $created = $this->postJson('/listings', [
            'title' => 'Owner-only draft',
            'description' => 'This draft belongs only to the provider fixture owner.',
            'category_code' => 'home-help',
            'listing_type' => 'service',
        ])->json('data');

        $this->logoutAuthenticatedUser();
        $this->authenticateBuyer();

        $this->postJson('/listings/'.$created['id'].'/protected-edit-attempt', [], [
            'X-Correlation-Id' => '0198a3b1-7c40-7abc-8def-f234567890ab',
        ])->assertForbidden()
            ->assertJsonPath('code', 'AUTHORIZATION_DENIED')
            ->assertJsonPath('correlation_id', '0198a3b1-7c40-7abc-8def-f234567890ab')
            ->assertHeader('X-Correlation-Id', '0198a3b1-7c40-7abc-8def-f234567890ab');
    }
// ... 1 lines omitted
§ test test_http_form_requests_keep_validation_at_the_http_boundary (L251-L273)
    public function test_http_form_requests_keep_validation_at_the_http_boundary(): void
    {
        $this->postJson('/auth/phone/request', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        $this->authenticateProvider();

        $this->postJson('/onboarding', ['provider_intent' => true])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['display_name', 'password']);

        $this->postJson('/listings', [
            'title' => 'x',
            'description' => 'short',
            'category_code' => 'Invalid Code',
            'listing_type' => 'unknown',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'description', 'category_code', 'listing_type']);
    }
7/14 chunks shown (2318 tokens)
[lean-ctx] full source: read "/home/user/Serbizyu-2.0/tests/Feature/FirstSlice/FirstSliceFeatureTest.php" directly (no MCP)  ·  or ctx_read("/home/user/Serbizyu-2.0/tests/Feature/FirstSlice/FirstSliceFeatureTest.php", mode="full")
