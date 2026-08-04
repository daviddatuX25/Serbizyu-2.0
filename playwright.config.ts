import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    timeout: 10_000,
    fullyParallel: true,
    reporter: 'line',
    use: {
        baseURL,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium-mobile-360',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 360, height: 800 },
                reducedMotion: 'reduce',
            },
        },
        {
            name: 'chromium-mobile-375',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 375, height: 812 },
                reducedMotion: 'reduce',
            },
        },
    ],
});
