import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyListingsWorkspace } from './MyListingsWorkspace';

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        post: vi.fn(),
        patch: vi.fn(),
    },
}));

const session = {
    authenticated: true,
    display_name: 'Maya Tagudin',
};

describe('MyListingsWorkspace', () => {
    it('renders List Dock empty state and create verbs without Orders chrome', () => {
        render(
            <MyListingsWorkspace
                session={session}
                myListings={[]}
                draft={null}
                errors={{}}
                action={null}
                notice={null}
                onLogout={() => undefined}
            />,
        );

        expect(screen.getAllByRole('heading', { name: 'My Listings' }).length).toBeGreaterThan(0);
        expect(screen.getByText(/no saved listings yet/i)).toBeTruthy();
        expect(screen.getAllByRole('link', { name: /create listing/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /create listing/i }).length).toBeGreaterThan(0);
        expect(screen.getByText(/review boundary/i)).toBeTruthy();
        expect(screen.queryByText(/orders/i)).toBeNull();
        expect(screen.queryByText(/activity/i)).toBeNull();
        expect(screen.queryByText(/quotes/i)).toBeNull();
    });

    it('lists owner statuses with readable badges', () => {
        render(
            <MyListingsWorkspace
                session={session}
                myListings={[
                    {
                        id: 'listing-draft',
                        title: 'Market errand help',
                        description: 'Private owner draft.',
                        status: 'draft',
                        version: 2,
                        area: 'Tagudin',
                        listing_type: 'service',
                        category_code: 'local-services',
                    },
                    {
                        id: 'listing-pending',
                        title: 'Hem and button fix',
                        description: 'Waiting on review.',
                        status: 'pending_review',
                        review_status: 'pending',
                        version: 1,
                        area: 'Tagudin',
                        listing_type: 'service',
                    },
                ]}
                draft={null}
                errors={{}}
                action={null}
                notice={null}
                onLogout={() => undefined}
            />,
        );

        expect(screen.getAllByRole('heading', { name: 'Your listings' }).length).toBeGreaterThan(0);
        expect(screen.getByText(/Draft · v2/)).toBeTruthy();
        expect(screen.getByText(/Pending review · v1/)).toBeTruthy();
        expect(screen.getByText(/2 owned/)).toBeTruthy();
    });

    it('wires create listing sticky dock and draft editor verbs', () => {
        render(
            <MyListingsWorkspace
                session={session}
                myListings={[]}
                draft={{
                    id: 'draft-1',
                    title: 'Market errand help',
                    description: 'Private draft body',
                    status: 'draft',
                    version: 1,
                    category_code: 'home-help',
                    listing_type: 'service',
                    area: 'Tagudin',
                }}
                errors={{}}
                action={null}
                notice={null}
                onLogout={() => undefined}
            />,
        );

        const createLinks = screen.getAllByRole('link', { name: /create listing/i });
        expect(createLinks.some((link) => link.getAttribute('href') === '#my-listings-editor')).toBe(true);
        expect(screen.getAllByRole('button', { name: /save draft/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: /submit for review/i }).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/buyer preview/i).length).toBeGreaterThan(0);
    });
});
