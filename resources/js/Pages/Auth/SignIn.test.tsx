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

import SignIn from './SignIn';

const baseProps = {
    methods: { phone_password: true, email: true },
    session: { status: 'method_picker' },
};

describe('unified sign-in page', () => {
    beforeEach(() => {
        cleanup();
        routerPost.mockReset();
    });

    it('offers only phone and email while keeping password recovery visible', () => {
        render(<SignIn {...baseProps} />);

        expect(screen.getByRole('group', { name: 'Sign-in method' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Phone' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Email' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Use a one-time code instead' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Show password' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
        expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Email' }));

        expect(screen.getByLabelText('Email')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Use a one-time code instead' })).toBeNull();
    });

    it('starts phone OTP from the phone password view', () => {
        render(<SignIn {...baseProps} />);

        fireEvent.change(screen.getByPlaceholderText('09XXXXXXXXX'), {
            target: { value: '09171234567' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Use a one-time code instead' }));

        expect(routerPost).toHaveBeenCalledWith(
            '/auth/phone/request',
            { phone: '09171234567' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});
