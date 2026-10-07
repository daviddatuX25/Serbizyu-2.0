import {
    Camera,
    Check,
    Gauge,
    Lock,
    MapPin,
    ShieldAlert,
    ShieldCheck,
    Store,
    Truck,
    Wrench,
} from 'lucide-react';

export type WorkNodeStatus =
    'preview' | 'locked' | 'in_progress' | 'awaiting_approval' | 'completed';

export type WorkNodeClearance = 'worker_direct' | 'customer_approval' | 'physical_handoff';

export type WorkProofType = 'photo_proof' | 'metric_reading' | 'gps_checkin' | 'customer_otp';

export type WorkNodeRole = 'labor' | 'store' | 'courier' | 'audit';

export type WorkNodeMediaVariant = 'full-bleed' | 'card-banner' | 'split-media' | 'compact-clean';

export interface CanonicalWorkNodeProps {
    id: string;
    title: string;
    ordinal?: number | string;
    dur?: string;
    desc?: string;
    photoUrl?: string | null;
    mediaVariant?: WorkNodeMediaVariant;
    clearanceMode?: WorkNodeClearance;
    requiredProofs?: WorkProofType[];
    gateType?: 'execution' | 'arrival' | 'signoff' | 'decision';
    status?: WorkNodeStatus;
    isSelected?: boolean;
    onClick?: () => void;
    size?: 'compact' | 'standard' | 'expanded';
    role?: WorkNodeRole;
    feeMinor?: number;
    showInPort?: boolean;
    showOutPort?: boolean;
    className?: string;
}

function getRoleMeta(role: WorkNodeRole = 'labor') {
    switch (role) {
        case 'store':
            return {
                icon: Store,
                stripe: '#F59E0B',
                badgeBg: 'bg-amber-50',
                badgeText: 'text-amber-800',
                border: 'border-amber-200',
                label: 'STORE',
            };
        case 'courier':
            return {
                icon: Truck,
                stripe: '#0284C7',
                badgeBg: 'bg-sky-50',
                badgeText: 'text-sky-800',
                border: 'border-sky-200',
                label: 'COURIER',
            };
        case 'audit':
            return {
                icon: ShieldCheck,
                stripe: '#7C3AED',
                badgeBg: 'bg-purple-50',
                badgeText: 'text-purple-800',
                border: 'border-purple-200',
                label: 'AUDIT',
            };
        case 'labor':
        default:
            return {
                icon: Wrench,
                stripe: '#0D715F',
                badgeBg: 'bg-emerald-50',
                badgeText: 'text-emerald-800',
                border: 'border-emerald-200',
                label: 'LABOR',
            };
    }
}

export default function CanonicalWorkNode({
    id,
    title,
    ordinal,
    dur,
    desc,
    photoUrl,
    mediaVariant,
    clearanceMode = 'worker_direct',
    requiredProofs = [],
    gateType = 'execution',
    status = 'preview',
    isSelected = false,
    onClick,
    size = 'standard',
    role = 'labor',
    feeMinor,
    showInPort = false,
    showOutPort = false,
    className = '',
}: CanonicalWorkNodeProps) {
    const roleMeta = getRoleMeta(role);
    const RoleIcon = roleMeta.icon;

    // Status flags
    const isCompleted = status === 'completed';
    const isActive = status === 'in_progress';
    const isAwaiting = status === 'awaiting_approval';
    const isLocked = status === 'locked';

    // Effective media layout
    const effectiveVariant: WorkNodeMediaVariant =
        mediaVariant || (photoUrl ? 'card-banner' : 'compact-clean');

    const formattedFee = typeof feeMinor === 'number' ? `₱${(feeMinor / 100).toFixed(0)}` : null;

    /* ─────────────────────────────────────────────────────────────
       VARIANT 1: FULL-BLEED IMAGE BACKGROUND (Glovo Hero Category Style)
       ───────────────────────────────────────────────────────────── */
    if (effectiveVariant === 'full-bleed' && photoUrl) {
        return (
            <div
                data-testid={`canonical-work-node-${id}`}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClick();
                    }
                }}
                className={`group relative flex shrink-0 flex-col justify-between overflow-hidden rounded-2xl border text-left transition-all duration-200 select-none ${
                    size === 'compact'
                        ? 'h-[140px] w-[160px]'
                        : size === 'expanded'
                          ? 'h-[190px] w-full max-w-[320px]'
                          : 'h-[165px] w-[190px]'
                } ${
                    onClick
                        ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl'
                        : 'cursor-default'
                } ${
                    isSelected
                        ? 'border-white shadow-xl ring-3 ring-[#0F2F58]'
                        : isCompleted
                          ? 'border-emerald-400 shadow-md ring-2 ring-emerald-400/50'
                          : isActive
                            ? 'border-sky-400 shadow-lg ring-2 ring-sky-400/60'
                            : isAwaiting
                              ? 'border-amber-400 shadow-md ring-2 ring-amber-400/50'
                              : isLocked
                                ? 'border-slate-500 opacity-65'
                                : 'border-slate-800/20 shadow-md'
                } ${className}`}
            >
                {/* Full-bleed background photo */}
                <img
                    src={photoUrl}
                    alt={title}
                    className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />

                {/* Dark gradient scrim for maximum text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/25" />

                {/* Top Role Stripe Accent */}
                <div
                    className="absolute top-0 right-0 left-0 h-1"
                    style={{ background: isCompleted ? '#10B981' : roleMeta.stripe }}
                />

                {/* Ports */}
                {showInPort && (
                    <div
                        className="absolute top-1/2 -left-[5px] z-10 size-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-slate-800"
                        aria-hidden="true"
                    />
                )}
                {showOutPort && (
                    <div
                        className="absolute top-1/2 -right-[5px] z-10 size-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500"
                        aria-hidden="true"
                    />
                )}

                {/* Top Overlay Row: Badges & Timing */}
                <div className="relative z-10 flex items-center justify-between gap-1 p-2.5">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`flex size-5 items-center justify-center rounded-md text-[10px] font-extrabold ${
                                isCompleted
                                    ? 'bg-emerald-500 text-white'
                                    : isActive
                                      ? 'bg-sky-500 text-white'
                                      : 'bg-white/90 text-slate-950 shadow-xs'
                            }`}
                        >
                            {isCompleted ? (
                                <Check className="size-3 stroke-[3]" />
                            ) : isLocked ? (
                                <Lock className="size-2.5" />
                            ) : (
                                (ordinal ?? <RoleIcon className="size-3" />)
                            )}
                        </span>
                        <span className="rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-white uppercase backdrop-blur-md">
                            {role !== 'labor'
                                ? roleMeta.label
                                : gateType === 'decision'
                                  ? 'GATE'
                                  : 'STEP'}
                        </span>
                    </div>

                    <div className="rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                        {formattedFee || dur}
                    </div>
                </div>

                {/* Bottom Overlay Area: Title, Scope, and Evidence Badges */}
                <div className="relative z-10 space-y-1 p-2.5 pt-0">
                    <h4
                        className="line-clamp-2 text-xs leading-snug font-extrabold text-white drop-shadow-sm"
                        title={title}
                    >
                        {title}
                    </h4>

                    {desc && <p className="line-clamp-1 text-[10.5px] text-slate-300">{desc}</p>}

                    {/* Bottom Proof Icons & Status */}
                    <div className="flex items-center justify-between border-t border-white/15 pt-1.5 text-white/80">
                        <div className="flex items-center gap-1">
                            {requiredProofs.includes('photo_proof') && (
                                <span
                                    title="Photo proof"
                                    className="rounded bg-black/40 p-1 backdrop-blur-xs"
                                >
                                    <Camera className="size-2.5 text-white" />
                                </span>
                            )}
                            {requiredProofs.includes('gps_checkin') && (
                                <span
                                    title="GPS location"
                                    className="rounded bg-black/40 p-1 backdrop-blur-xs"
                                >
                                    <MapPin className="size-2.5 text-emerald-300" />
                                </span>
                            )}
                            {requiredProofs.includes('metric_reading') && (
                                <span
                                    title="Measurement"
                                    className="rounded bg-black/40 p-1 backdrop-blur-xs"
                                >
                                    <Gauge className="size-2.5 text-amber-300" />
                                </span>
                            )}
                            {requiredProofs.includes('customer_otp') && (
                                <span
                                    title="Customer signoff"
                                    className="rounded bg-black/40 p-1 backdrop-blur-xs"
                                >
                                    <ShieldAlert className="size-2.5 text-purple-300" />
                                </span>
                            )}
                        </div>

                        <div>
                            {isCompleted ? (
                                <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs">
                                    Done ✓
                                </span>
                            ) : isActive ? (
                                <span className="flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs">
                                    <span className="size-1.5 animate-pulse rounded-full bg-white" />
                                    Live
                                </span>
                            ) : isAwaiting ? (
                                <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-extrabold text-white backdrop-blur-xs">
                                    Review
                                </span>
                            ) : isLocked ? (
                                <span className="text-[9px] font-semibold text-slate-400">
                                    Locked
                                </span>
                            ) : isSelected ? (
                                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-extrabold text-slate-900">
                                    Active
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────────
       VARIANT 2: CARD-BANNER (Glovo Item / Serbizyu Listing Standard)
       ───────────────────────────────────────────────────────────── */
    if (effectiveVariant === 'card-banner' && photoUrl) {
        return (
            <div
                data-testid={`canonical-work-node-${id}`}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClick();
                    }
                }}
                className={`group relative flex shrink-0 flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200 select-none ${
                    size === 'compact'
                        ? 'w-[170px]'
                        : size === 'expanded'
                          ? 'w-full max-w-[280px]'
                          : 'w-[190px]'
                } ${
                    onClick
                        ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg'
                        : 'cursor-default'
                } ${
                    isSelected
                        ? 'border-[#0F2F58] shadow-md ring-2 ring-[#0F2F58]/25'
                        : isCompleted
                          ? 'border-emerald-300 shadow-2xs'
                          : isActive
                            ? 'border-sky-400 shadow-sm ring-2 ring-sky-200'
                            : isAwaiting
                              ? 'border-amber-400 shadow-sm ring-2 ring-amber-200'
                              : isLocked
                                ? 'border-slate-200 bg-slate-50/70 opacity-60'
                                : 'border-slate-200 shadow-2xs hover:border-slate-300'
                } ${className}`}
            >
                {/* Top Photo Banner */}
                <div className="relative h-24 w-full overflow-hidden bg-slate-100 sm:h-26">
                    <img
                        src={photoUrl}
                        alt={title}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />

                    {/* Gradient Overlay at top of image */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />

                    {/* Floating Top Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span
                            className={`flex size-4.5 items-center justify-center rounded text-[10px] font-extrabold ${
                                isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#0F2F58] text-white'
                            }`}
                        >
                            {isCompleted ? (
                                <Check className="size-3 stroke-[3]" />
                            ) : (
                                (ordinal ?? <RoleIcon className="size-2.5" />)
                            )}
                        </span>
                        <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[8.5px] font-extrabold text-white uppercase backdrop-blur-xs">
                            {role !== 'labor'
                                ? roleMeta.label
                                : gateType === 'decision'
                                  ? 'GATE'
                                  : 'STEP'}
                        </span>
                    </div>

                    {/* Floating Timing or Price */}
                    <div className="absolute top-2 right-2 rounded-lg bg-white/95 px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#0F2F58] shadow-xs backdrop-blur-xs">
                        {formattedFee || dur}
                    </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between space-y-1.5 p-2.5">
                    <div>
                        <h4
                            className="line-clamp-2 text-xs leading-snug font-extrabold text-slate-900"
                            title={title}
                        >
                            {title}
                        </h4>
                        {desc && (
                            <p className="mt-0.5 line-clamp-1 text-[10.5px] text-slate-500">
                                {desc}
                            </p>
                        )}
                    </div>

                    {/* Footer Row: Proof Chips & Status */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                        <div className="flex items-center gap-1 text-slate-400">
                            {requiredProofs.includes('photo_proof') && (
                                <span title="Photo proof required" className="hover:text-slate-700">
                                    <Camera className="size-3" />
                                </span>
                            )}
                            {requiredProofs.includes('gps_checkin') && (
                                <span
                                    title="GPS location required"
                                    className="hover:text-emerald-700"
                                >
                                    <MapPin className="size-3 text-emerald-600" />
                                </span>
                            )}
                            {requiredProofs.includes('metric_reading') && (
                                <span
                                    title="Metric reading required"
                                    className="hover:text-amber-700"
                                >
                                    <Gauge className="size-3 text-amber-600" />
                                </span>
                            )}
                            {requiredProofs.includes('customer_otp') && (
                                <span
                                    title="Customer signoff required"
                                    className="hover:text-purple-700"
                                >
                                    <ShieldAlert className="size-3 text-purple-600" />
                                </span>
                            )}
                            {requiredProofs.length === 0 && (
                                <span className="text-[9px] font-semibold text-slate-400">
                                    Direct Clear
                                </span>
                            )}
                        </div>

                        <div>
                            {isCompleted ? (
                                <span className="text-[9px] font-extrabold text-emerald-700">
                                    Done ✓
                                </span>
                            ) : isActive ? (
                                <span className="flex items-center gap-1 text-[9px] font-extrabold text-sky-800">
                                    <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
                                    Live
                                </span>
                            ) : isAwaiting ? (
                                <span className="text-[9px] font-extrabold text-amber-800">
                                    Review
                                </span>
                            ) : isLocked ? (
                                <span className="text-[9px] font-semibold text-slate-400">
                                    Locked
                                </span>
                            ) : isSelected ? (
                                <span className="text-[9px] font-extrabold text-[#0F2F58]">
                                    Active
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────────
       VARIANT 3: SPLIT-MEDIA (MarketplaceCard Horizontal Style)
       ───────────────────────────────────────────────────────────── */
    if (effectiveVariant === 'split-media' && photoUrl) {
        return (
            <div
                data-testid={`canonical-work-node-${id}`}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClick();
                    }
                }}
                className={`group relative flex shrink-0 items-center justify-between gap-3 rounded-2xl border bg-white p-3 text-left transition-all duration-200 select-none ${
                    size === 'compact' ? 'w-[240px]' : 'w-full max-w-[320px]'
                } ${
                    onClick
                        ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
                        : 'cursor-default'
                } ${
                    isSelected
                        ? 'border-[#0F2F58] shadow-md ring-2 ring-[#0F2F58]/20'
                        : isCompleted
                          ? 'border-emerald-300'
                          : isActive
                            ? 'border-sky-400 ring-2 ring-sky-200'
                            : 'border-slate-200 shadow-2xs hover:border-slate-300'
                } ${className}`}
            >
                {/* Left Text Column */}
                <div className="flex min-w-0 flex-1 flex-col justify-between space-y-1">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`flex size-4.5 items-center justify-center rounded text-[10px] font-extrabold ${
                                isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#0F2F58] text-white'
                            }`}
                        >
                            {ordinal ?? <RoleIcon className="size-2.5" />}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                            {formattedFee || dur}
                        </span>
                    </div>

                    <h4 className="line-clamp-2 text-xs leading-tight font-extrabold text-slate-900">
                        {title}
                    </h4>

                    {desc && <p className="line-clamp-1 text-[10.5px] text-slate-500">{desc}</p>}

                    <div className="flex items-center gap-1 pt-1 text-slate-400">
                        {requiredProofs.includes('photo_proof') && <Camera className="size-3" />}
                        {requiredProofs.includes('gps_checkin') && (
                            <MapPin className="size-3 text-emerald-600" />
                        )}
                        {requiredProofs.includes('metric_reading') && (
                            <Gauge className="size-3 text-amber-600" />
                        )}
                        {requiredProofs.includes('customer_otp') && (
                            <ShieldAlert className="size-3 text-purple-600" />
                        )}
                    </div>
                </div>

                {/* Right Square Thumbnail */}
                <div className="relative size-18 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <img
                        src={photoUrl}
                        alt={title}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                </div>
            </div>
        );
    }

    /* ─────────────────────────────────────────────────────────────
       VARIANT 4: COMPACT-CLEAN (Default Clean Card with Wire Ports)
       ───────────────────────────────────────────────────────────── */
    const widthClasses =
        size === 'compact'
            ? 'w-[136px]'
            : size === 'expanded'
              ? 'w-full max-w-[280px]'
              : 'w-[156px]';

    return (
        <div
            data-testid={`canonical-work-node-${id}`}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={`group relative flex shrink-0 flex-col justify-between rounded-xl border bg-white text-left transition-all duration-150 select-none ${widthClasses} ${
                onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'
            } ${
                isSelected
                    ? 'border-[#0F2F58] shadow-md ring-2 ring-[#0F2F58]/20'
                    : isCompleted
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-2xs'
                      : isActive
                        ? 'border-sky-400 bg-sky-50/25 shadow-sm ring-2 ring-sky-200'
                        : isAwaiting
                          ? 'border-amber-400 bg-amber-50/30 shadow-sm ring-2 ring-amber-200'
                          : isLocked
                            ? 'border-slate-200 bg-slate-50/70 opacity-60'
                            : 'border-slate-200 shadow-2xs hover:border-slate-300'
            } ${className}`}
            style={{
                borderTopWidth: '3.5px',
                borderTopColor: isCompleted
                    ? '#10B981'
                    : isAwaiting
                      ? '#F59E0B'
                      : isActive
                        ? '#0284C7'
                        : isSelected
                          ? '#0F2F58'
                          : roleMeta.stripe,
                padding: size === 'compact' ? '6px 8px' : '8px 10px',
                minHeight: size === 'compact' ? '74px' : '86px',
            }}
        >
            {/* Input Port (Left) */}
            {showInPort && (
                <div
                    className="absolute top-1/2 -left-[5px] size-2.5 -translate-y-1/2 rounded-full border-2 border-slate-300 bg-white"
                    aria-hidden="true"
                />
            )}

            {/* Output Port (Right) */}
            {showOutPort && (
                <div
                    className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-white"
                    aria-hidden="true"
                />
            )}

            {/* Top Row: Ordinal / Role Badge + Duration / Status Indicator */}
            <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 items-center gap-1">
                    <span
                        className={`flex size-4.5 shrink-0 items-center justify-center rounded text-[10px] font-extrabold ${
                            isCompleted
                                ? 'bg-emerald-600 text-white'
                                : isActive
                                  ? 'bg-[#0F2F58] text-white'
                                  : isAwaiting
                                    ? 'bg-amber-500 text-white'
                                    : `${roleMeta.badgeBg} ${roleMeta.badgeText}`
                        }`}
                    >
                        {isCompleted ? (
                            <Check className="size-3 stroke-[3]" />
                        ) : isLocked ? (
                            <Lock className="size-2.5" />
                        ) : (
                            (ordinal ?? <RoleIcon className="size-2.5" />)
                        )}
                    </span>

                    {/* Role or Gate Type Badge */}
                    <span className="truncate text-[9px] font-extrabold tracking-tight text-slate-500 uppercase">
                        {gateType === 'decision'
                            ? 'GATE'
                            : gateType === 'signoff'
                              ? 'SIGNOFF'
                              : role !== 'labor'
                                ? roleMeta.label
                                : clearanceMode === 'customer_approval'
                                  ? 'APPROVAL'
                                  : clearanceMode === 'physical_handoff'
                                    ? 'HANDOFF'
                                    : 'STEP'}
                    </span>
                </div>

                {/* Duration or Price */}
                <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold text-slate-500">
                    {formattedFee ? (
                        <span className="font-extrabold text-slate-800">{formattedFee}</span>
                    ) : dur ? (
                        <span>{dur}</span>
                    ) : null}
                </div>
            </div>

            {/* Middle: Step Title (12px bold, legible, no micro-truncation) */}
            <div className="my-1 min-w-0">
                <h4
                    className={`line-clamp-2 text-xs leading-tight font-bold ${
                        isLocked ? 'text-slate-500' : 'text-slate-900'
                    }`}
                    title={title}
                >
                    {title}
                </h4>
                {desc && size === 'expanded' && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{desc}</p>
                )}
            </div>

            {/* Bottom Row: Compact Evidence Chips & Status Beacon */}
            <div className="flex items-center justify-between gap-1 border-t border-slate-100/90 pt-1">
                {/* Proof Icons Bar */}
                <div className="flex items-center gap-1 text-slate-400">
                    {requiredProofs.includes('photo_proof') && (
                        <span title="Photo proof required" className="hover:text-slate-700">
                            <Camera className="size-3" />
                        </span>
                    )}
                    {requiredProofs.includes('gps_checkin') && (
                        <span
                            title="GPS location check-in required"
                            className="hover:text-emerald-700"
                        >
                            <MapPin className="size-3" />
                        </span>
                    )}
                    {requiredProofs.includes('metric_reading') && (
                        <span title="Measurement reading required" className="hover:text-amber-700">
                            <Gauge className="size-3" />
                        </span>
                    )}
                    {requiredProofs.includes('customer_otp') && (
                        <span
                            title="Customer OTP confirmation required"
                            className="hover:text-purple-700"
                        >
                            <ShieldAlert className="size-3" />
                        </span>
                    )}
                    {requiredProofs.length === 0 && (
                        <span className="text-[9px] font-semibold text-slate-400">
                            Direct Clear
                        </span>
                    )}
                </div>

                {/* Status Indicator */}
                <div>
                    {isCompleted ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700">
                            Done
                        </span>
                    ) : isActive ? (
                        <span className="flex items-center gap-1 text-[9px] font-extrabold text-sky-800">
                            <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
                            Live
                        </span>
                    ) : isAwaiting ? (
                        <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-amber-800">
                            Review
                        </span>
                    ) : isLocked ? (
                        <span className="text-[9px] font-semibold text-slate-400">Locked</span>
                    ) : isSelected ? (
                        <span className="text-[9px] font-extrabold text-[#0F2F58]">Active</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
