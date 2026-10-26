import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { DesktopGlobalNav } from '@/components/layout/DesktopGlobalNav';
import { BottomNavBar, type NavTabId } from '@/marketplace/components/BottomNavBar';

type Invitation = {
    id: string;
    status: string;
    version: number;
    expires_at: string;
    actionable: boolean;
    chain: { title: string };
    need: { title: string; kind: string; node_key: string; node_role: string };
    coordinator_name: string;
    purpose: string;
    terms: { title: string; work_shape: string; amount_minor: number | null; currency: string; quantity: number | null };
    deal_chain_id?: string;
    deal_need_id?: string;
    expected_need_version?: number;
    can_withdraw_need?: boolean;
};

export default function DealInvitationsIndex({ invitations }: { invitations: Invitation[] }) {
    const [responded, setResponded] = useState<Record<string, 'accepted' | 'declined'>>({});
    const [processing, setProcessing] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const withdrawalKeys = useRef(new Map<string, string>());

    const respond = async (invitation: Invitation, decision: 'accept' | 'decline') => {
        setProcessing(invitation.id);
        setErrors((current) => ({ ...current, [invitation.id]: '' }));
        try {
            const response = await fetch(`/deal-invitations/${invitation.id}/respond`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    'X-Idempotency-Key': crypto.randomUUID(),
                },
                body: JSON.stringify({ decision, expected_version: invitation.version }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error?.message ?? 'Unable to respond to this invitation. Refresh and try again.');
            }
            setResponded((current) => ({ ...current, [invitation.id]: decision === 'accept' ? 'accepted' : 'declined' }));
        } catch (error) {
            setErrors((current) => ({
                ...current,
                [invitation.id]: error instanceof Error ? error.message : 'Unable to respond to this invitation.',
            }));
        } finally {
            setProcessing(null);
        }
    };
    const withdrawAcceptance = async (invitation: Invitation) => {
        if (!invitation.deal_chain_id || !invitation.deal_need_id || invitation.expected_need_version === undefined) return;
        setProcessing(invitation.id);
        setErrors((current) => ({ ...current, [invitation.id]: '' }));
        let idempotencyKey = withdrawalKeys.current.get(invitation.id);
        if (!idempotencyKey) {
            idempotencyKey = crypto.randomUUID();
            withdrawalKeys.current.set(invitation.id, idempotencyKey);
        }
        const xsrfToken = document.cookie.split(';').map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
            ?.slice('XSRF-TOKEN='.length);
        try {
            const response = await fetch(`/deal-chains/${invitation.deal_chain_id}/needs/${invitation.deal_need_id}/withdraw`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrfToken ? decodeURIComponent(xsrfToken) : '',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Idempotency-Key': idempotencyKey,
                },
                body: JSON.stringify({ expected_need_version: invitation.expected_need_version }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error?.message ?? 'This Need could not be withdrawn. Refresh and try again.');
            }
            withdrawalKeys.current.delete(invitation.id);
            router.reload();
        } catch (error) {
            setErrors((current) => ({
                ...current,
                [invitation.id]: error instanceof Error ? error.message : 'This Need could not be withdrawn.',
            }));
        } finally {
            setProcessing(null);
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Head title="Deal invitations" />
            <DesktopGlobalNav activeRoute="deal-invitations" />
            <main className="mx-auto w-full max-w-4xl px-4 py-8 pb-24 sm:px-6 lg:pb-8">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Deal invitations</h1>
                    <p className="mt-2 text-sm text-slate-600">Private offers addressed to you. Accepting asks the customer to confirm; it does not create an order.</p>
                </header>
                {invitations.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">You have no current deal invitations.</p>
                ) : (
                    <ul className="space-y-4">
                        {invitations.map((invitation) => {
                            const response = responded[invitation.id];
                            const amount = invitation.terms.amount_minor;
                            return (
                                <li key={invitation.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{invitation.chain.title}</p>
                                            <h2 className="mt-1 text-lg font-bold">{invitation.terms.title || invitation.need.title}</h2>
                                            <p className="mt-1 text-sm text-slate-600">{invitation.need.kind} · {invitation.terms.work_shape || 'Work details in scope'} · Coordinator: {invitation.coordinator_name}</p>
                                            <p className="mt-1 text-xs text-slate-500">Invitation scope: {invitation.need.node_role} · read-only</p>
                                        </div>
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">{response === 'accepted' || invitation.status === 'accepted' ? 'Waiting for customer confirmation' : response === 'declined' || invitation.status === 'declined' ? 'Declined' : invitation.actionable ? 'Awaiting your response' : 'Expired'}</span>
                                    </div>
                                    <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                                        <div><dt className="text-slate-500">Proposed amount</dt><dd className="font-semibold">{amount === null ? 'Not specified' : `${invitation.terms.currency} ${(amount / 100).toFixed(2)}`}</dd></div>
                                        <div><dt className="text-slate-500">Quantity</dt><dd className="font-semibold">{invitation.terms.quantity ?? 'As scoped'}</dd></div>
                                        <div><dt className="text-slate-500">Respond by</dt><dd className="font-semibold">{new Date(invitation.expires_at).toLocaleString()}</dd></div>
                                    </dl>
                                    {errors[invitation.id] ? <p role="alert" className="mt-3 text-sm text-red-700">{errors[invitation.id]}</p> : null}
                                    {response === 'accepted' ? <p className="mt-4 text-sm text-emerald-800">You accepted. The customer must confirm these terms before an independent order can be created.</p> : null}
                                    {response === 'declined' ? <p className="mt-4 text-sm text-slate-600">You declined. This invitation released the slot for the coordinator to source another provider.</p> : null}
                                    {!response && invitation.actionable ? (
                                        <div className="mt-5 flex gap-3">
                                            <button type="button" disabled={processing !== null} onClick={() => respond(invitation, 'accept')} className="rounded-lg bg-[#0F2F58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{processing === invitation.id ? 'Submitting…' : 'Accept invitation'}</button>
                                            <button type="button" disabled={processing !== null} onClick={() => respond(invitation, 'decline')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Decline</button>
                                        </div>
                                    ) : null}
                                    {invitation.can_withdraw_need && (
                                        <div className="mt-5">
                                            <button
                                                type="button"
                                                disabled={processing !== null}
                                                onClick={() => void withdrawAcceptance(invitation)}
                                                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                                            >
                                                {processing === invitation.id ? 'Withdrawing acceptance…' : 'Withdraw acceptance'}
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
            <BottomNavBar
                activeTab="invitations"
                onTabSelect={(tab: NavTabId) => {
                    if (tab === 'invitations') return;
                    if (tab === 'explore' || tab === 'quick_deal') router.visit('/browse');
                    if (tab === 'orders') router.visit('/orders');
                    if (tab === 'profile') router.visit('/my-listings');
                    if (tab === 'post') router.visit('/requests/create');
                }}
            />
        </div>
    );
}
