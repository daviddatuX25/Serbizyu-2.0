import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerPost = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { post: routerPost },
}));

import Register from './Register';

const baseProps = {
    session: { status: 'phone_required' },
    devMode: true,
};

describe('registration page', () => {
    beforeEach(() => {
        cleanup();
        routerPost.mockReset();
    });

    it('shows the local helper and fills a valid test identity', () => {
        render(<Register {...baseProps} />);

        expect(screen.getByRole('status')).toBeTruthy();
        const quickFillButton = screen.getByRole('button', { name: 'Quick-fill test number' });

        fireEvent.click(quickFillButton);

        expect(screen.getByDisplayValue('Dev Test User')).toBeTruthy();
        expect(screen.getByDisplayValue(/^0917\d{7}$/)).toBeTruthy();
    });

    it('hides the local helper when development mode is disabled', () => {
        render(<Register {...baseProps} devMode={false} />);

        expect(screen.queryByRole('status')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Quick-fill test number' })).toBeNull();
    });
});
