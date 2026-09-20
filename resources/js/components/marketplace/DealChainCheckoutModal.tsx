import { useState } from 'react';
import {
    ShieldCheck,
    ArrowRight,
    Truck,
    Wrench,
    Check,
    Store,
} from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type { BasketItem } from '@/marketplace/types';

interface DealChainCheckoutModalProps {
    open: boolean;
    onClose: () => void;
    items: BasketItem[];
    totalAmount: number;
    onAuthorize: (paymentMethod: 'cash' | 'gcash' | 'escrow') => void;
}

export function DealChainCheckoutModal({
    open,
    onClose,
    items,
    totalAmount,
    onAuthorize,
}: DealChainCheckoutModalProps) {
    const [selectedPayment, setSelectedPayment] = useState<'cash' | 'gcash' | 'escrow'>('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!open) return null;

    // Generate synthesized child orders from items and their deal chains
    const childOrders = items.flatMap((item, itemIdx) => {
        const baseOrder = {
            id: `ORD-${itemIdx + 1}01`,
            title: item.title,
            desc: 'Core service labor · Verified milestone execution',
            price: item.price * item.quantity,
            type: 'labor' as const,
        };

        if (item.dealChain && item.dealChain.recipeId === 'turnkey_parts') {
            return [
                {
                    id: `ORD-${itemIdx + 1}01`,
                    title: 'Tagudin Hardware Parts Depot',
                    desc: 'Part inventory · Ready at counter lane 2',
                    price: 180 * item.quantity,
                    type: 'store' as const,
                },
                {
                    id: `ORD-${itemIdx + 1}02`,
                    title: 'Danny Express Motorcycle Pool',
                    desc: 'Doorstep courier transit · Gated on part ready',
                    price: 35 * item.quantity,
                    type: 'courier' as const,
                },
                {
                    id: `ORD-${itemIdx + 1}03`,
                    title: item.title,
                    desc: 'On-site service labor · Gated on delivery complete',
                    price: (item.price - 215) * item.quantity,
                    type: 'labor' as const,
                },
            ];
        }

        if (item.dealChain && item.dealChain.recipeId === 'courier_delivery') {
            return [
                {
                    id: `ORD-${itemIdx + 1}01`,
                    title: 'Danny Express Courier',
                    desc: 'Doorstep transit across Tagudin Centro',
                    price: 35 * item.quantity,
                    type: 'courier' as const,
                },
                baseOrder,
            ];
        }

        return [baseOrder];
    });

    const handleConfirm = () => {
        setIsSubmitting(true);
        onAuthorize(selectedPayment);
    };

    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title="Authorize Deal Chain"
            subtitle={`${childOrders.length} Independent Child Orders · Non-Cascading Settlement`}
            bottomSlot={
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirm}
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98 disabled:opacity-50"
                >
                    <span>
                        {isSubmitting
                            ? 'Authorizing Deal Chain…'
                            : `Authorize Deal Chain & Escrow · ₱${totalAmount.toFixed(2)}`}
                    </span>
                    <ArrowRight className="size-4" />
                </button>
            }
        >
            <div className="flex flex-col gap-4 py-2 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Itemized Child Orders List */}
                <div className="flex flex-col gap-2.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Itemized Child Orders
                    </div>
                    {childOrders.map((order) => (
                        <div
                            key={order.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-[#0F2F58]">
                                    {order.type === 'store' ? (
                                        <Store className="size-4 text-amber-700" />
                                    ) : order.type === 'courier' ? (
                                        <Truck className="size-4 text-sky-700" />
                                    ) : (
                                        <Wrench className="size-4 text-emerald-700" />
                                    )}
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                        Order #{order.id}
                                    </span>
                                    <div className="font-extrabold text-slate-900">{order.title}</div>
                                    <div className="text-[10px] text-slate-500">{order.desc}</div>
                                </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-900">
                                ₱{Math.max(0, order.price).toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Soundness Guarantee Shield Box */}
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-[11px] text-blue-950">
                    <ShieldCheck className="size-4.5 shrink-0 text-[#0F2F58] mt-0.5" />
                    <div>
                        <strong>Non-Cascading Settlement Protection:</strong> Each child order is held in its own independent escrow line. If courier transit encounters delays, the store's inventory and technician labor remain financially isolated and protected.
                    </div>
                </div>

                {/* Payment Method Lane Selection */}
                <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        Payment Method
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedPayment('cash')}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                                selectedPayment === 'cash'
                                    ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58] shadow-xs'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {selectedPayment === 'cash' && <Check className="size-3.5 text-[#0F2F58]" />}
                            <span>Cash on Delivery</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPayment('gcash')}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                                selectedPayment === 'gcash'
                                    ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58] shadow-xs'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {selectedPayment === 'gcash' && <Check className="size-3.5 text-[#0F2F58]" />}
                            <span>GCash QR</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPayment('escrow')}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                                selectedPayment === 'escrow'
                                    ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58] shadow-xs'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {selectedPayment === 'escrow' && <Check className="size-3.5 text-[#0F2F58]" />}
                            <span>Tiwala Escrow</span>
                        </button>
                    </div>
                </div>
            </div>
        </GlovoWaveModal>
    );
}
