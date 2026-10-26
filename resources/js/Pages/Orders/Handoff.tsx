import { Link } from '@inertiajs/react';
import A4HandoffPanel, { type A4HandoffProjection } from '@/components/orders/A4HandoffPanel';

type Props = {
    order: {
        id: string;
        public_reference: string | null;
        title: string;
        version: number;
    };
    a4Handoff: A4HandoffProjection;
};

export default function OrderHandoff({ order, a4Handoff }: Props) {
    return (
        <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6" data-testid="order-handoff-page">
            <header className="space-y-2">
                <Link href="/orders" className="text-xs font-bold text-[#0F2F58]">Back to orders</Link>
                <p className="font-mono text-xs font-bold text-slate-500">{order.public_reference ?? 'Order handoff'}</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#0F2F58]">{order.title}</h1>
            </header>
            <A4HandoffPanel orderId={order.id} orderVersion={order.version} handoff={a4Handoff} />
        </main>
    );
}
