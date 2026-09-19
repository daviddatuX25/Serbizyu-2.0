import React from 'react';
import { Info } from 'lucide-react';

interface FeeThresholdTrackerProps {
    currentTotal: number;
    thresholdAmount?: number;
    savingsAmount?: number;
}

export const FeeThresholdTracker: React.FC<FeeThresholdTrackerProps> = ({
    currentTotal,
    thresholdAmount = 500,
    savingsAmount = 45,
}) => {
    const isUnlocked = currentTotal >= thresholdAmount;
    const progressPercent = Math.min(100, Math.max(0, (currentTotal / thresholdAmount) * 100));
    const remaining = Math.max(0, thresholdAmount - currentTotal);

    return (
        <aside className="flex flex-col gap-1.5 border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#92400E]">
                <Info className="size-3.5 shrink-0 text-[#92400E]" />
                <span>
                    {isUnlocked
                        ? `Delivery fee discount unlocked! Saved ₱${savingsAmount.toFixed(2)}`
                        : `Reach ₱${thresholdAmount.toFixed(2)} to save ₱${savingsAmount.toFixed(2)} in service fees! (₱${remaining.toFixed(2)} away)`}
                </span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#FDE68A]">
                <div
                    className="h-full rounded-full bg-[#0F2F58] transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </aside>
    );
};
