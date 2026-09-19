import React from 'react';
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';

export type NavTabId = 'explore' | 'search' | 'orders' | 'saved' | 'profile';

interface BottomNavBarProps {
    activeTab: NavTabId;
    ordersCount?: number;
    onTabSelect: (tab: NavTabId) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
    activeTab,
    ordersCount = 0,
    onTabSelect,
}) => {
    return (
        <nav
            className="fixed bottom-0 left-1/2 z-45 flex h-[60px] w-full max-w-[680px] -translate-x-1/2 items-center justify-around border-t border-[#E4E4E7] bg-white px-1 shadow-xs"
            aria-label="Bottom Navigation Bar"
        >
            <button
                type="button"
                onClick={() => onTabSelect('explore')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${
                    activeTab === 'explore' ? 'text-[#0F2F58]' : 'text-[#A1A1AA]'
                }`}
            >
                <Home className="size-5" />
                <span className="text-[10px] font-bold">Explore</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('search')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${
                    activeTab === 'search' ? 'text-[#0F2F58]' : 'text-[#A1A1AA]'
                }`}
            >
                <Search className="size-5" />
                <span className="text-[10px] font-bold">Search</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('orders')}
                className={`relative flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${
                    activeTab === 'orders' ? 'text-[#0F2F58]' : 'text-[#A1A1AA]'
                }`}
            >
                {ordersCount > 0 && (
                    <span className="absolute top-0 right-[calc(50%-12px)] size-2 rounded-full border border-white bg-[#FFC244]" />
                )}
                <ShoppingBag className="size-5" />
                <span className="text-[10px] font-bold">Orders</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('saved')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${
                    activeTab === 'saved' ? 'text-[#0F2F58]' : 'text-[#A1A1AA]'
                }`}
            >
                <Heart className="size-5" />
                <span className="text-[10px] font-bold">Saved</span>
            </button>

            <button
                type="button"
                onClick={() => onTabSelect('profile')}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-1 border-none bg-transparent ${
                    activeTab === 'profile' ? 'text-[#0F2F58]' : 'text-[#A1A1AA]'
                }`}
            >
                <User className="size-5" />
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </nav>
    );
};
