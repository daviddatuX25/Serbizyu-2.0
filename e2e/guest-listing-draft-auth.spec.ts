import { expect, test, type Page } from '@playwright/test';

async function verifyGuestDraftReturnsToBuilder(
    page: Page,
    options: {
        path: string;
        titleInputTestId?: string;
        storageKey: string;
        optionToSelect?: string;
        activeFulfillmentText?: string;
    },
): Promise<void> {
    const title = `Guest draft ${Date.now()}`;
    const listingPosts: string[] = [];

    page.on('request', (request) => {
        if (request.method() === 'POST' && new URL(request.url()).pathname === '/listings') {
            listingPosts.push(request.url());
        }
    });

    await page.goto(options.path);
    const titleInput = page.getByTestId(options.titleInputTestId || 'product-title-input');
    await titleInput.fill(title);
    // Switch to Standard all-in-one mode for full section access
    await page.getByTestId('builder-mode-switcher').getByRole('button', { name: 'Standard' }).click();

    if (options.optionToSelect) {
        await page.getByRole('button', { name: options.optionToSelect }).click();
    }
    if (options.activeFulfillmentText) {
        await expect(page.locator('aside')).toContainText(options.activeFulfillmentText);
    }
    await page.getByRole('button', { name: 'Sign in to Save Draft' }).click();

    await expect(page).toHaveURL(/\/auth\/sign-in\?return_to=/);
    await expect(page.getByRole('link', { name: 'Back to listing builder' })).toHaveAttribute('href', options.path);
    await expect(page.getByRole('link', { name: 'Return to listing builder as a guest' })).toBeVisible();

    const storedDraft = await page.evaluate((key) => {
        const stored = window.sessionStorage.getItem(key);
        return stored === null ? null : JSON.parse(stored);
    }, options.storageKey);
    expect(storedDraft?.draft?.title).toBe(title);
    expect(listingPosts).toHaveLength(0);

    await page.goto(options.path);
    await expect(page.getByTestId(options.titleInputTestId || 'product-title-input')).toHaveValue(title);
    await expect(page.getByTestId('draft-restored-notice')).toContainText(/draft restored/i);
    if (options.activeFulfillmentText) {
        await expect(page.locator('aside')).toContainText(options.activeFulfillmentText);
    }
}

test('a guest product draft is preserved across the sign-in redirect', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.');

    await verifyGuestDraftReturnsToBuilder(page, {
        path: '/listings/create/product',
        titleInputTestId: 'product-title-input',
        storageKey: 'serbizyu.pending-listing.product.v1',
    });
});

test('a guest service draft preserves customized Work Set stages across the sign-in redirect', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.');

    const path = '/listings/create/service';
    const title = `Guest service draft ${Date.now()}`;
    const listingPosts: string[] = [];
    page.on('request', (request) => {
        if (request.method() === 'POST' && new URL(request.url()).pathname === '/listings') {
            listingPosts.push(request.url());
        }
    });

    await page.goto(path);
    await page.getByTestId('service-title-input').fill(title);
    // Switch to Standard all-in-one mode
    await page.getByTestId('builder-mode-switcher').getByRole('button', { name: 'Standard' }).click();

    await expect(page.getByText('Work Execution Plan')).toBeVisible();
    await expect(page.getByTestId('listing-media-picker')).toBeVisible();
    await page.getByRole('button', { name: 'Icon', exact: true }).click();
    await expect(page.locator('aside').getByTestId('category-svg-fallback')).toHaveCount(1);
    await page.getByRole('button', { name: 'Video', exact: true }).click();
    await expect(page.getByTestId('media-video-badge')).toBeVisible();
    await expect(page.getByText(/A1 Linear|A3 Turnkey|Official Archetypes/i)).toHaveCount(0);

    await page.locator('select').first().selectOption('courier');
    await expect(page.getByTestId('listing-media-picker').getByText('Courier')).toBeVisible();
    await expect(page.getByTestId('listing-media-picker').getByText('Coil Wash')).toHaveCount(0);
    await expect(page.getByText('No category-specific work sets for Courier & Delivery yet')).toBeVisible();
    await page.getByRole('button', { name: 'Browse All Compatible Service Work Sets' }).click();
    await expect(page.getByRole('heading', { name: 'Work Execution Catalog' })).toBeVisible();
    const compatibleSet = page.getByRole('button', { name: /Use Template/ }).first();
    const selectedSetTitle = (await compatibleSet.innerText()).split('\n')[0];
    await compatibleSet.click();

    await expect(page.getByRole('button', { name: /Customize.*Steps/i })).toBeVisible();
    const activeWorkSetCard = page.getByRole('button', { name: /Customize.*Steps/i }).last().locator('../../..');
    await expect(activeWorkSetCard).toBeVisible();
    await expect(activeWorkSetCard).toContainText(selectedSetTitle);
    await page.getByRole('button', { name: /Customize Work Steps/i }).click();
    await expect(page.getByRole('heading', { name: /Work Studio · Execution Pipeline/i })).toBeVisible();
    const firstStepTitle = page.getByPlaceholder('e.g. Site Check-In, Disinfection Flush, Delta Temp Test...');
    const originalTitle = await firstStepTitle.inputValue();
    await firstStepTitle.fill(`${originalTitle} customized`);
    await page.getByRole('button', { name: /Apply Workflow to Listing/i }).click();

    await expect(page.getByText('Custom for this listing')).toBeVisible();
    await expect(page.getByText(`Based on ${selectedSetTitle} v1`)).toBeVisible();
    await page.getByRole('button', { name: /Attach Partner Combination/i }).click();
    await expect(
        page.getByRole('heading', { name: 'Select or Build a Partner Deal Chain' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Build Custom Deal Chain in Studio/i }).click();
    await expect(
        page.getByRole('heading', { name: /Customize Partner Deal Chain Nodes|Deal Chain Studio/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Apply Deal Chain to Listing/i }).click();
    await page.getByRole('button', { name: 'Sign in to Save Draft' }).click();

    await expect(page).toHaveURL(/\/auth\/sign-in\?return_to=/);
    await expect(page.getByRole('link', { name: 'Back to listing builder' })).toHaveAttribute('href', path);
    await expect(page.getByRole('link', { name: 'Return to listing builder as a guest' })).toBeVisible();
    const storedDraft = await page.evaluate(() => {
        const stored = window.sessionStorage.getItem('serbizyu.pending-listing.service.v1');
        return stored === null ? null : JSON.parse(stored);
    });
    expect(storedDraft?.draft?.selectedTemplateId).toBeTruthy();
    expect(storedDraft?.draft?.stages[0]?.title).toBe(`${originalTitle} customized`);
    expect(storedDraft?.draft?.media?.has_video).toBe(true);
    expect(
        storedDraft?.draft?.combinations?.some(
            (combo: { isCustom?: boolean; title?: string }) =>
                combo.isCustom === true && combo.title === 'Custom Partnered Deal Chain',
        ),
    ).toBe(true);
    expect(listingPosts).toHaveLength(0);

    await page.goto(path);
    await expect(page.getByTestId('service-title-input')).toHaveValue(title);
    await expect(page.getByTestId('draft-restored-notice')).toBeVisible();
    await page.getByTestId('builder-mode-switcher').getByRole('button', { name: 'Standard' }).click();
    await expect(page.getByText('Custom for this listing').first()).toBeVisible();
    await expect(page.getByText(new RegExp(`Based on ${selectedSetTitle}`)).first()).toBeVisible();
    await expect(
        page.getByRole('button', { name: new RegExp(`${originalTitle} customized`) }).first(),
    ).toBeVisible();
});

test('desktop listing creation presents dedicated choice cards without midway builder switcher', async ({ page }) => {
    test.skip(((page.viewportSize()?.width ?? 1280) < 640) || !process.env.PLAYWRIGHT_BASE_URL, 'Desktop-only flow: validates wide 2-card desktop choice and desktop headers');

    await page.goto('/listings/create');
    await expect(page.getByRole('heading', { name: 'What would you like to list?' })).toBeVisible();
    await expect(page.getByTestId('create-service-card')).toBeVisible();
    await expect(page.getByTestId('create-product-card')).toBeVisible();

    // Click Service card -> navigates to service builder
    await page.getByRole('link', { name: /Start Service Listing/i }).click();
    await expect(page).toHaveURL('/listings/create/service');
    const serviceHeader = page.getByTestId('builder-header');
    await expect(serviceHeader).toContainText('Service Listing');
    await expect(serviceHeader.getByRole('link', { name: 'Change Type' })).toBeVisible();

    // No midway switcher between Service/Product in header
    await expect(serviceHeader.getByRole('button', { name: 'Product' })).toHaveCount(0);

    // Click Change Type -> navigates back to /listings/create
    await serviceHeader.getByRole('link', { name: 'Change Type' }).click({ force: true });
    await expect(page).toHaveURL('/listings/create');

    // Click Product card -> navigates to product builder
    await page.getByRole('link', { name: /Start Product Listing/i }).click();
    await expect(page).toHaveURL('/listings/create/product');
    const productHeader = page.getByTestId('builder-header');
    await expect(productHeader).toContainText('Product Listing');
    await expect(productHeader.getByRole('link', { name: 'Change Type' })).toBeVisible();
});

test('listing builders support switching between Guided Mode with tips and Advanced All-in-One Mode', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.');

    await page.goto('/listings/create/service');

    const switcher = page.getByTestId('builder-mode-switcher');
    // Default is Guided Mode: shows Step indicator
    await expect(switcher.getByRole('button', { name: 'Guided' })).toBeVisible();
    await expect(switcher.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByText(/Step 1 of 7/)).toBeVisible();

    // Switch to Standard Mode: shows all sections
    await switcher.getByRole('button', { name: 'Standard' }).click();
    await expect(page.getByText('Standard Form')).toBeVisible();
    await expect(page.getByText('Trade Scope & Craft')).toBeVisible();

    // Switch back to Guided Mode: restores step 1
    await switcher.getByRole('button', { name: 'Guided' }).click();
    await expect(page.getByText(/Step 1 of 7/)).toBeVisible();
});

test('Tagudin map picker allows snapping to barangays and drops coordinates pin', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_BASE_URL, 'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.');

    await page.goto('/listings/create/service');
    // Switch to Standard mode to display all sections including location picker
    await page.getByTestId('builder-mode-switcher').getByRole('button', { name: 'Standard' }).click();

    const picker = page.getByTestId('tagudin-location-picker');
    await expect(picker).toBeVisible();

    // Default official 10-digit PSA PSGC cascading hierarchy: Ilocos Sur (0102900000) -> Tagudin (0102933000) -> Rizal (0102933037)
    await expect(picker.locator('select').nth(0)).toHaveValue('0102900000');
    await expect(picker.locator('select').nth(1)).toHaveValue('0102933000');
    await expect(picker.locator('select').nth(2)).toHaveValue('0102933037');
    await expect(picker).toContainText('Rizal');

    // Detect Current GPS Location hardware button is present
    await expect(picker.getByRole('button', { name: /Detect Current GPS Location/i })).toBeVisible();
    // Leaflet map container is visible
    const mapContainer = picker.getByTestId('tagudin-leaflet-map');
    await expect(mapContainer).toBeVisible();

    // Dual Mode Switcher: toggle to Satellite view
    const satelliteBtn = picker.getByRole('button', { name: 'Satellite' });
    await expect(satelliteBtn).toBeVisible();
    await satelliteBtn.click();
    await expect(picker).toContainText('Satellite View');

    // Toggle back to Road Map
    const mapBtn = picker.getByRole('button', { name: 'Map' });
    await mapBtn.click();
    await expect(picker).toContainText('Road Map');

    // Zoom In control
    await picker.getByTitle('Zoom In (+)').click();

    // Reset View
    await picker.getByTitle('Reset Full Municipality View').click();

    // Select Farola in official Barangay dropdown
    await picker.locator('select').nth(2).selectOption('0102933019');
    await expect(picker.locator('select').nth(2)).toHaveValue('0102933019');
    await expect(picker.locator('input')).toHaveValue(/Farola Lighthouse/i);

    // Click on the interactive Leaflet map to drop manual pin
    await mapContainer.click({ position: { x: 180, y: 140 } });
    await expect(picker).toContainText('Manual Pin Dropped');
    await expect(picker).toContainText('Click or drag pin to place');
});
