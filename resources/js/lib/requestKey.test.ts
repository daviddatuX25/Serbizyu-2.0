import { afterEach, expect, it, vi } from 'vitest';
import { createRequestKey } from './requestKey';

afterEach(() => vi.unstubAllGlobals());

it('creates a server-valid mutation key when HTTP does not expose randomUUID', () => {
    const browserCrypto = globalThis.crypto;
    vi.stubGlobal('crypto', {
        getRandomValues: browserCrypto.getRandomValues.bind(browserCrypto),
    });

    expect(createRequestKey()).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
});
