import React, { useRef } from 'react';
import {
    Briefcase,
    Camera,
    Check,
    FileText,
    Package,
    Palette,
    Sparkles,
    Store,
    Truck,
    Video,
    Wrench,
    X,
} from 'lucide-react';
import type { ListingMedia, ListingMediaItem } from '../../types';

export interface ListingMediaPickerProps {
    media: ListingMedia;
    categoryCode: string;
    listingType: 'service' | 'product';
    onChange: (next: ListingMedia) => void;
}

const CATEGORY_PRESET_SETS: Array<{
    id: string;
    label: string;
    categories: string[];
    url: string;
}> = [
    {
        id: 'coil-wash',
        label: 'Coil Wash',
        categories: ['repairs'],
        url: '/photos/ac-clean.jpg',
    },
    {
        id: 'capacitor',
        label: 'Capacitor',
        categories: ['repairs', 'hardware'],
        url: '/photos/ac-capacitor.jpg',
    },
    {
        id: 'diagnostic',
        label: 'Diagnostic',
        categories: ['repairs', 'home-cleaning'],
        url: '/photos/req-electrician.jpg',
    },
    {
        id: 'courier',
        label: 'Courier',
        categories: ['courier', 'local-services'],
        url: '/photos/courier.jpg',
    },
    {
        id: 'bibingka',
        label: 'Bibingka',
        categories: ['local-food', 'food', 'bakery'],
        url: '/photos/bibingka.jpg',
    },
    {
        id: 'print-craft',
        label: 'Print & Craft',
        categories: ['print-assist', 'greeting-cards', 'crafts'],
        url: '/photos/greeting.jpg',
    },
    {
        id: 'hardware',
        label: 'Civil & Supply',
        categories: ['hardware', 'local-services'],
        url: '/photos/req-cement.jpg',
    },
];

export function isCategorySvgUrl(url?: string | null): boolean {
    return !url || url.startsWith('svg:');
}

export function getCategoryMeta(categoryCode?: string | null): {
    label: string;
    bg: string;
    border: string;
    iconColor: string;
    Icon: React.ComponentType<{ className?: string }>;
} {
    const code = (categoryCode || 'repairs').toLowerCase();
    switch (code) {
        case 'courier':
            return {
                label: 'Courier & Padala',
                bg: 'bg-sky-50',
                border: 'border-sky-200',
                iconColor: 'text-sky-700',
                Icon: Truck,
            };
        case 'home-cleaning':
            return {
                label: 'Cleaning & Home',
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                iconColor: 'text-emerald-700',
                Icon: Sparkles,
            };
        case 'local-food':
        case 'food':
        case 'bakery':
            return {
                label: 'Local Food & Bakery',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                iconColor: 'text-amber-700',
                Icon: Store,
            };
        case 'print-assist':
            return {
                label: 'Print & Docs',
                bg: 'bg-indigo-50',
                border: 'border-indigo-200',
                iconColor: 'text-indigo-700',
                Icon: FileText,
            };
        case 'greeting-cards':
        case 'crafts':
            return {
                label: 'Cards & Crafts',
                bg: 'bg-rose-50',
                border: 'border-rose-200',
                iconColor: 'text-rose-700',
                Icon: Palette,
            };
        case 'local-services':
            return {
                label: 'Local Services',
                bg: 'bg-teal-50',
                border: 'border-teal-200',
                iconColor: 'text-teal-700',
                Icon: Briefcase,
            };
        case 'product':
            return {
                label: 'Market Goods',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                iconColor: 'text-amber-700',
                Icon: Package,
            };
        case 'repairs':
        default:
            return {
                label: 'Repairs & Trade',
                bg: 'bg-[#EBF2FA]',
                border: 'border-[#0F2F58]/20',
                iconColor: 'text-[#0F2F58]',
                Icon: Wrench,
            };
    }
}

export function CategoryVisualFallback({
    categoryCode,
    title,
    className = 'h-full w-full',
}: {
    categoryCode?: string | null;
    title?: string | null;
    className?: string;
}) {
    const meta = getCategoryMeta(categoryCode);
    const Icon = meta.Icon;
    return (
        <div
            data-testid="category-svg-fallback"
            className={`flex flex-col items-center justify-center gap-2 ${meta.bg} ${className} select-none p-4 text-center`}
        >
            <div className="flex size-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 shadow-2xs">
                <Icon className={`size-6 ${meta.iconColor}`} />
            </div>
            <span className="max-w-[180px] truncate text-[11px] font-extrabold text-[#0F2F58]">
                {title?.trim() || meta.label}
            </span>
        </div>
    );
}

export function defaultMediaForCategory(categoryCode: string): ListingMedia {
    const normalized = (categoryCode || 'repairs').toLowerCase();
    const match =
        CATEGORY_PRESET_SETS.find((p) => p.categories.includes(normalized)) ??
        CATEGORY_PRESET_SETS[0];

    return {
        cover_thumbnail_url: match.url,
        has_video: false,
        items: [
            {
                id: `media-cover-${match.id}`,
                kind: 'photo',
                url: match.url,
                thumbnail_url: match.url,
                caption: match.label,
                mime_type: 'image/webp',
                is_cover: true,
            },
        ],
    };
}

function buildNormalizedMedia(items: ListingMediaItem[]): ListingMedia {
    const photos = items.filter((item) => item.kind === 'photo');
    const coverItem = photos.find((item) => item.is_cover) ?? photos[0] ?? null;

    const normalizedItems = items.map((item) => ({
        ...item,
        is_cover: coverItem !== null && item.id === coverItem.id,
    }));

    return {
        cover_thumbnail_url: coverItem?.thumbnail_url ?? coverItem?.url ?? null,
        has_video: normalizedItems.some((item) => item.kind === 'video'),
        items: normalizedItems,
    };
}

async function compressImageToWebpThumbnail(file: File): Promise<{
    fullUrl: string;
    thumbnailUrl: string;
    sizeBytes: number;
}> {
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = objectUrl;
        await img.decode();
        const maxWidth = 480;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const webpUrl = canvas.toDataURL('image/webp', 0.78);
            return {
                fullUrl: webpUrl || objectUrl,
                thumbnailUrl: webpUrl || objectUrl,
                sizeBytes: file.size,
            };
        }
    } catch {
        // Fallback to objectUrl when Image.decode is unavailable
    }
    return {
        fullUrl: objectUrl,
        thumbnailUrl: objectUrl,
        sizeBytes: file.size,
    };
}

export function ListingMediaPicker({
    media,
    categoryCode,
    onChange,
}: ListingMediaPickerProps) {
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);

    const items = media?.items ?? [];
    const photoItems = items.filter((item) => item.kind === 'photo');
    const videoItem = items.find((item) => item.kind === 'video') ?? null;
    const isUsingSvgIcon = photoItems.length === 0 || isCategorySvgUrl(media.cover_thumbnail_url);
    const categoryMeta = getCategoryMeta(categoryCode);
    const CategoryIcon = categoryMeta.Icon;

    const categoryPresets = CATEGORY_PRESET_SETS.filter((p) =>
        p.categories.includes((categoryCode || 'repairs').toLowerCase()),
    );

    const handleSelectCategoryIcon = () => {
        const onlyVideo = items.filter((item) => item.kind === 'video');
        onChange({
            cover_thumbnail_url: null,
            has_video: onlyVideo.length > 0,
            items: onlyVideo,
        });
    };

    const handleSelectPresetPhoto = (preset: (typeof CATEGORY_PRESET_SETS)[number]) => {
        const existing = items.find((item) => item.url === preset.url && item.kind === 'photo');
        if (existing) {
            handleSetCover(existing.id);
            return;
        }
        const nextItem: ListingMediaItem = {
            id: `photo-${preset.id}-${Date.now()}`,
            kind: 'photo',
            url: preset.url,
            thumbnail_url: preset.url,
            caption: preset.label,
            mime_type: 'image/webp',
            is_cover: true,
        };
        const demoted = items.map((item) => ({ ...item, is_cover: false }));
        onChange(buildNormalizedMedia([nextItem, ...demoted]));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        const added: ListingMediaItem[] = [];
        for (const file of files.slice(0, 4)) {
            const compressed = await compressImageToWebpThumbnail(file);
            added.push({
                id: `upload-photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                kind: 'photo',
                url: compressed.fullUrl,
                thumbnail_url: compressed.thumbnailUrl,
                caption: file.name.replace(/\.[^.]+$/, ''),
                mime_type: 'image/webp',
                size_bytes: compressed.sizeBytes,
                is_cover: photoItems.length === 0 && added.length === 0,
            });
        }
        onChange(buildNormalizedMedia([...items, ...added]));
        e.target.value = '';
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        const withoutOldVideo = items.filter((item) => item.kind !== 'video');
        const coverThumb = media.cover_thumbnail_url ?? categoryPresets[0]?.url ?? '/photos/ac-clean.jpg';

        const nextVideo: ListingMediaItem = {
            id: `upload-video-${Date.now()}`,
            kind: 'video',
            url: objectUrl,
            thumbnail_url: coverThumb,
            caption: file.name.replace(/\.[^.]+$/, ''),
            mime_type: file.type || 'video/mp4',
            size_bytes: file.size,
            is_cover: false,
        };
        onChange(buildNormalizedMedia([...withoutOldVideo, nextVideo]));
        e.target.value = '';
    };

    const handleToggleVideo = () => {
        if (videoItem) {
            onChange(buildNormalizedMedia(items.filter((item) => item.kind !== 'video')));
            return;
        }
        const coverThumb = media.cover_thumbnail_url ?? categoryPresets[0]?.url ?? '/photos/ac-clean.jpg';
        const demoVideo: ListingMediaItem = {
            id: `video-${Date.now()}`,
            kind: 'video',
            url: '/videos/tagudin-work-showcase.mp4',
            thumbnail_url: coverThumb,
            caption: 'Video',
            mime_type: 'video/mp4',
            size_bytes: 1420000,
            is_cover: false,
        };
        onChange(buildNormalizedMedia([...items, demoVideo]));
    };

    const handleSetCover = (id: string) => {
        const updated = items.map((item) => ({
            ...item,
            is_cover: item.kind === 'photo' && item.id === id,
        }));
        onChange(buildNormalizedMedia(updated));
    };

    const handleRemoveItem = (id: string) => {
        const remaining = items.filter((item) => item.id !== id);
        onChange(buildNormalizedMedia(remaining));
    };

    return (
        <div data-testid="listing-media-picker" className="space-y-2.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Photos &amp; Video</label>
                <div className="flex items-center gap-1.5">
                    {videoItem && (
                        <span
                            data-testid="media-video-badge"
                            className="inline-flex items-center gap-1 rounded-full bg-[#0F2F58] px-2 py-0.5 text-[10px] font-extrabold text-white"
                        >
                            <Video className="size-3 text-[#FFC72C]" />
                            <span>Video</span>
                        </span>
                    )}
                </div>
            </div>

            {/* UI Kit Horizontal Upload & Preview Strip (.photos-upload-strip) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                />
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleVideoUpload}
                    className="hidden"
                />

                {/* Photo Upload Tile (.photo-add-box) */}
                <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    aria-label="Photo"
                    className="flex size-15 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-emerald-600 bg-emerald-50/70 text-[10px] font-extrabold text-emerald-800 transition-colors hover:bg-emerald-100/70"
                >
                    <Camera className="size-4" />
                    <span>Photo</span>
                </button>

                {/* Video Tile (.upload-tile-btn) */}
                <button
                    type="button"
                    onClick={handleToggleVideo}
                    aria-label="Video"
                    className={`flex size-15 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] text-[10px] font-extrabold transition-colors ${
                        videoItem
                            ? 'border-[#0F2F58] bg-[#EBF2FA] text-[#0F2F58]'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-[#0F2F58]'
                    }`}
                >
                    <Video className="size-4" />
                    <span>Video</span>
                </button>

                {/* Attached Items Preview (.photo-preview-item) */}
                {items.map((item) => {
                    const isCover = Boolean(item.is_cover && item.kind === 'photo');
                    return (
                        <div
                            key={item.id}
                            data-testid={`media-item-${item.kind}`}
                            onClick={() => {
                                if (item.kind === 'photo') handleSetCover(item.id);
                            }}
                            className={`relative size-15 shrink-0 cursor-pointer overflow-hidden rounded-xl border-[1.5px] bg-white transition-all ${
                                isCover
                                    ? 'border-[#0F2F58] ring-2 ring-[#0F2F58]/20'
                                    : 'border-slate-200'
                            }`}
                        >
                            <img
                                src={item.thumbnail_url || item.url || '/photos/ac-clean.jpg'}
                                alt={item.caption || item.kind}
                                className="size-full object-cover"
                            />
                            {item.kind === 'video' && (
                                <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-0.5 bg-slate-900/80 py-0.5 text-[8.5px] font-extrabold text-white">
                                    <Video className="size-2.5 text-[#FFC72C]" />
                                    <span>Video</span>
                                </span>
                            )}
                            {isCover && (
                                <span className="absolute bottom-0 inset-x-0 bg-[#0F2F58]/85 py-0.5 text-center text-[8.5px] font-extrabold text-white">
                                    Cover
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(item.id);
                                }}
                                aria-label={`Remove ${item.caption || item.kind}`}
                                className="absolute top-1 right-1 flex size-4.5 cursor-pointer items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-red-600"
                            >
                                <X className="size-2.5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Category Set: SVG Icon Option + Category Image Cells (.photo-cell) */}
            <div className="space-y-1.5">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Category Set
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {/* Category SVG Icon Tile */}
                    <button
                        type="button"
                        onClick={handleSelectCategoryIcon}
                        className={`relative flex size-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] bg-white transition-all ${
                            isUsingSvgIcon
                                ? 'border-emerald-600 ring-2 ring-emerald-600/20'
                                : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <CategoryIcon className={`size-4 ${categoryMeta.iconColor}`} />
                        <span className="text-[9px] font-extrabold text-slate-700">Icon</span>
                        {isUsingSvgIcon && (
                            <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Check className="size-2.5" />
                            </span>
                        )}
                    </button>

                    {/* Category Image Set (.photo-cell) — strictly scoped to active category */}
                    {categoryPresets.map((preset) => {
                        const isSelected =
                            !isUsingSvgIcon && media.cover_thumbnail_url === preset.url;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectPresetPhoto(preset)}
                                className={`relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border-[1.5px] bg-white transition-all ${
                                    isSelected
                                        ? 'border-emerald-600 ring-2 ring-emerald-600/20'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <img
                                    src={preset.url}
                                    alt={preset.label}
                                    className="size-full object-cover"
                                />
                                {isSelected && (
                                    <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                                        <Check className="size-2.5" />
                                    </span>
                                )}
                                <span className="absolute inset-x-0 bottom-0 truncate bg-slate-900/75 px-1 py-0.5 text-center text-[8.5px] font-bold text-white">
                                    {preset.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default ListingMediaPicker;
