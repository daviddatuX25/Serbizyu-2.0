import { describe, it, expect } from 'vitest';
import { formatProviderShortName } from './formatters';

describe('formatProviderShortName', () => {
    it('returns default fallback when name is null, undefined, or empty', () => {
        expect(formatProviderShortName(null)).toBe('Partner');
        expect(formatProviderShortName(undefined)).toBe('Partner');
        expect(formatProviderShortName('')).toBe('Partner');
        expect(formatProviderShortName('   ')).toBe('Partner');
        expect(formatProviderShortName(null, 14, 'Courier')).toBe('Courier');
    });

    it('returns short names untouched', () => {
        expect(formatProviderShortName('Kuya Ben')).toBe('Kuya Ben');
        expect(formatProviderShortName('Centro Eco')).toBe('Centro Eco');
        expect(formatProviderShortName('Ate Elena')).toBe('Ate Elena');
    });

    it('splits on delimiters like dashes, dots, and parentheses', () => {
        expect(formatProviderShortName('Tagudin Hardware - Supply Depot')).toBe('Tagudin Hardware');
        expect(formatProviderShortName('Danny Express · Motorcycle Pool')).toBe('Danny Express');
        expect(formatProviderShortName('Morning Bakery (Tagudin Centro)')).toBe('Morning Bakery');
    });

    it('preserves leading words when under maxLen', () => {
        // "Danny Express Motorcycle Pool" (without delimiter): first two words "Danny Express" is 13 chars <= 14
        expect(formatProviderShortName('Danny Express Motorcycle Pool', 14)).toBe('Danny Express');
    });

    it('truncates overly long single-word or tight strings with ellipsis', () => {
        expect(formatProviderShortName('SupercalifragilisticMerchant', 12)).toBe('Supercalifr…');
    });
});
