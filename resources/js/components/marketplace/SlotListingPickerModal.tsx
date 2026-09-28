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

const DEFAULT_TAGUDIN_CANDIDATES: SlotCandidateListing[] = [
    // STORE CANDIDATES
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890ba',
        title: 'AC Run Capacitor (35uF 450V)',
        provider_name: 'Tagudin Hardware Depot',
        area: 'Centro, Tagudin',
        price_minor: 18000,
        sla_text: 'Counter Ready in 15 mins',
        rating: 4.9,
        role: 'STORE',
        photo_url: '/photos/ac-capacitor.jpg',
    },
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890b5',
        title: 'Weekend bibingka tray (Box of 6)',
        provider_name: 'Tagudin Morning Bakery',
        area: 'Poblacion, Tagudin',
        price_minor: 18000,
        sla_text: 'Fresh from clay oven',
        rating: 4.9,
        role: 'STORE',
        photo_url: '/photos/bibingka.jpg',
    },
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890b7',
        title: 'Small greens bag & native root crops',
        provider_name: 'Tagudin Market Stall',
        area: 'Bitalag, Tagudin',
        price_minor: 9000,
        sla_text: 'Market morning ready',
        rating: 4.8,
        role: 'STORE',
        photo_url: '/photos/bibingka.jpg',
    },

    // COURIER CANDIDATES
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890b9',
        title: 'Tagudin Express Motorcycle Delivery',
        provider_name: 'Danny Express Motorcycle Pool',
        area: 'Tagudin Townwide',
        price_minor: 8000,
        sla_text: 'On-demand ~20 mins transit',
        rating: 4.9,
        role: 'COURIER',
        photo_url: '/photos/courier.jpg',
    },
    {
        id: 'can_cour_bicycle',
        title: 'Barangay Centro Bicycle Runner',
        provider_name: 'Centro Eco Courier',
        area: 'Poblacion Centro',
        price_minor: 2500,
        sla_text: 'Eco transit ~15 mins',
        rating: 4.8,
        role: 'COURIER',
        photo_url: '/photos/courier.jpg',
    },

    // LABOR CANDIDATES
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890bb',
        title: 'Split AC Capacitor Installation',
        provider_name: 'Kuya Ben Aircon Services',
        area: 'Tagudin Centro',
        price_minor: 25000,
        sla_text: 'Certified technician installation',
        rating: 4.9,
        role: 'LABOR',
        photo_url: '/photos/ac-clean.jpg',
    },
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890b8',
        title: 'Inverter Split AC Deep Clean & Checkup',
        provider_name: 'Kuya Ben Aircon Services',
        area: 'Tagudin Centro',
        price_minor: 45000,
        sla_text: 'Same-day scheduled labor',
        rating: 4.9,
        role: 'LABOR',
        photo_url: '/photos/ac-clean.jpg',
    },
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890b2',
        title: 'Simple hem and button fix',
        provider_name: 'Ate Elena Garment Repairs',
        area: 'Tagudin Centro',
        price_minor: 12000,
        sla_text: 'Walk-in same-day repair',
        rating: 4.8,
        role: 'LABOR',
        photo_url: '/photos/ac-clean.jpg',
    },

    // AUDIT & QUALITY
    {
        id: '0198a3b1-7c40-7abc-8def-5234567890bc',
        title: 'Home Appliance Safety Audit',
        provider_name: 'Safety Check (Master Electrician)',
        area: 'Tagudin Centro',
        price_minor: 15000,
        sla_text: 'Post-service municipal certificate',
        rating: 5.0,
        role: 'AUDIT',
        photo_url: '/photos/req-electrician.jpg',
    },

    // RECYCLE & SCRAP
    {
        id: 'can_recycle_1',
        title: 'Eco-Scrap & Old Part Removal Service',
        provider_name: 'Tagudin Green Reclamation',
        area: 'Tagudin General',
        price_minor: 5000,
        sla_text: 'Same-day material recycling',
        rating: 4.8,
        role: 'RECYCLE',
        photo_url: '/photos/courier.jpg',
    },
];

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
    const [liveCandidates, setLiveCandidates] = useState<SlotCandidateListing[]>(DEFAULT_TAGUDIN_CANDIDATES);
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
        if (!open || candidates !== undefined || import.meta.env.MODE === 'test' || typeof fetch === 'undefined') {
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
                }
            })
            .catch((err: unknown) => {
                if (err instanceof Error && err.name === 'AbortError') return;
                // Only fall back to default tagudin fixtures if API request fails / offline
                setLiveCandidates(DEFAULT_TAGUDIN_CANDIDATES);
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

                {isLoading && (
                    <div className="px-2 py-1 text-[10px] font-medium text-slate-400" role="status">
                        Finding active local partners…
                    </div>
                )}
                {/* Candidates List */}
                <div className="flex max-h-[46vh] flex-col gap-2.5 space-y-0.5 overflow-y-auto pr-1">
                    {matchingList.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                            No Tagudin providers found matching your search.
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
