import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ReviewCeremonyModal from './ReviewCeremonyModal';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const sampleTargets = [
    {
        orderId: '01a0d011-ac19-7229-94aa-childorder1',
        providerName: 'Kuya Ben Electrician',
        role: 'Labor',
    },
    {
        orderId: '01a0d011-ac19-7229-94aa-childorder2',
        providerName: 'Tagudin Hardware Depot',
        role: 'Parts',
    },
    {
        orderId: '01a0d011-ac19-7229-94aa-childorder3',
        providerName: 'Danny Express Motorcycle',
        role: 'Courier',
    },
];

describe('ReviewCeremonyModal Component - Stages & AD-21 Cascading Flow', () => {
    it('renders Compose stage with AD-21 cascading toggle for multi-node deal chain', () => {
        render(
            <ReviewCeremonyModal
                isOpen={true}
                onClose={vi.fn()}
                dealChainId="01a0d011-chain-123"
                referenceTitle="All-In AC Repair #DC-892"
                actorRole="buyer"
                targets={sampleTargets}
            />,
        );

        expect(screen.getByText('Rate Deal Chain Project')).toBeTruthy();
        expect(screen.getByText('All-In AC Repair #DC-892 · Bilateral Tiwala')).toBeTruthy();

        // AD-21 Cascading Toggle Card
        const toggle = screen.getByTestId('cascading-toggle') as HTMLInputElement;
        expect(toggle).toBeTruthy();
        expect(toggle.checked).toBe(true);

        // Unified overall rating is visible
        expect(screen.getByText('Overall Rating')).toBeTruthy();
        expect(screen.getByText(/5.0 · Outstanding work & punctuality/i)).toBeTruthy();
        expect(screen.getByText('Submit Sealed Review')).toBeTruthy();
    });

    it('reveals per-provider custom review cards when cascading toggle is unchecked', () => {
        render(
            <ReviewCeremonyModal
                isOpen={true}
                onClose={vi.fn()}
                dealChainId="01a0d011-chain-123"
                referenceTitle="All-In AC Repair #DC-892"
                actorRole="buyer"
                targets={sampleTargets}
            />,
        );

        const toggle = screen.getByTestId('cascading-toggle');
        fireEvent.click(toggle);

        // Granular cards container should now be visible
        const granularContainer = screen.getByTestId('granular-review-cards');
        expect(granularContainer).toBeTruthy();

        // Individual provider cards rendered
        expect(within(granularContainer).getByText('Kuya Ben Electrician')).toBeTruthy();
        expect(within(granularContainer).getByText('Tagudin Hardware Depot')).toBeTruthy();
        expect(within(granularContainer).getByText('Danny Express Motorcycle')).toBeTruthy();
    });

    it('renders non-numeric Citizen Reliability Record for providers without star scores', () => {
        render(
            <ReviewCeremonyModal
                isOpen={true}
                onClose={vi.fn()}
                orderId="01a0d011-order-456"
                referenceTitle="Order #ORD-7721"
                actorRole="provider"
                targets={[
                    {
                        orderId: '01a0d011-order-456',
                        providerName: 'Ate Gina Client',
                        role: 'Customer',
                    },
                ]}
            />,
        );

        expect(screen.getByText('Citizen Reliability Feedback')).toBeTruthy();
        expect(screen.getByText(/Asymmetric Citizen Reliability Record/i)).toBeTruthy();

        // Factual chips rendered
        expect(screen.getByText(/Cash Ready on Site/i)).toBeTruthy();
        expect(screen.getByText(/Site Accessible & Ready/i)).toBeTruthy();
        expect(screen.getByText(/Respectful Communication/i)).toBeTruthy();

        // Star picker should NOT exist for providers
        expect(screen.queryByText('Overall Rating')).toBeNull();
    });

    it('renders Stage 2 Sealed with 72-hour anti-retaliation hold badge', () => {
        render(
            <ReviewCeremonyModal
                isOpen={true}
                onClose={vi.fn()}
                referenceTitle="Order #ORD-7721"
                initialStage="sealed"
                targets={sampleTargets}
            />,
        );

        expect(screen.getByText('Review Sealed & Protected')).toBeTruthy();
        expect(screen.getByText('72-Hour Anti-Retaliation Window Active')).toBeTruthy();
        expect(screen.getByText(/escrow hold/i)).toBeTruthy();
    });

    it('renders Stage 3 Revealed with published status', () => {
        render(
            <ReviewCeremonyModal
                isOpen={true}
                onClose={vi.fn()}
                referenceTitle="Order #ORD-7721"
                initialStage="revealed"
                targets={sampleTargets}
            />,
        );

        expect(screen.getByText('Reviews Revealed & Published!')).toBeTruthy();
        expect(screen.getByText(/bilateral ceremony/i)).toBeTruthy();
    });
});
