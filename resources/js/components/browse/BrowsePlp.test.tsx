import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowsePlp } from './BrowsePlp';

const visit = vi.fn();

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: {
        visit: (...args: unknown[]) => visit(...args),
    },
}));

const listing = {
    id: 'listing-1',
    title: 'Tagudin local help',
    description: 'Reliable local help for simple needs.',
    category_code: 'local-services',
    listing_type: 'service',
    status: 'active',
    area: 'Tagudin',
    owner_name: 'Maya Tagudin',
    public: true,
    price_amount_minor: 15000,
    currency: 'PHP',
};

describe('BrowsePlp', () => {
    beforeEach(() => {
        window.localStorage.clear();
        visit.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders Split Service card meta without redundant Active badge or Open listing CTA', () => {
        render(<BrowsePlp listings={[listing]} />);

        expect(screen.getByRole('heading', { name: /browse active services in tagudin/i })).toBeTruthy();
        expect(screen.getByText(/local services/i)).toBeTruthy();
        expect(screen.getByText(/reliable local help for simple needs/i)).toBeTruthy();
        expect(screen.getByText(/by maya tagudin/i)).toBeTruthy();
        expect(screen.getByText(/tagudin public market/i)).toBeTruthy();
        expect(screen.getByText(/orders/i)).toBeTruthy();
        expect(screen.queryByText(/^active$/i)).toBeNull();
        expect(screen.queryByText(/open listing/i)).toBeNull();
        expect(screen.queryByText(/verified/i)).toBeNull();
        expect(screen.queryByText(/new · no reviews yet/i)).toBeNull();
        expect(document.querySelector('.nav-brand.sz-secondary-logo-slot')).toBeTruthy();
        expect(document.querySelector('.nav-brand img')?.getAttribute('src')).toContain('serbizyu-logo-long.png');
    });

    it('opens the listing when the card is activated', () => {
        const { container } = render(<BrowsePlp listings={[listing]} />);

        fireEvent.click(container.querySelector('.ptile')!);
        expect(visit).toHaveBeenCalledWith('/listings/listing-1');
    });

    it('filters by category from the filter sheet', () => {
        const second = {
            ...listing,
            id: 'listing-2',
            title: 'Weekend bibingka tray',
            category_code: 'local-food',
            listing_type: 'product',
        };
        const { container } = render(<BrowsePlp listings={[listing, second]} />);

        fireEvent.click(container.querySelector('.btn-tool')!);
        const sheet = screen.getByRole('dialog', { name: /filters/i });
        fireEvent.click(within(sheet).getByRole('button', { name: /local food/i }));
        fireEvent.click(within(sheet).getByRole('button', { name: /apply filters/i }));

        expect(within(container).getByText('Weekend bibingka tray')).toBeTruthy();
        expect(within(container).queryByText('Tagudin local help')).toBeNull();
    });

    it('pins a listing into the shortlist tray', () => {
        const { container } = render(<BrowsePlp listings={[listing]} />);

        const pin = container.querySelector('.ptile .pin-btn');
        expect(pin).toBeTruthy();
        fireEvent.click(pin!);

        fireEvent.click(screen.getByRole('button', { name: /1 pinned/i }));

        const tray = screen.getByRole('dialog', { name: /pinned listings/i });
        expect(within(tray).getByText('Tagudin local help')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /checkout|add to cart/i })).toBeNull();
        expect(visit).not.toHaveBeenCalled();
    });
    it('does not intersection-expand on 2-col layouts (hover/tap only)', () => {
        const observers: Array<{ cb: IntersectionObserverCallback }> = [];
        class FakeIO {
            constructor(cb: IntersectionObserverCallback) {
                observers.push({ cb });
            }
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
            root = null;
            rootMargin = '';
            thresholds = [];
        }
        vi.stubGlobal('IntersectionObserver', FakeIO as unknown as typeof IntersectionObserver);

        const matchMedia = (query: string) => ({
            matches: query.includes('min-width: 900px') || query.includes('min-width: 960px'),
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
                return false;
            },
        });
        vi.stubGlobal('matchMedia', matchMedia);

        const { container } = render(<BrowsePlp listings={[listing]} />);
        const card = container.querySelector('.ptile.dwell-card') as HTMLElement;
        expect(card).toBeTruthy();
        expect(observers.length).toBeGreaterThan(0);

        observers.forEach(({ cb }) => {
            cb(
                [
                    {
                        target: card,
                        isIntersecting: true,
                        intersectionRatio: 1,
                        boundingClientRect: card.getBoundingClientRect(),
                        intersectionRect: card.getBoundingClientRect(),
                        rootBounds: null,
                        time: 0,
                    } as IntersectionObserverEntry,
                ],
                {} as IntersectionObserver,
            );
        });

        expect(card.classList.contains('is-expanded')).toBe(false);
    });

    it('shows photo dots only when the card is expanded', async () => {
        class FakeIO {
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
            root = null;
            rootMargin = '';
            thresholds = [];
        }
        vi.stubGlobal('IntersectionObserver', FakeIO as unknown as typeof IntersectionObserver);

        const { container } = render(<BrowsePlp listings={[listing]} />);
        const card = container.querySelector('.ptile.dwell-card') as HTMLElement;
        expect(card).toBeTruthy();
        expect(card.querySelector('[data-media-dots]')).toBeNull();

        await act(async () => {
            card.dispatchEvent(new CustomEvent('serbizyu:force-expand', { bubbles: false }));
        });

        expect(card.classList.contains('is-expanded')).toBe(true);
        await waitFor(() => {
            expect(card.querySelector('[data-media-dots]')).toBeTruthy();
        });
        expect(within(card).getByRole('button', { name: /show photo 1 of/i })).toBeTruthy();
    });

    it('does not render desktop place-band accent or nav place chip', () => {
        const { container } = render(<BrowsePlp listings={[listing]} />);
        expect(container.querySelector('.place-band-fallback')).toBeNull();
        expect(container.querySelector('.place-band')).toBeNull();
        expect(container.querySelector('.place-chip')).toBeNull();
        expect(screen.queryByText(/active offers only/i)).toBeNull();
    });

    const stubWideDesktopMedia = () => {
        // Intentionally omit (hover: hover) — live UAs often report hover:none on desktop.
        vi.stubGlobal('matchMedia', (query: string) => ({
            matches:
                query.includes('min-width: 900px') ||
                query.includes('min-width: 960px'),
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
                return false;
            },
        }));
    };

    const stubIo = () => {
        class FakeIO {
            observe() {}
            unobserve() {}
            disconnect() {}
            takeRecords() {
                return [];
            }
            root = null;
            rootMargin = '';
            thresholds = [];
        }
        vi.stubGlobal('IntersectionObserver', FakeIO as unknown as typeof IntersectionObserver);
    };

    it('expands on steady desktop hover after 1.3s and spans full row in 2-col', async () => {
        vi.useFakeTimers();
        stubIo();
        stubWideDesktopMedia();

        const second = { ...listing, id: 'listing-2', title: 'Second offer' };
        const { container } = render(<BrowsePlp listings={[listing, second]} />);
        const cards = [...container.querySelectorAll('.ptile.dwell-card')] as HTMLElement[];
        expect(cards).toHaveLength(2);
        // Default sort is Newest first (reversed), so index 1 is the visual right cell.
        const left = cards[0];
        const right = cards[1];
        const leftId = left.dataset.id!;
        const rightId = right.dataset.id!;
        expect(rightId).not.toBe(leftId);
        expect(right.classList.contains('is-expanded')).toBe(false);

        // Steady pointer: enter and stay within the 6px dwell threshold.
        fireEvent.mouseEnter(right, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(right, { clientX: 103, clientY: 102, pointerType: 'mouse' });
        await act(async () => {
            vi.advanceTimersByTime(1299);
        });
        expect(container.querySelector(`[data-id="${rightId}"]`)?.classList.contains('is-expanded')).toBe(false);
        await act(async () => {
            vi.advanceTimersByTime(2);
        });
        expect(container.querySelector(`[data-id="${rightId}"]`)?.classList.contains('is-expanded')).toBe(true);
        // Right-column expand leads the row so the former left neighbor drops below.
        const ordered = [...container.querySelectorAll('.ptile.dwell-card')] as HTMLElement[];
        expect(ordered[0].dataset.id).toBe(rightId);
        expect(ordered[1].dataset.id).toBe(leftId);

        fireEvent.mouseLeave(ordered[0]);
        expect(container.querySelector(`[data-id="${rightId}"]`)?.classList.contains('is-expanded')).toBe(true);

        await act(async () => {
            fireEvent.pointerDown(document.body);
        });
        expect(container.querySelector('.ptile.is-expanded')).toBeNull();
        vi.useRealTimers();
    });

    it('does not expand when the pointer keeps moving beyond the dwell threshold', async () => {
        vi.useFakeTimers();
        stubIo();
        stubWideDesktopMedia();

        const { container } = render(<BrowsePlp listings={[listing]} />);
        const card = container.querySelector('.ptile.dwell-card') as HTMLElement;
        expect(card).toBeTruthy();

        fireEvent.mouseEnter(card, { clientX: 40, clientY: 40 });

        // Move beyond 6px every 400ms for >1.3s total — dwell must keep resetting.
        for (let i = 1; i <= 5; i += 1) {
            await act(async () => {
                vi.advanceTimersByTime(400);
            });
            expect(card.classList.contains('is-expanded')).toBe(false);
            fireEvent.pointerMove(card, {
                clientX: 40 + i * 20,
                clientY: 40,
                pointerType: 'mouse',
            });
        }

        // Still under a fresh dwell window after the last move.
        await act(async () => {
            vi.advanceTimersByTime(1299);
        });
        expect(card.classList.contains('is-expanded')).toBe(false);

        // Once the pointer stays put for the full dwell window, expand is allowed.
        await act(async () => {
            vi.advanceTimersByTime(2);
        });
        expect(card.classList.contains('is-expanded')).toBe(true);
        vi.useRealTimers();
    });

});
