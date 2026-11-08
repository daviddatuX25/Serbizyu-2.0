/** Opaque idempotency identifier; never an authentication or approval token. */
export function createRequestKey(): string {
    if (typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    let key = '';
    for (const byte of bytes) {
        key += byte.toString(16).padStart(2, '0');
    }
    return key;
}
