import React from 'react';
import { Star } from 'lucide-react';

export type FilterOption = {
    id: string;
    label: string;
    hasStarIcon?: boolean;
};

interface FilterChipBarProps {
    options: FilterOption[];
    activeFilterIds: string[];
    onToggleFilter: (filterId: string) => void;
}

export const FilterChipBar: React.FC<FilterChipBarProps> = ({
    options,
    activeFilterIds,
    onToggleFilter,
}) => {
    return (
        <div
            className="flex gap-2 overflow-x-auto bg-white px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Quick Filters"
        >
            {options.map((opt) => {
                const isActive = activeFilterIds.includes(opt.id);
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onToggleFilter(opt.id)}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                            isActive
                                ? 'border border-[#18181B] bg-[#18181B] text-white shadow-xs'
                                : 'border border-[#E4E4E7] bg-white text-[#18181B] hover:bg-[#F4F4F5]'
                        }`}
                    >
                        {opt.hasStarIcon && (
                            <Star
                                className={`size-3.5 ${
                                    isActive
                                        ? 'fill-white stroke-white'
                                        : 'fill-[#D97706] stroke-[#D97706]'
                                }`}
                            />
                        )}
                        <span>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
