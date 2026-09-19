import React from 'react';
import type { MarketplaceCategory } from '../types';

interface CategoryTabsProps {
    categories: MarketplaceCategory[];
    selectedCategory: string;
    onSelectCategory: (categoryCode: string) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
    categories,
    selectedCategory,
    onSelectCategory,
}) => {
    return (
        <nav
            className="flex gap-2 overflow-x-auto border-b border-[#F4F4F5] bg-white px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Category Filters"
        >
            {categories.map((cat) => {
                const isActive = selectedCategory === cat.code;
                return (
                    <button
                        key={cat.code}
                        type="button"
                        onClick={() => onSelectCategory(cat.code)}
                        className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-bold whitespace-nowrap transition-all ${
                            isActive
                                ? 'bg-[#0F2F58] text-white shadow-xs'
                                : 'border border-transparent bg-transparent text-[#52525B] hover:bg-[#F4F4F5]'
                        }`}
                    >
                        {cat.label}
                    </button>
                );
            })}
        </nav>
    );
};
