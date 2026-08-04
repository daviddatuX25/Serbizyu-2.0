import '../css/app.css';
import './connectedSlice.css';
import '../css/design-system.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';

type PageModule = { default: ComponentType<Record<string, unknown>> };

const pages = import.meta.glob<PageModule>(
    ['./Pages/**/*.tsx', '!./Pages/**/*.test.tsx'],
    { eager: true },
);

createInertiaApp({
    resolve: (name) => {
        const page = pages[`./Pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Inertia page not found: ${name}`);
        }

        return page.default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
});
