import { expect, test, type Page } from '@playwright/test';

async function authenticateProvider(page: Page): Promise<void> {
    await page.goto('/');
    await page.getByLabel('Fixture identifier').fill('capstone-provider-tagudin-01');
    await page.getByRole('button', { name: /continue to simulated challenge/i }).click();
    await expect(
        page.getByRole('heading', { name: /confirm this simulated session/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /complete simulated challenge/i }).click();
    await expect(
        page.getByRole('heading', { name: /turn an idea into a reviewed listing/i }),
    ).toBeVisible();
}

function listingIdCode(page: Page) {
    return page.locator('.draft-id-row > span').filter({ hasText: 'Listing ID' }).locator('code');
}

function versionCode(page: Page) {
    return page
        .locator('.draft-id-row > span')
        .filter({ hasText: 'Expected version' })
        .locator('code');
}

async function jsonHeaders(page: Page): Promise<Record<string, string>> {
    const xsrfCookie = (await page.context().cookies()).find(
        (cookie) => cookie.name === 'XSRF-TOKEN',
    );

    if (!xsrfCookie) {
        throw new Error('The browser session did not receive an XSRF-TOKEN cookie.');
    }

    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': decodeURIComponent(xsrfCookie.value),
    };
}

test('owner lifecycle remains recoverable and pending review stays private', async ({ page }) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

    await authenticateProvider(page);

    const suffix = `${Date.now()}-${test.info().project.name}`;
    const initialTitle = `Browser lifecycle ${suffix}`;
    const savedTitle = `Browser lifecycle saved ${suffix}`;
    const serverTitle = `Browser lifecycle server update ${suffix}`;
    const description = 'A browser-verified local service listing for lifecycle evidence.';
    const serverDescription = 'A server-side version update used to exercise stale recovery.';

    await page.getByLabel('Listing title').fill(initialTitle);
    await page.getByLabel('Description').fill(description);
    await page.getByLabel('Category code').fill('home-help');
    await page.getByRole('button', { name: 'Create draft' }).click();
    await expect(page.getByRole('status')).toContainText(/draft created on the server/i);
    await expect(versionCode(page)).toHaveText('1');

    await page.reload();
    await expect(page.getByRole('heading', { name: /your service listing draft/i })).toBeVisible();
    await expect(page.getByLabel('Listing title')).toHaveValue(initialTitle);
    await expect(versionCode(page)).toHaveText('1');

    const listingId = await listingIdCode(page).textContent();
    expect(listingId).toBeTruthy();
    const listingUrl = new URL(`/listings/${listingId}`, page.url()).toString();

    await page.getByLabel('Listing title').fill(savedTitle);
    await page.getByLabel('Description').fill(description);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByRole('status')).toContainText(/draft saved/i);
    await expect(versionCode(page)).toHaveText('2');

    const concurrentSave = await page.request.patch(listingUrl, {
        data: {
            expected_version: 2,
            title: serverTitle,
            description: serverDescription,
            category_code: 'home-help',
            listing_type: 'service',
        },
        headers: await jsonHeaders(page),
    });
    expect(concurrentSave.status()).toBe(200);

    await page.getByLabel('Listing title').fill('Stale browser edit');
    await page.getByLabel('Description').fill(description);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByRole('alert')).toContainText(/changed elsewhere|refresh/i);
    await expect(page.getByRole('alert')).toContainText(/reference:/i);

    await page
        .locator('summary')
        .filter({ hasText: 'Technical boundary and recovery guidance' })
        .click();
    await page.getByRole('button', { name: 'Refresh server state' }).click();
    await expect(versionCode(page)).toHaveText('3');

    await page.getByLabel('Listing title').fill(serverTitle);
    await page.getByLabel('Description').fill(serverDescription);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByRole('status')).toContainText(/draft saved/i);
    await expect(versionCode(page)).toHaveText('4');

    let submitPayload: Record<string, unknown> | null = null;
    const submitPath = `/listings/${listingId}/submit`;
    const captureSubmit = (request: import('@playwright/test').Request): void => {
        if (request.method() !== 'POST' || new URL(request.url()).pathname !== submitPath) {
            return;
        }

        submitPayload = request.postDataJSON() as Record<string, unknown>;
    };
    page.on('request', captureSubmit);

    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByRole('status')).toContainText(/submitted for review/i);
    await expect(page.getByText('Submitted listing stays private', { exact: true })).toBeVisible();
    page.off('request', captureSubmit);

    expect(submitPayload).not.toBeNull();
    expect(submitPayload?.expected_version).toBe(4);
    expect(submitPayload?.idempotency_key).toEqual(expect.any(String));

    const replay = await page.request.post(new URL(submitPath, page.url()).toString(), {
        data: submitPayload,
        headers: await jsonHeaders(page),
    });
    expect(replay.status()).toBe(200);
    const replayPayload = (await replay.json()) as {
        data?: { id?: string; status?: string };
    };
    expect(replayPayload.data?.id).toBe(listingId);
    expect(replayPayload.data?.status).toBe('pending_review');

    await page.goto('/browse');
    await expect(
        page.getByRole('heading', { name: /browse active services in tagudin/i }),
    ).toBeVisible();
    await expect(page.locator('article.listing-card').filter({ hasText: serverTitle })).toHaveCount(
        0,
    );
    await expect(
        page.getByText('Only server-approved active listings are shown here.'),
    ).toBeVisible();
});
