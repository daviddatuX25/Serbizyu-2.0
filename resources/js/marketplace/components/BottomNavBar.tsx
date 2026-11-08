import React from 'react';
import { Home, PlusCircle, QrCode, ShoppingBag, User } from 'lucide-react';

export type NavTabId =
    'explore' | 'post' | 'quick_deal' | 'orders' | 'profile' | 'search' | 'saved';

interface BottomNavBarProps {
    activeTab: NavTabId | string;
    ordersCount?: number;
    onTabSelect: (tab: NavTabId) => void;
    onQuickDealClick?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
    activeTab,
    ordersCount = 0,
    onTabSelect,
    onQuickDealClick,
}) => {
    const handleQuickDeal = () => {
        if (onQuickDealClick) {
            onQuickDealClick();
        } else {
            onTabSelect('quick_deal');
        }
    };

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-45 grid h-[60px] w-full auto-cols-fr grid-flow-col items-center border-t border-[#E4E4E7] bg-white px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] lg:hidden"
            aria-label="Bottom Navigation Bar"
        >
            {/* 1. Explore */}
            <button
                type="button"
                onClick={() => onTabSelect('explore')}
                className={`flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'explore'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                <Home className="size-5" />
                <span className="text-[10px] font-bold">Explore</span>
            </button>

            {/* 2. Post / Create (+) */}
            <button
                type="button"
                onClick={() => onTabSelect('post')}
                className={`flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'post'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                <PlusCircle className="size-5" />
                <span className="text-[10px] font-bold">Post</span>
            </button>

            <button
                type="button"
                onClick={handleQuickDeal}
                className="flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent text-[#0F2F58] active:scale-95"
                title="Quick Deal QR Scanner"
                aria-label="Quick Deal QR Scanner"
            >
                <span className="-mt-4 flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#0F2F58] text-[#FFC244] shadow-[0_4px_12px_rgba(15,47,88,0.25)]">
                    <QrCode className="size-5" />
                </span>
                <span className="text-[10px] font-bold">Scan</span>
            </button>

            {/* 4. Orders / Tracking */}
            <button
                type="button"
                onClick={() => onTabSelect('orders')}
                className={`flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'orders'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                <span className="relative">
                    <ShoppingBag className="size-5" />
                    {ordersCount > 0 && (
                        <span className="absolute -right-2 -top-1 flex size-4 items-center justify-center rounded-full bg-[#FFC244] text-[9px] font-extrabold text-[#0F2F58]">
                            {ordersCount}
                        </span>
                    )}
                </span>
                <span className="text-[10px] font-bold">Orders</span>
            </button>


            {/* 5. Profile */}
            <button
                type="button"
                onClick={() => onTabSelect('profile')}
                className={`flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'profile'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                <User className="size-5" />
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </nav>
    );
};

export default BottomNavBar;
