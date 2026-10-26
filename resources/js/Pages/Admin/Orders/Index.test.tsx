import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';
import type { ComponentType } from 'react';

import Orders from './Index';
import type { RegistryPageProps } from '@/types/admin-workspace';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    router: { get: vi.fn() },
}));
vi.mock('@/layouts/AdminLayout', () => ({
    AdminLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const props: RegistryPageProps = {
    registry: {
        kind: 'orders',
        rows: {
            data: [{
                id: 'order-live-31', reference: 'ORD-LIVE-31', kind: 'order',
                title: 'Live server order not in local fixtures', status: 'awaiting_payment',
                summary: 'Current server record', updated_at: '2026-10-26T08:30:00Z',
                cohort: 'unclassified', inspect_url: '/admin/inspect?ref=ORD-LIVE-31',
                facts: [{ label: 'payment lane', value: 'external_cash' }],
            }],
            links: { first: null, last: null, prev: null, next: null },
            meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
        },
        filters: { q: null, status: null, category: null, cohort: null, assignee: null, page: 1, per_page: 25 },
    },
    staffContext: {
        operator: { id: 'staff-31', display_name: 'Assigned Operator', roles: ['admin'] },
        environment: 'testing', cohort: { selected: null, options: [] },
    },
};

describe('Admin orders registry', () => {
    it('renders the provided server row and navigates to its actual universal workspace reference', () => {
        const Page = Orders as ComponentType<RegistryPageProps>;
        render(<Page {...props} />);

        expect(screen.getByText('Live server order not in local fixtures')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Inspect' }).getAttribute('href')).toBe(
            '/admin/inspect?ref=ORD-LIVE-31',
        );
        expect(screen.queryByText(/Ceiling Fan Motor Diagnostics/i)).toBeNull();
    });
    it('preserves the server page size when navigating to the next page', () => {
        const Page = Orders as ComponentType<RegistryPageProps>;
        const paginatedProps = {
            ...props,
            registry: {
                ...props.registry,
                rows: {
                    ...props.registry.rows,
                    links: { ...props.registry.rows.links, next: '/admin/orders?page=2&per_page=1' },
                    meta: { ...props.registry.rows.meta, per_page: 1, current_page: 1, last_page: 3 },
                },
                filters: { ...props.registry.filters, page: 1, per_page: 1 },
            },
        } as RegistryPageProps;
        window.history.replaceState({}, '', '/admin/orders');
        render(<Page {...paginatedProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));

        expect(router.get).toHaveBeenCalledWith('/admin/orders', expect.objectContaining({
            page: 2,
            per_page: 1,
        }), expect.any(Object));
    });
    it('keeps a submitted category ID visible when the server rejects the registry filters', () => {
        const Page = Orders as ComponentType<RegistryPageProps>;
        const listingProps = {
            ...props,
            registry: {
                ...props.registry,
                kind: 'listings',
                rows: {
                    ...props.registry.rows,
                    data: [{
                        ...props.registry.rows.data[0],
                        id: 'listing-live-31',
                        reference: 'LST-LIVE-31',
                        kind: 'listing',
                    }],
                },
            },
        } as RegistryPageProps;
        window.history.replaceState({}, '', '/admin/listings');
        render(<Page {...listingProps} />);

        const category = screen.getByLabelText('Category UUID') as HTMLInputElement;
        fireEvent.change(category, { target: { value: '123e4567-e89b-12d3-a456-426614174000' } });
        fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

        const mockedGet = router.get as unknown as {
            mock: {
                calls: Array<[unknown, unknown, {
                    onError?: (errors: Record<string, string>) => void;
                }]>;
            };
        };
        const [url, params, options] = mockedGet.mock.calls[0];
        expect(url).toBe('/admin/listings');
        expect(params).toEqual(expect.objectContaining({ category: '123e4567-e89b-12d3-a456-426614174000' }));
        act(() => options.onError?.({ category: 'Choose a valid listing category.' }));

        expect(screen.getByRole('alert').textContent).toBe('Choose a valid listing category.');
        expect((screen.getByLabelText('Category UUID') as HTMLInputElement).value).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
});
