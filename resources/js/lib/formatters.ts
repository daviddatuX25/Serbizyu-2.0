/**
 * Serbizyu 2.0 - Display & Text Formatting Utilities
 */

/**
 * Cleanly truncates or formats a partner/vendor name for compact UI badges,
 * pipeline node headers, and chips without hardcoding specific merchants.
 *
 * @param fullName - Raw vendor or listing business title.
 * @param maxLen - Maximum character length before graceful truncation (default 16).
 * @param fallback - Fallback label if name is empty (default 'Partner').
 */
export function formatProviderShortName(
    fullName?: string | null,
    maxLen = 16,
    fallback = 'Partner',
): string {
    if (!fullName) {
        return fallback;
    }

    const trimmed = fullName.trim();
    if (!trimmed) {
        return fallback;
    }

    // Split on common merchant delimiters: " - ", " · ", "(", "/", " | "
    const primaryChunk = trimmed.split(/\s*[-·(/|]\s*/)[0]?.trim() || trimmed;

    // If already within budget, return immediately
    if (primaryChunk.length <= maxLen) {
        return primaryChunk;
    }

    // If multi-word, try preserving leading whole words that fit within budget
    const words = primaryChunk.split(/\s+/);
    if (words.length > 1) {
        let accumulated = '';
        for (const word of words) {
            const candidate = accumulated ? `${accumulated} ${word}` : word;
            if (candidate.length <= maxLen) {
                accumulated = candidate;
            } else {
                break;
            }
        }
        if (accumulated.length >= 3) {
            return accumulated;
        }
    }

    // Single long word or tightly bounded string: truncate cleanly with ellipsis
    return `${primaryChunk.slice(0, maxLen - 1).trimEnd()}…`;
}
