import { expect, test } from '@playwright/test';

test('root shell renders when an explicit base URL is provided', async ({ page }) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome to serbizyu/i })).toBeVisible();
    await expect(page.getByText('Demo only — no SMS was sent')).toBeVisible();
});

test('mock login reaches the challenge and persists the authenticated workspace on refresh', async ({
    page,
}) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

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

    await page.reload();
    await expect(
        page.getByRole('heading', { name: /turn an idea into a reviewed listing/i }),
    ).toBeVisible();
});

test('unknown fixture selection remains recoverable with a safe error reference', async ({
    page,
}) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

    await page.goto('/');
    await page.getByLabel('Fixture identifier').fill('not-a-fixture');
    await page.getByRole('button', { name: /continue to simulated challenge/i }).click();

    const feedback = page.getByRole('alert');
    await expect(feedback).toContainText(
        /available demo fixture|fictional account is unavailable/i,
    );
    await expect(feedback).toContainText(/reference:/i);
    await expect(page.getByRole('heading', { name: /welcome to serbizyu/i })).toBeVisible();
});
