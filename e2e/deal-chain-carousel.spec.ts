import { expect, test } from '@playwright/test';

test('Next advances the service Deal Chain carousel to its next partner option', async ({ page }) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

    await page.goto('/listings/create/service');
    await page.getByLabel('Service Title').fill('Split AC Deep Clean');
    await page.getByRole('button', { name: 'Chains & Launch' }).click();

    await expect(page.getByText('Option 1 of 2', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Next ›' }).click();

    await expect(page.getByText('Option 2 of 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next ›' })).toBeDisabled();
});
