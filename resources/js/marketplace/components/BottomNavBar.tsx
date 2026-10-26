import React, { type ReactNode } from 'react';
import { Home, Mail, PlusCircle, QrCode, ShoppingBag, User } from 'lucide-react';

export type NavTabId =
    'explore' | 'post' | 'quick_deal' | 'orders' | 'invitations' | 'profile' | 'search' | 'saved';

interface BottomNavBarProps {
    activeTab: NavTabId | string;
    ordersCount?: number;
    onTabSelect: (tab: NavTabId) => void;
    onQuickDealClick?: () => void;
    notificationSlot?: ReactNode;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
    activeTab,
    ordersCount = 0,
    onTabSelect,
    onQuickDealClick,
    notificationSlot,
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
            className="lg:hidden fixed bottom-0 left-0 right-0 z-45 flex h-[60px] w-full items-center justify-around border-t border-[#E4E4E7] bg-white px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
            aria-label="Bottom Navigation Bar"
        >
            {/* Signature Elevated Center Quick Deal QR FAB */}
            <button
                type="button"
                onClick={handleQuickDeal}
                className="group absolute -top-[22px] left-1/2 z-50 flex size-[54px] -translate-x-1/2 cursor-pointer flex-col items-center justify-center rounded-full border-[3.5px] border-white bg-[#0F2F58] text-[#FFC244] shadow-[0_6px_18px_rgba(15,47,88,0.38)] transition-transform active:scale-90"
                title="Quick Deal QR Scanner"
                aria-label="Quick Deal QR Scanner"
            >
                <QrCode className="size-6 text-[#FFC244] transition-transform group-hover:scale-105" />
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9.5px] font-extrabold whitespace-nowrap text-[#0F2F58]">
                    Quick Deal
                </span>
            </button>

            {/* 1. Explore */}
            <button
                type="button"
                onClick={() => onTabSelect('explore')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent transition-colors ${
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
                className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'post'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                <PlusCircle className="size-5" />
                <span className="text-[10px] font-bold">Post</span>
            </button>

            {/* 3. Center Spacer for Elevated FAB */}
            <div className="pointer-events-none flex flex-1 flex-col items-center opacity-0">
                <div className="size-6" />
                <span className="text-[10px]">Scan</span>
            </div>

            {/* 4. Orders / Tracking */}
            <button
                type="button"
                onClick={() => onTabSelect('orders')}
                className={`relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'orders'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
            >
                {ordersCount > 0 && (
                    <span className="absolute -top-0.5 right-[calc(50%-14px)] flex size-4 items-center justify-center rounded-full bg-[#FFC244] text-[9px] font-extrabold text-[#0F2F58]">
                        {ordersCount}
                    </span>
                )}
                <ShoppingBag className="size-5" />
                <span className="text-[10px] font-bold">Orders</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('invitations')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent transition-colors ${
                    activeTab === 'invitations'
                        ? 'font-bold text-[#0F2F58]'
                        : 'text-[#64748B] hover:text-[#0F2F58]'
                }`}
                aria-label="Deal invitations"
            >
                <Mail className="size-5" />
                <span className="text-[10px] font-bold">Invites</span>
            </button>
            {notificationSlot && <div className="flex flex-1 items-center justify-center">{notificationSlot}</div>}

            {/* 5. Profile */}
            <button
                type="button"
                onClick={() => onTabSelect('profile')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent transition-colors ${
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
