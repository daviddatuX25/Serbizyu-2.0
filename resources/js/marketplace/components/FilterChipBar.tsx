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
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto bg-white px-4 pt-3 pb-1 [&::-webkit-scrollbar]:hidden"
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
                                ? 'border border-[#0F2F58] bg-[#0F2F58] text-white shadow-xs'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {opt.hasStarIcon && (
                            <Star
                                className={`size-3.5 ${
                                    isActive
                                        ? 'fill-[#FFC244] stroke-[#FFC244]'
                                        : 'fill-[#FFC244] stroke-[#D97706]'
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
