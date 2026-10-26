import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PaymentObligationSheet, { type PaymentObligation } from '../PaymentObligationSheet';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: { post },
}));

afterEach(() => {
    cleanup();
    post.mockReset();
});

const payerObligation: PaymentObligation = {
    id: 'obl-p2p-1',
    status: 'due',
    lane: 'p2p_transfer',
    amount_minor: 80000,
    currency: 'PHP',
    eligible_lanes: ['external_cash', 'p2p_transfer'],
    can_select_lane: true,
    can_report_cash: false,
    can_acknowledge_cash: false,
    can_submit_p2p_proof: true,
};

function openSheet(obligation: PaymentObligation): void {
    render(<PaymentObligationSheet orderId="order-1" obligation={obligation} />);
    fireEvent.click(screen.getByRole('button', { name: /payment details/i }));
}

describe('PaymentObligationSheet P2P controls', () => {
    it('uploads an image with a currency amount and transfer reference in minor-unit contract fields', () => {
        openSheet(payerObligation);
        const proof = new File(['valid image bytes'], 'receipt.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Transfer image'), { target: { files: [proof] } });
        fireEvent.change(screen.getByRole('textbox', { name: 'Transfer reference' }), { target: { value: 'TXN-2026-001' } });
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount sent (PHP)' }), { target: { value: '799.50' } });
        fireEvent.click(screen.getByRole('button', { name: 'Upload and submit transfer proof' }));

        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/p2p/proof', {
            proof,
            sent_amount_minor: 79950,
            transfer_reference: 'TXN-2026-001',
        }, expect.objectContaining({ preserveScroll: true }));
    });

    it('enables mismatch instead of verification when the received amount differs', () => {
        openSheet({
            ...payerObligation,
            status: 'payer_submitted_p2p_proof',
            can_submit_p2p_proof: false,
            can_verify_p2p_proof: true,
            can_flag_payment_mismatch: true,
            p2p_proof_scan_status: 'clean',
            p2p_sent_amount_minor: 80000,
            p2p_transfer_reference: 'TXN-2026-001',
        });

        const receivedAmount = screen.getByRole('spinbutton', { name: 'Amount received (PHP)' });
        const verify = screen.getByRole('button', { name: 'Confirm full amount received' });
        const mismatch = screen.getByRole('button', { name: 'Report amount mismatch' });
        expect(verify.hasAttribute('disabled')).toBe(false);
        expect(mismatch.hasAttribute('disabled')).toBe(true);

        fireEvent.change(receivedAmount, { target: { value: '799.50' } });
        expect(verify.hasAttribute('disabled')).toBe(true);
        expect(mismatch.hasAttribute('disabled')).toBe(false);
        fireEvent.click(mismatch);

        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/mismatch', {
            received_amount_minor: 79950,
        }, expect.objectContaining({ preserveScroll: true }));
    });

    it('reports a mismatch when the payer-reported amount differs even if the recipient received the obligation amount', () => {
        openSheet({
            ...payerObligation,
            status: 'payer_submitted_p2p_proof',
            can_submit_p2p_proof: false,
            can_verify_p2p_proof: true,
            can_flag_payment_mismatch: true,
            p2p_proof_scan_status: 'clean',
            p2p_sent_amount_minor: 79900,
            p2p_transfer_reference: 'TXN-2026-001',
        });
        expect(screen.getByRole('button', { name: 'Confirm full amount received' }).hasAttribute('disabled')).toBe(true);
        const mismatch = screen.getByRole('button', { name: 'Report amount mismatch' });
        expect(mismatch.hasAttribute('disabled')).toBe(false);
        fireEvent.click(mismatch);

        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/mismatch', {
            received_amount_minor: 80000,
        }, expect.objectContaining({ preserveScroll: true }));
    });

    it('submits a full-amount receipt verification and provides a proof replacement after rejection', () => {
        openSheet({
            ...payerObligation,
            status: 'payer_submitted_p2p_proof',
            can_submit_p2p_proof: false,
            can_verify_p2p_proof: true,
            p2p_proof_scan_status: 'clean',
            p2p_sent_amount_minor: 80000,
            p2p_transfer_reference: 'TXN-2026-001',
        });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm full amount received' }));
        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/p2p/verify', {
            received_amount_minor: 80000,
        }, expect.objectContaining({ preserveScroll: true }));

        cleanup();
        openSheet({
            ...payerObligation,
            status: 'proof_rejected',
            p2p_sent_amount_minor: 80000,
            p2p_transfer_reference: 'TXN-2026-001',
        });
        const reference = screen.getByRole('textbox', { name: 'Transfer reference' });
        const sentAmount = screen.getByRole('spinbutton', { name: 'Amount sent (PHP)' });
        expect((reference as HTMLInputElement).value).toBe('TXN-2026-001');
        expect(reference.hasAttribute('readonly')).toBe(true);
        expect((sentAmount as HTMLInputElement).value).toBe('800.00');
        expect(sentAmount.hasAttribute('readonly')).toBe(true);
        expect(screen.getByRole('button', { name: 'Upload replacement proof' }).hasAttribute('disabled')).toBe(true);
        const proof = new File(['replacement image bytes'], 'replacement.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText('Transfer image'), { target: { files: [proof] } });
        expect(screen.getByRole('button', { name: 'Upload replacement proof' }).hasAttribute('disabled')).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Upload replacement proof' }));
        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/p2p/proof', {
            proof,
            sent_amount_minor: 80000,
            transfer_reference: 'TXN-2026-001',
        }, expect.objectContaining({ preserveScroll: true }));
    });

    it('requires a rejection reason before requesting replacement proof', () => {
        openSheet({
            ...payerObligation,
            status: 'payer_submitted_p2p_proof',
            can_submit_p2p_proof: false,
            can_verify_p2p_proof: true,
            p2p_proof_scan_status: 'clean',
            p2p_sent_amount_minor: 80000,
            p2p_transfer_reference: 'TXN-2026-001',
        });
        const reject = screen.getByRole('button', { name: 'Reject proof and request replacement' });
        expect(reject.hasAttribute('disabled')).toBe(true);
        fireEvent.change(screen.getByRole('textbox', { name: 'Why is the proof rejected?' }), {
            target: { value: 'Transfer reference is unreadable.' },
        });
        expect(reject.hasAttribute('disabled')).toBe(false);
        fireEvent.click(reject);

        expect(post).toHaveBeenCalledWith('/orders/order-1/payment-obligations/obl-p2p-1/p2p/reject', {
            reason: 'Transfer reference is unreadable.',
        }, expect.objectContaining({ preserveScroll: true }));
    });
});
