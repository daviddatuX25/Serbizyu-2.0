import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home, { submissionIntentForVersion } from './Home';

const baseProps = {
    app: { name: 'Serbizyu', environment: 'testing', stage: 'capstone' },
    runtime: { environment: 'testing', providers: {} },
    correlationId: 'slice-test-001',
    scope: {
        productFeatures: true,
        externalProviders: false,
        schemaMigrations: true,
    },
};

describe('connected first-slice boundary', () => {
    it('makes the simulated login boundary visible', () => {
        render(<Home {...baseProps} />);

        expect(screen.getByRole('heading', { name: /welcome to serbizyu/i })).toBeTruthy();
        expect(screen.getByText('Demo only — no SMS was sent')).toBeTruthy();
        expect(screen.getByText(/no password is collected/i)).toBeTruthy();
    });

    it('reuses a submission key for the same server version and rotates it after a version change', () => {
        const first = submissionIntentForVersion(null, 2, () => 'submit-key-1');
        const retry = submissionIntentForVersion(first, 2, () => 'submit-key-2');
        const changed = submissionIntentForVersion(retry, 3, () => 'submit-key-3');

        expect(retry).toBe(first);
        expect(changed).toEqual({ key: 'submit-key-3', expectedVersion: 3 });
    });

    it('keeps pending review private while showing active public supply', () => {
        render(
            <Home
                {...baseProps}
                session={{ authenticated: true, userId: 'user-provider', source: 'mock_login' }}
                readiness={{ status: 'ready', ready: true, providerIntent: true, area: 'Tagudin' }}
                draft={{
                    id: 'listing-pending-1',
                    title: 'Draft awaiting review',
                    description: 'This owner draft is not public.',
                    category_code: 'home-care',
                    listing_type: 'service',
                    state: 'pending_review',
                    version: 2,
                }}
                publicListings={[
                    {
                        id: 'listing-active-1',
                        title: 'Tagudin bicycle repair',
                        description: 'A public active fixture.',
                        category_code: 'repair',
                        listing_type: 'service',
                        state: 'active',
                        area: 'Tagudin',
                        public: true,
                    },
                    {
                        id: 'listing-pending-2',
                        title: 'Private pending listing',
                        description: 'This must not appear in browse.',
                        category_code: 'home-care',
                        listing_type: 'service',
                        state: 'pending_review',
                        area: 'Tagudin',
                        public: false,
                    },
                ]}
            />,
        );

        expect(screen.getByText('Your service listing draft')).toBeTruthy();
        expect(screen.getByText('Pending review')).toBeTruthy();
        expect(screen.getByText('Submitted listing stays private')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Tagudin bicycle repair' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Private pending listing' })).toBeNull();
        expect(screen.getAllByText(/only server-approved active listings are shown/i)).toHaveLength(
            2,
        );
    });
});
