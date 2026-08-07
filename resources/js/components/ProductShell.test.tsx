import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSecondaryBar, ProductShell, useRegisterShellDrawerActions } from './ProductShell';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

afterEach(() => {
    cleanup();
});

describe('ProductShell', () => {
    it('renders adaptive rail destinations without Activity or QuickDeal', () => {
        render(
            <ProductShell active="browse" title="Browse">
                <main>Canvas</main>
            </ProductShell>,
        );

        expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeTruthy();
        expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeTruthy();

        expect(screen.getAllByRole('link', { name: /^home$/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /^browse$/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /^create$/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('link', { name: /my listings|mine/i }).length).toBeGreaterThan(0);

        expect(screen.queryByRole('link', { name: /activity/i })).toBeNull();
        expect(screen.queryByRole('link', { name: /quick.?deal/i })).toBeNull();

        const create = screen.getAllByRole('link', { name: /^create$/i })[0];
        expect(create.getAttribute('href')).toBe('/my-listings#my-listings-editor');

        const circle = document.querySelector('.sz-rail-logo-circle');
        const long = document.querySelector('.sz-rail-logo-long');
        expect(circle?.getAttribute('src')).toContain('serbizyu-logo-circle.png');
        expect(long?.getAttribute('src')).toContain('serbizyu-logo-long.png');
    });

    it('skips default secondary bar when pageChrome owns sticky tools', () => {
        render(
            <ProductShell active="browse" pageChrome={true}>
                <main>PLP</main>
            </ProductShell>,
        );

        expect(document.querySelector('.sz-shell-secondary')).toBeNull();
        expect(screen.getByText('PLP')).toBeTruthy();
    });

    it('ProductSecondaryBar reserves a logo slot beside tools', () => {
        const { container } = render(
            <ProductSecondaryBar tools={<button type="button">Search</button>} />,
        );

        const slot = container.querySelector('.sz-secondary-logo-slot');
        expect(slot).toBeTruthy();
        expect(within(slot as HTMLElement).getByRole('link', { name: /serbizyu home/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /search/i })).toBeTruthy();
    });

    it('uses switching drawer instead of plain dock when page registers actions', () => {
        function PageWithActions() {
            useRegisterShellDrawerActions(
                <div>
                    <button type="button">Pin this listing</button>
                    <button type="button">Message</button>
                    <button type="button">Buy</button>
                </div>,
                [],
            );
            return <main>Detail</main>;
        }

        render(
            <ProductShell active="browse">
                <PageWithActions />
            </ProductShell>,
        );

        expect(document.querySelector('[data-shell="switch-drawer"]')).toBeTruthy();
        expect(document.querySelector('[data-has-switch-drawer="true"]')).toBeTruthy();
        expect(document.querySelector('.sz-dock')).toBeNull();
        expect(screen.getByRole('button', { name: /^message$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /show navigation/i })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /show navigation/i }));
        const drawer = document.querySelector('[data-shell="switch-drawer"]') as HTMLElement;
        expect(within(drawer).getByRole('link', { name: /^browse$/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /show listing actions/i })).toBeTruthy();
    });

    it('auto-returns to listing actions about 3s after opening navigation', () => {
        vi.useFakeTimers();

        function PageWithActions() {
            useRegisterShellDrawerActions(
                <div>
                    <button type="button">Message</button>
                </div>,
                [],
            );
            return <main>Detail</main>;
        }

        try {
            render(
                <ProductShell active="browse">
                    <PageWithActions />
                </ProductShell>,
            );

            fireEvent.click(screen.getByRole('button', { name: /show navigation/i }));
            expect(screen.getByRole('button', { name: /show listing actions/i })).toBeTruthy();

            act(() => {
                vi.advanceTimersByTime(2999);
            });
            expect(screen.getByRole('button', { name: /show listing actions/i })).toBeTruthy();

            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(screen.getByRole('button', { name: /show navigation/i })).toBeTruthy();
            expect(screen.getByRole('button', { name: /^message$/i })).toBeTruthy();
        } finally {
            vi.useRealTimers();
        }
    });
});
