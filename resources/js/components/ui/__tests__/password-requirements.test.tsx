import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PasswordRequirements, validatePassword } from '../PasswordRequirements';

afterEach(cleanup);

describe('PasswordRequirements & validatePassword', () => {
    describe('validatePassword logic (AppServiceProvider defaults)', () => {
        it('fails minLength if under 8 characters', () => {
            const res = validatePassword('Ab1!');
            expect(res.rules.minLength).toBe(false);
            expect(res.rules.mixedCase).toBe(true);
            expect(res.rules.hasNumber).toBe(true);
            expect(res.rules.hasSymbol).toBe(true);
            expect(res.isValid).toBe(false);
        });

        it('fails mixedCase if all lowercase or all uppercase', () => {
            const allLower = validatePassword('password123!');
            expect(allLower.rules.minLength).toBe(true);
            expect(allLower.rules.mixedCase).toBe(false);
            expect(allLower.isValid).toBe(false);

            const allUpper = validatePassword('PASSWORD123!');
            expect(allUpper.rules.mixedCase).toBe(false);
            expect(allUpper.isValid).toBe(false);
        });

        it('fails number if no digits present', () => {
            const noNumber = validatePassword('Password!@#');
            expect(noNumber.rules.hasNumber).toBe(false);
            expect(noNumber.isValid).toBe(false);
        });

        it('fails symbol if no special characters present', () => {
            const noSymbol = validatePassword('Password123');
            expect(noSymbol.rules.hasSymbol).toBe(false);
            expect(noSymbol.isValid).toBe(false);
        });

        it('passes isValid when all 4 Laravel criteria are met', () => {
            const valid = validatePassword('Password123!');
            expect(valid.rules.minLength).toBe(true);
            expect(valid.rules.mixedCase).toBe(true);
            expect(valid.rules.hasNumber).toBe(true);
            expect(valid.rules.hasSymbol).toBe(true);
            expect(valid.score).toBe(4);
            expect(valid.strength).toBe('strong');
            expect(valid.isValid).toBe(true);
        });

        it('verifies confirmation match when provided', () => {
            const mismatch = validatePassword('Password123!', 'Different123!');
            expect(mismatch.rules.matchesConfirmation).toBe(false);
            expect(mismatch.isValid).toBe(false);

            const match = validatePassword('Password123!', 'Password123!');
            expect(match.rules.matchesConfirmation).toBe(true);
            expect(match.isValid).toBe(true);
        });
    });

    describe('PasswordRequirements UI Component', () => {
        it('renders all rules in neutral/untouched state when empty', () => {
            render(<PasswordRequirements password="" />);

            expect(screen.getByTestId('password-requirements-guide')).toBeDefined();
            expect(screen.getByText('At least 8 characters')).toBeDefined();
            expect(
                screen.getByText('At least one uppercase and one lowercase letter'),
            ).toBeDefined();
            expect(screen.getByText('At least one number (0–9)')).toBeDefined();
            expect(screen.getByText('At least one symbol (!@#$%^&*...)')).toBeDefined();
            expect(screen.getByText('Password strength')).toBeDefined();
        });

        it('dynamically marks rules as met (green) or unmet (red) while typing', () => {
            // "pass" has lowercase, length < 8, no uppercase, no number, no symbol
            const { rerender } = render(<PasswordRequirements password="pass" />);

            const minLengthItem = screen.getByTestId('pwd-rule-min_length');
            expect(minLengthItem.className).toContain('text-rose-700');

            const mixedCaseItem = screen.getByTestId('pwd-rule-mixed_case');
            expect(mixedCaseItem.className).toContain('text-rose-700');

            // Now type "Password123!" -> all green
            rerender(<PasswordRequirements password="Password123!" />);

            const minLengthMet = screen.getByTestId('pwd-rule-min_length');
            expect(minLengthMet.className).toContain('text-emerald-800');

            const mixedCaseMet = screen.getByTestId('pwd-rule-mixed_case');
            expect(mixedCaseMet.className).toContain('text-emerald-800');

            const numberMet = screen.getByTestId('pwd-rule-number');
            expect(numberMet.className).toContain('text-emerald-800');

            const symbolMet = screen.getByTestId('pwd-rule-symbol');
            expect(symbolMet.className).toContain('text-emerald-800');

            expect(screen.getByText('Strong & Secure ✓')).toBeDefined();
        });

        it('shows confirmation match checklist item when enabled', () => {
            const { rerender } = render(
                <PasswordRequirements
                    password="Password123!"
                    passwordConfirmation="Mismatch123!"
                    showConfirmation={true}
                />,
            );

            const confirmRule = screen.getByTestId('pwd-rule-confirmation');
            expect(confirmRule.className).toContain('text-rose-700');

            rerender(
                <PasswordRequirements
                    password="Password123!"
                    passwordConfirmation="Password123!"
                    showConfirmation={true}
                />,
            );

            const confirmRuleMet = screen.getByTestId('pwd-rule-confirmation');
            expect(confirmRuleMet.className).toContain('text-emerald-800');
        });
    });
});
