import * as React from 'react';
import { TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface FunnelStep {
    id: string;
    label: string;
    value: number;
    color?: string;
    subtext?: string;
}

interface FunnelAnalyticsProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    description?: string;
    steps: FunnelStep[];
    showDropoff?: boolean;
    conversionBadgeText?: string;
}

export function FunnelAnalytics({
    title = 'Commercial Conversion Funnel',
    description = 'Stage-by-stage discovery and conversion performance',
    steps,
    showDropoff = true,
    conversionBadgeText,
    className,
    ...props
}: FunnelAnalyticsProps) {
    const initialValue = steps[0]?.value && steps[0].value > 0 ? steps[0].value : 1;
    const finalValue = steps[steps.length - 1]?.value ?? 0;
    const netConversionPct = ((finalValue / initialValue) * 100).toFixed(1);

    const processedSteps = steps.map((step, index) => {
        const percentageFromTop = ((step.value / initialValue) * 100).toFixed(1);

        let dropoffRate: string | null = null;
        if (index > 0) {
            const prevValue = steps[index - 1].value;
            if (prevValue > 0) {
                const diff = ((prevValue - step.value) / prevValue) * 100;
                dropoffRate = diff.toFixed(1);
            } else {
                dropoffRate = '0.0';
            }
        }

        const widthPercentage = Math.max((step.value / initialValue) * 100, 4);

        return {
            ...step,
            percentageFromTop,
            dropoffRate,
            widthPercentage,
        };
    });

    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-xs shadow-xs',
                className,
            )}
            {...props}
        >
            {/* Funnel Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        {title}
                    </span>
                    <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {description}
                    </span>
                </div>
                <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/5 font-mono text-[10px] text-emerald-500"
                >
                    {conversionBadgeText ?? `${netConversionPct}% Net CVR`}
                </Badge>
            </div>

            {/* Funnel Steps */}
            <div className="flex flex-col gap-3">
                {processedSteps.map((step, index) => (
                    <div key={step.id} className="flex flex-col gap-1">
                        {/* Step Label & Value Line */}
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 font-semibold text-foreground">
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    0{index + 1}
                                </span>
                                <span>{step.label}</span>
                            </span>
                            <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="text-muted-foreground">
                                    {step.value.toLocaleString()}
                                </span>
                                <span className="py-0.2 rounded bg-muted/40 px-1.5 text-[11px] font-bold text-foreground">
                                    {step.percentageFromTop}%
                                </span>
                            </div>
                        </div>

                        {/* Horizontal Progress Bar */}
                        <div className="relative flex h-6 w-full items-center overflow-hidden rounded-md border border-border/50 bg-muted/20 p-0.5">
                            <div
                                className={cn(
                                    'flex h-full items-center justify-end rounded-xs px-2 font-mono text-[10px] text-white transition-all duration-500',
                                    step.color ?? 'bg-primary',
                                )}
                                style={{ width: `${step.widthPercentage}%` }}
                            >
                                {Number(step.widthPercentage) > 20 && (
                                    <span className="truncate opacity-90">
                                        {step.percentageFromTop}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Step Subtext if present */}
                        {step.subtext && (
                            <span className="text-[10px] text-muted-foreground">
                                {step.subtext}
                            </span>
                        )}

                        {/* Drop-off Indicator to Next Step */}
                        {showDropoff && index < processedSteps.length - 1 && step.dropoffRate && (
                            <div className="flex items-center justify-end gap-1 pt-0.5 pr-1 text-[10px] text-muted-foreground">
                                <TrendingDown className="size-2.5 text-rose-400" />
                                <span>Drop-off:</span>
                                <span className="font-mono font-medium text-rose-400">
                                    -{step.dropoffRate}%
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
