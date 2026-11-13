export function getXsrfToken(): string {
    const cookie = document.cookie.split(';').map((part) => part.trim())
        .find((part) => part.startsWith('XSRF-TOKEN='));

    if (!cookie) return '';

    try {
        return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));
    } catch {
        return '';
    }
}
