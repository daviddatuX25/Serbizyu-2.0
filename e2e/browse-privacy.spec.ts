import { expect, test } from '@playwright/test';

test('public browse keeps the active fixture identity and denies protected owner actions', async ({
    page,
}) => {
    test.skip(
        !process.env.PLAYWRIGHT_BASE_URL,
        'Opt-in: set PLAYWRIGHT_BASE_URL to a running app.',
    );

    await page.goto('/browse');

    await expect(
        page.getByRole('heading', { name: /browse active services in tagudin/i }),
    ).toBeVisible();

    const activeCard = page
        .locator('article.listing-card')
        .filter({ hasText: 'Tagudin local help' });
    await expect(activeCard).toHaveCount(1);
    await expect(activeCard.getByText('Tagudin local help')).toBeVisible();

    await activeCard.getByRole('link', { name: /open listing/i }).click();
    await expect(page.getByRole('heading', { name: 'Tagudin local help' })).toBeVisible();
    await expect(page.getByText('Public listing detail', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /try protected action/i }).click();
    const denial = page.getByRole('alert').filter({ hasText: /needs attention/i });
    await expect(denial).toBeVisible();
    await expect(denial).toContainText(/not available|permission|authorized|authenticated/i);
    await expect(denial).toContainText(/reference:/i);
});
