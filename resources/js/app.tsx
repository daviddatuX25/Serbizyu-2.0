import '../css/app.css';
import './connectedSlice.css';
import '../css/design-system.css';
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { NotificationProvider } from './components/notifications/NotificationCenter';
import type { NotificationSummary, SliceSession } from './types';

type PageModule = { default: ComponentType<Record<string, unknown>> };

const pages = import.meta.glob<PageModule>(['./Pages/**/*.tsx', '!./Pages/**/*.test.tsx'], {
    eager: true,
});

createInertiaApp({
    resolve: (name) => {
        const page = pages[`./Pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Inertia page not found: ${name}`);
        }

        return page.default;
    },
    setup({ el, App, props }) {
        const pageProps = props.initialPage.props as typeof props.initialPage.props & {
            session?: SliceSession | null;
            notificationSummary?: NotificationSummary | null;
        };
        const authenticated = pageProps.notificationSummary != null || Boolean(
            pageProps.session?.authenticated ?? pageProps.session?.isAuthenticated ?? pageProps.session?.userId,
        );
        const inertiaApp = <App {...props} />;
        createRoot(el).render(
            <NotificationProvider
                authenticated={authenticated}
                initialSummary={pageProps.notificationSummary ?? null}
            >
                {inertiaApp}
            </NotificationProvider>,
        );
    },
});
