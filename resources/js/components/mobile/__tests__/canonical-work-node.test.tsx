import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CanonicalWorkNode from '../CanonicalWorkNode';
import WorkflowsPrototypeShowcase from '../WorkflowsPrototypeShowcase';

afterEach(cleanup);

describe('CanonicalWorkNode & Workflows Prototype', () => {
    describe('CanonicalWorkNode Primitive', () => {
        it('renders step title, ordinal, duration, and proof icons', () => {
            render(
                <CanonicalWorkNode
                    id="node-test-1"
                    ordinal="01"
                    title="Deep Chemical Foam Flush"
                    dur="45m"
                    requiredProofs={['photo_proof', 'gps_checkin']}
                    clearanceMode="worker_direct"
                />,
            );

            expect(screen.getByText('Deep Chemical Foam Flush')).toBeDefined();
            expect(screen.getByText('01')).toBeDefined();
            expect(screen.getByText('45m')).toBeDefined();
            expect(screen.getByText('STEP')).toBeDefined();
            expect(screen.getByTitle('Photo proof required')).toBeDefined();
            expect(screen.getByTitle('GPS location check-in required')).toBeDefined();
        });

        it('handles clicks and key presses when interactive', () => {
            const onClick = vi.fn();
            render(
                <CanonicalWorkNode id="node-test-2" title="Interactive Stage" onClick={onClick} />,
            );

            const nodeElement = screen.getByTestId('canonical-work-node-node-test-2');
            fireEvent.click(nodeElement);
            expect(onClick).toHaveBeenCalledTimes(1);

            fireEvent.keyDown(nodeElement, { key: 'Enter' });
            expect(onClick).toHaveBeenCalledTimes(2);
        });

        it('renders runtime order statuses correctly (locked, in_progress, awaiting_approval, completed)', () => {
            const { rerender } = render(
                <CanonicalWorkNode id="node-status" title="Status Test Node" status="locked" />,
            );
            expect(screen.getByText('Locked')).toBeDefined();

            rerender(
                <CanonicalWorkNode
                    id="node-status"
                    title="Status Test Node"
                    status="in_progress"
                />,
            );
            expect(screen.getByText('Live')).toBeDefined();

            rerender(
                <CanonicalWorkNode
                    id="node-status"
                    title="Status Test Node"
                    status="awaiting_approval"
                />,
            );
            expect(screen.getByText('Review')).toBeDefined();

            rerender(
                <CanonicalWorkNode id="node-status" title="Status Test Node" status="completed" />,
            );
            expect(screen.getByText('Done')).toBeDefined();
        });

        it('renders multi-party deal chain roles (store, courier, labor, audit)', () => {
            const { rerender } = render(
                <CanonicalWorkNode
                    id="role-test"
                    title="Hardware Supply"
                    role="store"
                    feeMinor={50000}
                />,
            );
            expect(screen.getByText('STORE')).toBeDefined();
            expect(screen.getByText('₱500')).toBeDefined();

            rerender(
                <CanonicalWorkNode
                    id="role-test"
                    title="Courier Delivery"
                    role="courier"
                    feeMinor={15000}
                />,
            );
            expect(screen.getByText('COURIER')).toBeDefined();
            expect(screen.getByText('₱150')).toBeDefined();

            rerender(<CanonicalWorkNode id="role-test" title="Safety Audit" role="audit" />);
            expect(screen.getByText('AUDIT')).toBeDefined();
        });
        it('renders rich imagery across full-bleed, card-banner, and split-media variants', () => {
            const { rerender } = render(
                <CanonicalWorkNode
                    id="img-node"
                    title="Rich Photo Node"
                    photoUrl="/photos/ac-clean.jpg"
                    mediaVariant="full-bleed"
                />,
            );
            const img1 = screen.getByRole('img', { name: 'Rich Photo Node' });
            expect(img1).toBeDefined();
            expect(img1.getAttribute('src')).toBe('/photos/ac-clean.jpg');

            rerender(
                <CanonicalWorkNode
                    id="img-node"
                    title="Rich Photo Node"
                    photoUrl="/photos/courier.jpg"
                    mediaVariant="card-banner"
                />,
            );
            const img2 = screen.getByRole('img', { name: 'Rich Photo Node' });
            expect(img2.getAttribute('src')).toBe('/photos/courier.jpg');

            rerender(
                <CanonicalWorkNode
                    id="img-node"
                    title="Rich Photo Node"
                    photoUrl="/photos/ac-capacitor.jpg"
                    mediaVariant="split-media"
                />,
            );
            const img3 = screen.getByRole('img', { name: 'Rich Photo Node' });
            expect(img3.getAttribute('src')).toBe('/photos/ac-capacitor.jpg');
        });
    });

    describe('WorkflowsPrototypeShowcase', () => {
        it('renders all flow tabs and switches between Linear, Parallel, Decision Gate, and Deal Chain flows', () => {
            render(<WorkflowsPrototypeShowcase />);

            expect(screen.getByText(/Canonical Work Node/i)).toBeDefined();
            expect(screen.getByText('Site Check-In & Safety Prep')).toBeDefined();

            // Switch to Parallel flow
            fireEvent.click(screen.getByText('2. Parallel Flow'));
            expect(screen.getByText('Indoor Evaporator Deep Clean')).toBeDefined();
            expect(screen.getByText('Outdoor Condenser Overhaul')).toBeDefined();

            // Switch to Decision Gate flow
            fireEvent.click(screen.getByText('3. Decision Gate'));
            expect(screen.getByText('Freon Leak Detected?')).toBeDefined();
            expect(screen.getByText('Braze Copper & Full Recharge')).toBeDefined();

            // Switch to Deal Chain flow
            fireEvent.click(screen.getByText('4. Deal Chain Relay'));
            expect(screen.getByText('Tagudin Hardware Depot')).toBeDefined();
            expect(screen.getByText('Danny Express Moto Relay')).toBeDefined();
        });

        it('allows live editing of step title, duration, and evidence proofs', () => {
            render(<WorkflowsPrototypeShowcase />);

            const titleInput = screen.getByPlaceholderText('e.g. Deep Chemical Foam Flush');
            fireEvent.change(titleInput, { target: { value: 'Modified Inspection Procedure' } });

            // Expect reactive twin to update
            expect(screen.getAllByText('Modified Inspection Procedure').length).toBeGreaterThan(0);

            // Change duration preset
            fireEvent.click(screen.getByText('90m'));

            // Toggle proof
            fireEvent.click(screen.getByText('GPS Pin'));
        });

        it('toggles card presentation styles between Full-Bleed, Card-Banner, Split, and Compact', () => {
            render(<WorkflowsPrototypeShowcase />);

            fireEvent.click(screen.getByText('🎴 Top Photo Banner (ListingCard)'));
            fireEvent.click(screen.getByText('📱 Split Thumbnail (Marketplace)'));
            fireEvent.click(screen.getByText('⚡ Wire Compact Strip'));
            fireEvent.click(screen.getByText('🖼️ Full-Bleed Photo (Glovo Style)'));
        });
    });
});
