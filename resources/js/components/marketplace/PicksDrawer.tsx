import { ShoppingBag, X, Plus, Minus, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import type { BasketItem } from '@/marketplace/types';

interface PicksDrawerProps {
    open: boolean;
    onClose: () => void;
    items: BasketItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemoveItem: (id: string) => void;
    onCheckout: () => void;
}

export function PicksDrawer({
    open,
    onClose,
    items,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
}: PicksDrawerProps) {
    if (!open) return null;

    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over panel container */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-xl bg-[#EBF2FA] text-[#0F2F58]">
                                <ShoppingBag className="size-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-extrabold text-[#0F2F58]">
                                    Citizen Picks
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {totalCount} {totalCount === 1 ? 'item' : 'items'} ready for escrow
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            aria-label="Close drawer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    {/* Drawer Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                    <ShoppingBag className="size-7" />
                                </div>
                                <h3 className="mt-4 text-sm font-extrabold text-[#0F2F58]">
                                    Your Picks tray is empty
                                </h3>
                                <p className="mt-1 max-w-xs text-xs text-slate-500">
                                    Browse the Tagudin marketplace and tap "+ Book" or add items to stage services and goods.
                                </p>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-5 rounded-full bg-[#0F2F58] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#153e74] transition-colors cursor-pointer"
                                >
                                    Explore Marketplace
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#FAFCFB] p-3 shadow-xs"
                                    >
                                        <div className="flex-1">
                                            <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">
                                                {item.title}
                                            </h4>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                                <span>Verified Tagudin provider</span>
                                            </div>
                                            <div className="mt-1 font-mono text-xs font-extrabold text-[#0F2F58]">
                                                ₱{item.price.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Quantity & Remove controls */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQuantity(item.id, -1)}
                                                    className="flex size-6 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="size-3" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-bold text-slate-800">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQuantity(item.id, 1)}
                                                    className="flex size-6 cursor-pointer items-center justify-center text-slate-600 hover:text-slate-900"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="size-3" />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem(item.id)}
                                                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                aria-label="Remove item"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Drawer Footer: Subtotal & Escrow CTA */}
                    {items.length > 0 && (
                        <div className="border-t border-slate-200 bg-white p-6">
                            {/* Protection Banner */}
                            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-[11px] font-semibold text-emerald-800">
                                <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                                <span>Tiwala Escrow Protection: Funds release only after milestone photo verification.</span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Picks subtotal</span>
                                    <span className="font-mono font-bold text-slate-800">₱{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 font-medium">
                                    <span>Community escrow fee</span>
                                    <span className="font-mono font-bold text-emerald-700">₱0.00 (Launch Promo)</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-extrabold text-[#0F2F58]">
                                    <span>Total Escrow Authorization</span>
                                    <span className="font-mono text-base">₱{subtotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onCheckout}
                                className="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0F2F58] text-xs font-extrabold tracking-wide text-white shadow-md transition-all hover:bg-[#153e74] active:scale-98"
                            >
                                <span>Proceed to Escrow Booking</span>
                                <ArrowRight className="size-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
