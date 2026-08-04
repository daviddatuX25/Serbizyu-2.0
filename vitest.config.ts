import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(root, 'resources/js'),
        },
    },
    test: {
        environment: 'jsdom',
        include: ['resources/**/*.{test,spec}.{js,jsx,ts,tsx}'],
        exclude: ['e2e/**'],
        passWithNoTests: false,
    },
});
