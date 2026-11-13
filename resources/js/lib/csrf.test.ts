import { afterEach, describe, expect, it } from 'vitest';
import { getXsrfToken } from './csrf';

afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
});

describe('getXsrfToken', () => {
    it('reads and decodes the current XSRF cookie', () => {
        document.cookie = 'XSRF-TOKEN=rotated%20session%20token; path=/';

        expect(getXsrfToken()).toBe('rotated session token');
    });

    it('returns an empty string when the XSRF cookie is absent', () => {
        expect(getXsrfToken()).toBe('');
    });
});
