import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from '@inertiajs/react';
import type { ComponentType } from 'react';

import Triage from './Triage';
import type { TriagePageProps } from '@/types/admin-workspace';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
    router: { get: vi.fn(), visit: vi.fn() },
}));
vi.mock('@/layouts/AdminLayout', () => ({
    AdminLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const props: TriagePageProps = {
    inbox: {
        data: [
            {
                id: 'server-case-31',
                reference: 'CASE-SERVER-31',
                kind: 'case',
                title: 'Server-backed case only',
                status: 'open',
                severity: 'high',
                assigned_to: null,
                responsibility: { party: 'staff', user_id: null, label: 'Unassigned staff' },
                opened_at: '2026-10-26T08:00:00Z',
                updated_at: '2026-10-26T08:30:00Z',
                first_response_due_at: null,
                resolution_due_at: null,
                cohort: 'unclassified',
                inspect_url: '/admin/inspect?ref=CASE-SERVER-31',
            },
        ],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
    },
    views: {
        all_open: 1,
        assigned_to_me: 0,
        waiting_on_me: 0,
        waiting_on_others: 0,
        closed: 0,
    },
    filters: {
        view: 'all_open',
        q: null,
        status: null,
        category: null,
        cohort: null,
        assignee: null,
        page: 1,
    },
    staffContext: {
        operator: { id: 'staff-31', display_name: 'Assigned Operator', roles: ['admin'] },
        environment: 'testing',
        cohort: { selected: null, options: ['training'] },
    },
};

describe('Admin staff inbox', () => {
    it('renders the actual server-paginated row and its universal workspace link', () => {
        const Page = Triage as ComponentType<TriagePageProps>;
        render(<Page {...props} />);

        expect(screen.getByText('Server-backed case only')).toBeTruthy();
        expect(screen.getByRole('link', { name: /CASE-SERVER-31/i }).getAttribute('href')).toBe(
            '/admin/inspect?ref=CASE-SERVER-31',
        );
    });
    it('keeps URL filters on the server query and shows navigation loading state', () => {
        const Page = Triage as ComponentType<TriagePageProps>;
        render(<Page {...props} />);

        fireEvent.change(screen.getByLabelText('Filter by cohort'), { target: { value: 'training' } });
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search inbox' }), { target: { value: 'CASE-SERVER' } });
        fireEvent.click(screen.getByRole('button', { name: /Search/ }));
        expect(router.get).toHaveBeenCalledWith(
            '/admin/triage',
            expect.objectContaining({ view: 'all_open', cohort: 'training', q: 'CASE-SERVER' }),
            expect.objectContaining({ replace: true }),
        );
        expect(screen.getByText('Loading inbox…')).toBeTruthy();


    });
    it('shows a server filter validation error without replacing inbox data', () => {
        vi.mocked(router.get).mockImplementationOnce((_url, _data, options) => {
            options?.onError?.({ status: 'Status is not available.' });
        });
        const Page = Triage as ComponentType<TriagePageProps>;
        render(<Page {...props} />);

        fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'invalid-status' } });
        fireEvent.click(screen.getByRole('button', { name: /Search/ }));

        expect(screen.getByRole('alert').textContent).toContain('Status is not available.');
        expect(screen.getByText('Server-backed case only')).toBeTruthy();
    });
    it('requests the server-provided next page', () => {
        const Page = Triage as ComponentType<TriagePageProps>;
        render(<Page {...props} inbox={{
            ...props.inbox,
            links: { ...props.inbox.links, next: '/admin/triage?view=all_open&page=2&cohort=unclassified' },
            meta: { ...props.inbox.meta, last_page: 2 },
        }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(router.visit).toHaveBeenCalledWith(
            '/admin/triage?view=all_open&page=2&cohort=unclassified',
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(screen.getByText('Loading inbox…')).toBeTruthy();
    });
});