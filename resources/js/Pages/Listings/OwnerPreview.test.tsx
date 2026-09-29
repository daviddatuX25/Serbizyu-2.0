import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { router } from '@inertiajs/react';
import OwnerPreview from './OwnerPreview';
import type { ListingRecord } from '@/types';

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
    },
    Head: ({ title }: { title: string }) => <title>{title}</title>,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const sampleListing: ListingRecord = {
    id: '01a0ecac-cf17-7278-9962-cdb04e1028c8',
    title: 'Tagudin Fresh Cookies',
    description: 'Freshly baked chocolate chip and oatmeal cookies.',
    category_code: 'food',
    listing_type: 'product',
    status: 'draft',
    area: 'Tagudin Market',
    owner_name: 'Cookie Baker',
    price_amount_minor: 12000,
    currency: 'PHP',
    public: false,
    version: 1,
    package_tiers: [
        {
            id: 'pkg-1',
            title: 'Box of 6',
            price: 120,
            sub: 'Freshly packed',
            inclusions: ['6 assorted cookies', 'Stall pickup'],
        },
    ],
    milestone_stages: [
        { id: 'm1', title: 'Baking & Packaging', description: 'Fresh oven batch' },
        { id: 'm2', title: 'Counter Handoff', description: 'Photo sign-off' },
    ],
    deal_chain_combinations: [],
};

describe('OwnerPreview Component - Reviews & Telemetry Integration', () => {
    it('renders zero-state when no verified reviews exist', () => {
        render(
            <OwnerPreview
                listing={sampleListing}
                reviews={[]}
                reviewSummary={{
                    rating: 5.0,
                    bayesian_rating: 4.5,
                    reviews_count: 0,
                    verified_count: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    satisfaction_pct: 100,
                }}
            />,
        );

        expect(screen.getByText('No verified customer reviews yet')).toBeTruthy();
        expect(screen.getByText(/Customer feedback and verified milestone photos appear here/i)).toBeTruthy();
        expect(screen.getByText(/New Listing · 0 Verified/i)).toBeTruthy();
    });

    it('renders unblinded customer reviews and attribute chips when provided', () => {
        const mockReviews = [
            {
                id: 'rev-101',
                author: 'Elena Santos',
                barangay: 'Barangay Centro',
                time_ago: '2 days ago',
                stars: 5,
                package_tag: 'Box of 6',
                quote: 'Very soft and chocolatey! Highly recommended.',
                attribute_chips: ['on_time', 'clean_workspace'],
                has_photo: true,
                photo_url: '/photos/bibingka.jpg',
                verified: true,
            },
        ];

        render(
            <OwnerPreview
                listing={sampleListing}
                reviews={mockReviews}
                reviewSummary={{
                    rating: 5.0,
                    bayesian_rating: 4.8,
                    reviews_count: 1,
                    verified_count: 1,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
                    satisfaction_pct: 100,
                }}
            />,
        );

        expect(screen.getByText(/Elena Santos · Barangay Centro/i)).toBeTruthy();
        expect(screen.getByText(/Very soft and chocolatey! Highly recommended\./i)).toBeTruthy();
        expect(screen.getByText('#on_time')).toBeTruthy();
        expect(screen.getByText('#clean_workspace')).toBeTruthy();
        expect(screen.getByText(/5.0 · 1 Verified/i)).toBeTruthy();
    });

    it('renders real telemetry data in FunnelAnalytics card', () => {
        const mockTelemetry = {
            impressions: 1450,
            views: 420,
            inquiries: 95,
            orders: 32,
            gross_amount_minor: 384000,
            ctr_pct: '29.0',
            cvr_pct: '7.6',
            is_projected: false,
        };

        render(
            <OwnerPreview
                listing={sampleListing}
                telemetry={mockTelemetry}
            />,
        );

        const funnelSection = screen.getByTestId('owner-preview-funnel');
        expect(within(funnelSection).getByText('Listing Insights & Funnel')).toBeTruthy();
        expect(within(funnelSection).getByText('7.6% View-to-Order CVR')).toBeTruthy();
        expect(within(funnelSection).getByText('1,450')).toBeTruthy();
    });

    it('renders Pause and Archive controls for active listings and triggers requests', () => {
        const activeListing: ListingRecord = {
            ...sampleListing,
            status: 'active',
            public: true,
            version: 3,
        };

        const mockPost = vi.fn();
        vi.mocked(router.post).mockImplementation(mockPost);

        render(
            <OwnerPreview
                listing={activeListing}
            />,
        );

        expect(screen.getByText('Active Marketplace Listing')).toBeTruthy();
        const pauseBtn = screen.getByRole('button', { name: /Pause Listing/i });
        expect(pauseBtn).toBeTruthy();

        fireEvent.click(pauseBtn);
        expect(mockPost).toHaveBeenCalledWith(
            `/listings/${activeListing.id}/pause`,
            { expected_version: 3 },
            expect.any(Object),
        );
    });

    it('renders Resume and Archive controls for paused listings and triggers requests', () => {
        const pausedListing: ListingRecord = {
            ...sampleListing,
            status: 'paused',
            public: false,
            version: 4,
        };

        const mockPost = vi.fn();
        vi.mocked(router.post).mockImplementation(mockPost);

        render(
            <OwnerPreview
                listing={pausedListing}
            />,
        );

        expect(screen.getByText('Listing Paused')).toBeTruthy();
        const resumeBtn = screen.getByRole('button', { name: /Resume Listing/i });
        expect(resumeBtn).toBeTruthy();

        fireEvent.click(resumeBtn);
        expect(mockPost).toHaveBeenCalledWith(
            `/listings/${pausedListing.id}/resume`,
            { expected_version: 4 },
            expect.any(Object),
        );
    });
});
