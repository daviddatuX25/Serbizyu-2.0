import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OtpPinInput } from './OtpPinInput';

describe('OtpPinInput', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders 6 input slots with accessible labels', () => {
        render(<OtpPinInput value="" onChange={() => undefined} />);
        const inputs = screen.getAllByRole('textbox');
        expect(inputs).toHaveLength(6);
        expect(screen.getByLabelText('Digit 1 of 6')).toBeTruthy();
        expect(screen.getByLabelText('Digit 6 of 6')).toBeTruthy();
    });

    it('renders digits when value is passed', () => {
        render(<OtpPinInput value="123" onChange={() => undefined} />);
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('calls onChange when user types a digit and advances', () => {
        const onChange = vi.fn();
        render(<OtpPinInput value="" onChange={onChange} />);
        const inputs = screen.getAllByRole('textbox');
        fireEvent.change(inputs[0], { target: { value: '9' } });
        expect(onChange).toHaveBeenCalledWith('9');
    });

    it('handles clipboard paste of full 6-digit code', () => {
        const onChange = vi.fn();
        const onComplete = vi.fn();
        render(<OtpPinInput value="" onChange={onChange} onComplete={onComplete} />);
        const group = screen.getByRole('group');

        fireEvent.paste(group, {
            clipboardData: {
                getData: () => '958622',
            },
        });

        expect(onChange).toHaveBeenCalledWith('958622');
        expect(onComplete).toHaveBeenCalledWith('958622');
    });
});
