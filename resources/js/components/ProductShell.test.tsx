import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductSecondaryBar, ProductShell } from './ProductShell';

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
});
