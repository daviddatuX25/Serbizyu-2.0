import React from 'react';

interface StickyBasketBarProps {
    count: number;
    totalAmount: number;
    onViewBasket: () => void;
}

export const StickyBasketBar: React.FC<StickyBasketBarProps> = ({
    count,
    totalAmount,
    onViewBasket,
}) => {
    if (count <= 0) {
        return null;
    }

    return (
        <aside className="pointer-events-none fixed bottom-[68px] left-1/2 z-50 w-full max-w-[648px] -translate-x-1/2 px-4">
            <button
                type="button"
                onClick={onViewBasket}
                className="pointer-events-auto flex h-[52px] w-full cursor-pointer items-center justify-between rounded-full border-none bg-[#FFC244] px-4 font-extrabold text-[#18181B] shadow-[0_6px_18px_rgba(255,194,68,0.4)] transition-transform active:scale-[0.97]"
            >
                <div className="flex items-center gap-2.5">
                    <span className="flex size-6.5 items-center justify-center rounded-full bg-[#18181B] text-[11px] font-black text-white">
                        {count}
                    </span>
                    <span className="text-[14px] tracking-tight">View Basket & Checkout</span>
                </div>
                <span className="text-[14px] font-black">₱{totalAmount.toFixed(2)}</span>
            </button>
        </aside>
    );
};
