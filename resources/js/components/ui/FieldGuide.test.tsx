import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FieldGuide } from './FieldGuide';
import type { FieldGuidanceItem } from '@/lib/builderGuidance';

const sampleGuidance: FieldGuidanceItem = {
    id: 'sample-title',
    question: 'How should I name my service?',
    answer: 'Use a clear trade title with your primary craft (e.g. Inverter Split AC Cleaning).',
    example: 'Inverter Split AC Deep Clean & Checkup',
};

describe('FieldGuide Component', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders the info trigger button with accessible label', () => {
        render(<FieldGuide guidance={sampleGuidance} mode="guided" />);

        const btn = screen.getByRole('button', {
            name: /guidance for sample-title: how should i name my service\?/i,
        });
        expect(btn).toBeTruthy();
        expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles contextual Q&A popover open and closed on click', () => {
        render(<FieldGuide guidance={sampleGuidance} mode="guided" />);

        const btn = screen.getByRole('button', {
            name: /guidance for sample-title/i,
        });

        // Initially closed
        expect(screen.queryByTestId('field-guide-popover-sample-title')).toBeNull();

        // Open
        fireEvent.click(btn);
        expect(screen.getByTestId('field-guide-popover-sample-title')).toBeTruthy();
        expect(screen.getByText('How should I name my service?')).toBeTruthy();
        expect(
            screen.getByText(
                'Use a clear trade title with your primary craft (e.g. Inverter Split AC Cleaning).',
            ),
        ).toBeTruthy();
        expect(screen.getByText('Inverter Split AC Deep Clean & Checkup')).toBeTruthy();
        expect(btn.getAttribute('aria-expanded')).toBe('true');

        // Toggle closed
        fireEvent.click(btn);
        expect(screen.queryByTestId('field-guide-popover-sample-title')).toBeNull();
        expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes the popover when the close (X) button is clicked', () => {
        render(<FieldGuide guidance={sampleGuidance} mode="guided" />);

        const btn = screen.getByRole('button', {
            name: /guidance for sample-title/i,
        });
        fireEvent.click(btn);

        const closeBtn = screen.getByRole('button', { name: /close guide/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByTestId('field-guide-popover-sample-title')).toBeNull();
    });

    it('renders correctly in inline mode without clipping', () => {
        render(<FieldGuide guidance={sampleGuidance} mode="guided" inline={true} />);

        const btn = screen.getByRole('button', {
            name: /guidance for sample-title/i,
        });
        fireEvent.click(btn);

        const inlineCard = screen.getByTestId('field-guide-inline-sample-title');
        expect(inlineCard).toBeTruthy();
        expect(inlineCard.className).toContain('w-full');
        expect(screen.getByText('How should I name my service?')).toBeTruthy();
    });

    it('renders with subtle styling in advanced mode', () => {
        render(<FieldGuide guidance={sampleGuidance} mode="advanced" />);

        const btn = screen.getByRole('button', {
            name: /guidance for sample-title/i,
        });
        expect(btn).toBeTruthy();
        // Still clickable by power users
        fireEvent.click(btn);
        expect(screen.getByTestId('field-guide-popover-sample-title')).toBeTruthy();
    });
});
