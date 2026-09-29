import { useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Package, Search, Star, Truck, Wrench } from 'lucide-react';
import GlovoWaveModal from '../mobile/GlovoWaveModal';
import type { SlotCandidateListing } from '../../marketplace/types';

export interface SlotListingPickerModalProps {
    open: boolean;
    onClose: () => void;
    role: string;
    currentListingId?: string;
    candidates?: SlotCandidateListing[];
    onSelectCandidate: (candidate: SlotCandidateListing) => void;
    onSelectOpenSlot?: () => void;
}


export function SlotListingPickerModal({
    open,
    onClose,
    role,
    currentListingId,
    candidates,
    onSelectCandidate,
    onSelectOpenSlot,
}: SlotListingPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'top_rated' | 'favorites'>('all');
    const [selectedId, setSelectedId] = useState<string>(currentListingId || '');
    const [liveCandidates, setLiveCandidates] = useState<SlotCandidateListing[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedId(currentListingId || '');
            setSearchQuery('');
            setFilterCategory('all');
        }
    }, [open, role, currentListingId]);

    const roleUpper = role.trim().toUpperCase();
    const canonicalRole = useMemo(() => {
        if (roleUpper === 'DELIVERY' || roleUpper === 'RIDER' || roleUpper === 'COURIER') {
            return 'COURIER';
        }
        if (
            roleUpper === 'INSTALLATION' ||
            roleUpper === 'LABOR' ||
            roleUpper === 'TECHNICIAN' ||
            roleUpper === 'DIAGNOSTIC' ||
            roleUpper === 'TOOLS'
        ) {
            return 'LABOR';
        }
        if (roleUpper === 'PART' || roleUpper === 'PARTS' || roleUpper === 'STORE') {
            return 'STORE';
        }
        if (roleUpper === 'HAULING' || roleUpper === 'RECYCLE') {
            return 'RECYCLE';
        }
        if (roleUpper === 'AUDIT' || roleUpper === 'AUDITOR') {
            return 'AUDIT';
        }
        return roleUpper;
    }, [roleUpper]);
    useEffect(() => {
        if (!open || candidates !== undefined || typeof fetch === 'undefined') {
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        setIsLoading(true);

        fetch(`/api/deal-chains/slot-candidates?role=${encodeURIComponent(canonicalRole)}`, {
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) throw new Error('Unable to load slot candidates');
                return response.json();
            })
            .then((payload: { data?: SlotCandidateListing[] }) => {
                if (Array.isArray(payload.data)) {
                    setLiveCandidates(payload.data);
                } else {
                    setLiveCandidates([]);
                }
            })
            .catch((err: unknown) => {
                if (err instanceof Error && err.name === 'AbortError') return;
                setLiveCandidates([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });

        return () => controller.abort();
    }, [open, candidates, canonicalRole]);

    const visibleCandidates = candidates ?? liveCandidates;


    const matchingList = useMemo(() => {
        return visibleCandidates.filter((item) => {
            if (item.role !== canonicalRole) return false;

            if (filterCategory === 'top_rated' && (item.rating || 0) < 4.85) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    item.title.toLowerCase().includes(q) ||
                    item.provider_name.toLowerCase().includes(q)
                );
            }

            return true;
        });
    }, [visibleCandidates, canonicalRole, filterCategory, searchQuery]);

    const activeCandidate = useMemo(() => {
        return matchingList.find((c) => c.id === selectedId) || matchingList[0];
    }, [matchingList, selectedId]);
    const handleConfirm = () => {
        if (activeCandidate) {
            const rawMinor = activeCandidate.price_minor ?? activeCandidate.priceMinor ?? 0;
            const normalizedCandidate: SlotCandidateListing = {
                ...activeCandidate,
                price_minor: Number.isFinite(rawMinor) ? Number(rawMinor) : 0,
                priceMinor: Number.isFinite(rawMinor) ? Number(rawMinor) : 0,
            };
            onSelectCandidate(normalizedCandidate);
        }
        onClose();
    };
    return (
        <GlovoWaveModal
            open={open}
            onClose={onClose}
            title={`Select Partner for ${role}`}
            subtitle="Verified Tagudin local providers for this Deal Chain slot"
            bottomSlot={
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading || !activeCandidate}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FFC72C] px-4 py-3 text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-[#F2BA18] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <span>{isLoading ? 'Checking Available Partners...' : 'Confirm Partner Selection'}</span>
                    <span>→</span>
                </button>
            }
        >
            <div className="flex flex-col gap-3 py-1 font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${role.toLowerCase()} providers or listings...`}
                        className="h-10 w-full rounded-full border border-slate-200 bg-[#F4F4F5] pr-4 pl-9 text-xs font-semibold text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-[#0F2F58] focus:bg-white"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setFilterCategory('all')}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-all ${
                            filterCategory === 'all'
                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        All in Tagudin
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('top_rated')}
                        className={`flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-all ${
                            filterCategory === 'top_rated'
                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Star className="size-3 fill-amber-400 stroke-amber-500" />
                        <span>Top Rated (4.8+)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterCategory('favorites')}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-all ${
                            filterCategory === 'favorites'
                                ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        Community Vouched
                    </button>
                </div>
                {onSelectOpenSlot && (
                    <button
                        type="button"
                        onClick={() => {
                            onSelectOpenSlot();
                            onClose();
                        }}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed border-[#0F2F58]/40 bg-[#F0F5FA]/60 px-3.5 py-2.5 text-left transition-all hover:border-[#0F2F58]"
                    >
                        <div>
                            <div className="text-[11px] font-extrabold text-[#0F2F58]">
                                Leave as Open {canonicalRole} Role Slot
                            </div>
                            <div className="text-[10px] text-slate-600">
                                Buyer can choose any verified Tagudin {canonicalRole.toLowerCase()} partner at checkout
                            </div>
                        </div>
                        <span className="rounded-full bg-[#0F2F58] px-2.5 py-0.5 text-[9.5px] font-extrabold text-white">
                            Open Slot
                        </span>
                    </button>
                )}

                {/* Candidates List */}
                <div className="flex max-h-[46vh] flex-col gap-2.5 space-y-0.5 overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex flex-col gap-2.5 space-y-0.5">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className="flex animate-pulse items-start justify-between rounded-2xl border border-slate-100 bg-white p-3.5"
                                >
                                    <div className="flex flex-1 items-start gap-3">
                                        <div className="size-12 rounded-xl bg-slate-200" />
                                        <div className="flex-1 space-y-2 py-0.5">
                                            <div className="h-3 w-24 rounded bg-slate-200" />
                                            <div className="h-4 w-40 rounded bg-slate-200" />
                                            <div className="h-2.5 w-32 rounded bg-slate-200" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-12 rounded bg-slate-200" />
                                </div>
                            ))}
                        </div>
                    ) : matchingList.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FAFCFB] p-6 text-center">
                            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <Package className="size-5" />
                            </div>
                            <h4 className="text-xs font-bold text-slate-800">
                                No Verified {canonicalRole} Listings in Tagudin
                            </h4>
                            <p className="mx-auto mt-1 max-w-xs text-[11px] text-slate-500">
                                No active listings match your current filters. You can leave this step as Community Open Pool so qualified local providers can claim it when an order is placed.
                            </p>
                            {onSelectOpenSlot && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectOpenSlot();
                                        onClose();
                                    }}
                                    className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0F2F58] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1A3D6E]"
                                >
                                    <span>Set as Community Open Pool</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        matchingList.map((candidate) => {
                            const isSelected =
                                selectedId === candidate.id ||
                                (!selectedId && activeCandidate?.id === candidate.id);
                            return (
                                <div
                                    key={candidate.id}
                                    onClick={() => setSelectedId(candidate.id)}
                                    className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.99] ${
                                        isSelected
                                            ? 'border-[#0F2F58] bg-[#EBF2FA] shadow-xs'
                                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        {candidate.photo_url ? (
                                            <img
                                                src={candidate.photo_url}
                                                alt={candidate.title}
                                                className="size-12 shrink-0 rounded-xl border border-slate-200 object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
                                                {candidate.role === 'STORE' ? (
                                                    <Package className="size-4 text-amber-700" />
                                                ) : candidate.role === 'COURIER' ? (
                                                    <Truck className="size-4 text-sky-700" />
                                                ) : (
                                                    <Wrench className="size-4 text-emerald-700" />
                                                )}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                    {candidate.role}
                                                </span>
                                                <span className="text-slate-300">•</span>
                                                <div className="flex items-center text-[10px] font-bold text-amber-700">
                                                    <Star className="mr-0.5 size-2.5 fill-amber-400 stroke-amber-500" />
                                                    <span>
                                                        {candidate.rating?.toFixed(1) || '4.9'}
                                                    </span>
                                                </div>
                                            </div>

                                            <h4 className="mt-0.5 truncate text-xs font-extrabold text-slate-900">
                                                {candidate.title}
                                            </h4>

                                            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                                                <MapPin className="size-3 shrink-0 text-slate-400" />
                                                <span className="truncate">
                                                    {candidate.provider_name} · {candidate.area}
                                                </span>
                                            </div>

                                            <div className="mt-1 text-[10.5px] font-semibold text-emerald-800">
                                                {candidate.sla_text}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end justify-between self-stretch pl-2">
                                        <div
                                            className={`flex size-5 items-center justify-center rounded-full border-2 transition-colors ${
                                                isSelected
                                                    ? 'border-[#0F2F58] bg-[#0F2F58] text-white'
                                                    : 'border-slate-300 bg-white'
                                            }`}
                                        >
                                            {isSelected && <Check className="size-3 stroke-[3]" />}
                                        </div>

                                        <span className="font-mono text-xs font-extrabold text-[#0F2F58]">
                                            ₱{((candidate.price_minor ?? candidate.priceMinor ?? 0) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </GlovoWaveModal>
    );
}

export default SlotListingPickerModal;
