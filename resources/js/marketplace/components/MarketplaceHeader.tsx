import React from 'react';
import { ChevronDown, MapPin, Search, SlidersHorizontal, User } from 'lucide-react';

interface MarketplaceHeaderProps {
    areaName?: string;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onLocationClick?: () => void;
    onFilterClick?: () => void;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
    areaName = 'Tagudin Town Center',
    searchQuery,
    onSearchChange,
    onLocationClick,
    onFilterClick,
}) => {
    return (
        <header className="sticky top-0 z-40 border-b border-[#F4F4F5] bg-white px-4 pt-3 pb-2.5">
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onLocationClick}
                    className="flex cursor-pointer items-center gap-2 border-none bg-transparent text-left"
                >
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#E8F0FA] text-[#0F2F58]">
                        <MapPin className="size-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase">
                            Delivering to
                        </span>
                        <span className="flex items-center gap-1 text-[13px] font-extrabold text-[#18181B]">
                            {areaName}
                            <ChevronDown className="size-3.5 text-[#52525B]" />
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full border-none bg-[#F4F4F5] text-[#18181B] transition-transform active:scale-95"
                    aria-label="Profile"
                >
                    <User className="size-4" />
                </button>
            </div>

            {/* Pill Search Field */}
            <div className="relative mt-2.5">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#71717A]" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search Tagudin services (e.g. AC cleaning, electrical, courier)"
                    className="h-11 w-full rounded-full border border-transparent bg-[#F4F4F5] pr-10 pl-10 text-[13px] font-semibold text-[#18181B] outline-none transition-all placeholder:text-[#A1A1AA] focus:border-[#FFC244] focus:bg-white focus:ring-3 focus:ring-[#FFC244]/25"
                />
                <button
                    type="button"
                    onClick={onFilterClick}
                    className="absolute top-1/2 right-2.5 flex size-6.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#18181B] shadow-xs hover:bg-[#F4F4F5]"
                    aria-label="Filter Options"
                >
                    <SlidersHorizontal className="size-3" />
                </button>
            </div>
        </header>
    );
};
