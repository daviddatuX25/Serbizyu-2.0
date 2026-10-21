import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Pure SVG Micro Sparkline Component
 * Generates responsive, gradient-filled vector trends without external chart libraries.
 */
interface MicroSparklineProps {
    data: number[];
    color?: string;
    gradientId?: string;
    width?: number;
    height?: number;
    className?: string;
    strokeWidth?: number;
}

export function MicroSparkline({
    data,
    color = '#10b981',
    gradientId = 'sparkline-grad',
    width = 120,
    height = 36,
    className,
    strokeWidth = 2,
}: MicroSparklineProps) {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 3;

    const points = data.map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return { x, y };
    });

    const pathD = points.reduce((acc, pt, idx) => {
        if (idx === 0) return `M ${pt.x},${pt.y}`;
        return `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaD = `${pathD} L ${lastPt.x},${height} L ${firstPt.x},${height} Z`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn('shrink-0 overflow-visible', className)}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                </linearGradient>
            </defs>

            {/* Gradient Fill Area */}
            <path d={areaD} fill={`url(#${gradientId})`} />

            {/* Main Sparkline Stroke */}
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Terminal Current Coordinate Beacon */}
            <circle cx={lastPt.x} cy={lastPt.y} r={3} fill={color} className="animate-pulse" />
            <circle cx={lastPt.x} cy={lastPt.y} r={5} fill={color} opacity={0.3} />
        </svg>
    );
}

/**
 * Segmented Distribution Bar
 * Displays proportional ratio bars (e.g. 50% Cash / 50% Work)
 */
export interface DistributionSegment {
    label: string;
    value: number;
    colorClass: string;
}

interface SegmentBarProps {
    segments: DistributionSegment[];
    className?: string;
    height?: number;
    showLegend?: boolean;
}

export function SegmentBar({
    segments,
    className,
    height = 6,
    showLegend = false,
}: SegmentBarProps) {
    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

    return (
        <div className={cn('flex w-full flex-col gap-1.5', className)}>
            <div
                className="flex w-full overflow-hidden rounded-full bg-muted/60"
                style={{ height: `${height}px` }}
            >
                {segments.map((s, idx) => {
                    const pct = Math.round((s.value / total) * 100);
                    if (pct <= 0) return null;
                    return (
                        <div
                            key={idx}
                            className={cn('h-full transition-all duration-300', s.colorClass)}
                            style={{ width: `${pct}%` }}
                            title={`${s.label}: ${pct}%`}
                        />
                    );
                })}
            </div>

            {showLegend && (
                <div className="flex items-center justify-between text-[10.5px] font-medium text-muted-foreground">
                    {segments.map((s, idx) => (
                        <span key={idx} className="flex items-center gap-1.5">
                            <span className={cn('size-1.5 rounded-full', s.colorClass)} />
                            <span>{s.label}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Circular SVG Donut Progress Gauge
 */
interface DonutGaugeProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    className?: string;
    label?: string;
}

export function DonutGauge({
    percentage,
    size = 38,
    strokeWidth = 3.5,
    color = '#10b981',
    className,
    label,
}: DonutGaugeProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedPct = Math.min(100, Math.max(0, percentage));
    const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

    return (
        <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/40"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <span className="absolute font-mono text-[10px] font-bold text-foreground">
                {label || `${clampedPct}%`}
            </span>
        </div>
    );
}

/**
 * Live Status Beacon
 */
export function StatusBeacon({
    status,
    size = 'md',
}: {
    status: 'live' | 'warning' | 'danger' | 'neutral' | 'purple';
    size?: 'sm' | 'md' | 'lg';
}) {
    const colorMap = {
        live: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        neutral: 'bg-slate-400',
        purple: 'bg-purple-500',
    };

    const pingColorMap = {
        live: 'bg-emerald-400',
        warning: 'bg-amber-400',
        danger: 'bg-red-400',
        neutral: 'bg-slate-300',
        purple: 'bg-purple-400',
    };

    const sizeClass = size === 'sm' ? 'size-1.5' : size === 'lg' ? 'size-2.5' : 'size-2';

    return (
        <span className={cn('relative flex', sizeClass)}>
            <span
                className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                    pingColorMap[status],
                )}
            />
            <span
                className={cn('relative inline-flex rounded-full', sizeClass, colorMap[status])}
            />
        </span>
    );
}

/**
 * Unified High-Craft Admin Metric Card
 */
interface AdminMetricCardProps {
    title: string;
    value: string | number;
    statusBeacon?: 'live' | 'warning' | 'danger' | 'neutral' | 'purple';
    icon?: React.ReactNode;
    accentColor?: string;
    trendData?: number[];
    segments?: DistributionSegment[];
    donutPct?: number;
    subtext?: React.ReactNode;
    badgeText?: string;
    onClick?: () => void;
    className?: string;
}

export function AdminMetricCard({
    title,
    value,
    statusBeacon,
    icon,
    accentColor = '#10b981',
    trendData,
    segments,
    donutPct,
    subtext,
    badgeText,
    onClick,
    className,
}: AdminMetricCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200',
                onClick &&
                    'cursor-pointer hover:translate-y-[-1px] hover:border-border/80 hover:shadow-sm',
                className,
            )}
            style={{ borderTop: `2px solid ${accentColor}` }}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {statusBeacon && <StatusBeacon status={statusBeacon} />}
                    <span className="truncate text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        {title}
                    </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {badgeText && (
                        <span className="rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground">
                            {badgeText}
                        </span>
                    )}
                    {icon && <div className="size-4 shrink-0 text-muted-foreground">{icon}</div>}
                </div>
            </div>

            {/* Main Metric Value & Micro Graphic */}
            <div className="flex items-baseline justify-between gap-2">
                <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {value}
                </div>
                {donutPct !== undefined && <DonutGauge percentage={donutPct} color={accentColor} />}
                {trendData && (
                    <MicroSparkline
                        data={trendData}
                        color={accentColor}
                        width={76}
                        height={28}
                        gradientId={`spark-${title.toLowerCase().replace(/\s+/g, '-')}`}
                    />
                )}
            </div>

            {/* Optional Distribution Segment Bar */}
            {segments && <SegmentBar segments={segments} />}

            {/* Subtext */}
            {subtext && <div className="mt-0.5 text-[10.5px] text-muted-foreground">{subtext}</div>}
        </div>
    );
}
