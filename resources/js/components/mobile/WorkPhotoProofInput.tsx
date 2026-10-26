import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertCircle, Camera, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import type { WorkNodeEvidenceCandidate } from '../../types';

const MAX_PHOTOS_PER_NODE = 8;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const NO_CANDIDATES: WorkNodeEvidenceCandidate[] = [];

type PhotoStatus = 'selected' | 'uploading' | 'quarantined' | 'clean' | 'failed' | 'rejected';
type PhotoDraft = {
    key: string;
    evidenceId?: string;
    file?: File;
    previewUrl: string;
    scanStatus: PhotoStatus;
    error?: string;
};

function projectScanStatus(status: string): PhotoStatus {
    if (status === 'clean') return 'clean';
    if (status === 'infected' || status === 'failed') return 'rejected';
    return 'quarantined';
}

function scanFailureMessage(status: string): string | undefined {
    if (status === 'infected') return 'This photo was rejected by the safety scan. Remove it and upload a safe replacement.';
    if (status === 'failed') return 'The safety scan failed. Remove this photo and upload it again.';
    return undefined;
}

type WorkPhotoProofInputProps = {
    orderId: string;
    nodeId: string;
    candidates?: WorkNodeEvidenceCandidate[];
    disabled: boolean;
    onEvidenceIdsChange: (evidenceIds: string[]) => void;
    onPreviewPhoto: (url: string) => void;
};

export default function WorkPhotoProofInput({
    orderId,
    nodeId,
    candidates,
    disabled,
    onEvidenceIdsChange,
    onPreviewPhoto,
}: WorkPhotoProofInputProps) {
    const candidateList = candidates ?? NO_CANDIDATES;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const localPreviewUrls = useRef(new Set<string>());
    const onEvidenceIdsChangeRef = useRef(onEvidenceIdsChange);
    onEvidenceIdsChangeRef.current = onEvidenceIdsChange;

    const [photos, setPhotos] = useState<PhotoDraft[]>(() => candidateList.map((candidate) => {
        const scanStatus = projectScanStatus(candidate.scan_status);
        return {
            key: candidate.id,
            evidenceId: candidate.id,
            previewUrl: scanStatus === 'clean' ? candidate.url ?? '' : '',
            scanStatus,
            error: scanFailureMessage(candidate.scan_status),
        };
    }));
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const candidateKey = JSON.stringify(candidateList);

    useEffect(() => {
        setPhotos((current) => {
            const currentById = new Map(
                current.filter((photo) => photo.evidenceId !== undefined).map((photo) => [photo.evidenceId as string, photo]),
            );
            const projected = candidateList.map((candidate) => {
                const existing = currentById.get(candidate.id);
                const scanStatus = projectScanStatus(candidate.scan_status);
                return {
                    key: candidate.id,
                    evidenceId: candidate.id,
                    file: scanStatus === 'rejected' ? undefined : existing?.file,
                    previewUrl: scanStatus === 'clean'
                        ? existing?.previewUrl.startsWith('blob:') ? existing.previewUrl : candidate.url ?? ''
                        : '',
                    scanStatus,
                    error: scanFailureMessage(candidate.scan_status) ?? existing?.error,
                };
            });
            const localDrafts = current.filter((photo) => photo.evidenceId === undefined);
            return [...projected, ...localDrafts];
        });
    }, [nodeId, candidateKey, candidateList]);

    useEffect(() => {
        onEvidenceIdsChangeRef.current(
            photos
                .filter((photo) => photo.evidenceId !== undefined && photo.scanStatus === 'clean')
                .map((photo) => photo.evidenceId as string),
        );
    }, [photos]);

    useEffect(() => () => {
        for (const previewUrl of localPreviewUrls.current) {
            URL.revokeObjectURL(previewUrl);
        }
        localPreviewUrls.current.clear();
    }, []);

    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = '';
        setUploadError(null);

        const slotsAvailable = Math.max(0, MAX_PHOTOS_PER_NODE - photos.length);
        if (selectedFiles.length > slotsAvailable) {
            setUploadError(`A work step can have up to ${MAX_PHOTOS_PER_NODE} photos.`);
        }

        const additions: PhotoDraft[] = [];
        for (const file of selectedFiles.slice(0, slotsAvailable)) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setUploadError('Choose a JPEG, PNG, or WebP image.');
                continue;
            }
            if (file.size < 1 || file.size > MAX_PHOTO_BYTES) {
                setUploadError('Each image must be 10 MB or smaller.');
                continue;
            }

            const previewUrl = URL.createObjectURL(file);
            localPreviewUrls.current.add(previewUrl);
            additions.push({
                key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                previewUrl,
                scanStatus: 'selected',
            });
        }

        if (additions.length > 0) {
            setPhotos((current) => [...current, ...additions]);
        }
    };

    const uploadPhoto = async (photoKey: string): Promise<void> => {
        const photo = photos.find((item) => item.key === photoKey);
        if (photo?.file === undefined || photo.scanStatus === 'uploading' || disabled) {
            return;
        }

        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
        if (!csrfToken) {
            setUploadError('Refresh this page to restore the secure upload session.');
            return;
        }

        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('tool_key', 'photo_proof');
        setUploadError(null);
        setIsUploading(true);
        setPhotos((current) => current.map((item) => item.key === photoKey ? { ...item, scanStatus: 'uploading', error: undefined } : item));

        try {
            const response = await fetch(`/orders/${encodeURIComponent(orderId)}/work-nodes/${encodeURIComponent(nodeId)}/evidence`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });
            const result = await response.json() as {
                data?: { id: string; scan_status: string };
                error?: { message?: string };
                message?: string;
                errors?: Record<string, string[]>;
            };
            if (!response.ok || !result.data?.id) {
                const firstValidationError = Object.values(result.errors ?? {}).flat()[0];
                throw new Error(result.error?.message ?? firstValidationError ?? result.message ?? 'The image could not be uploaded. Try again.');
            }

            const scanStatus = projectScanStatus(result.data.scan_status);
            setPhotos((current) => current.map((item) => item.key === photoKey ? {
                ...item,
                evidenceId: result.data?.id,
                file: undefined,
                previewUrl: scanStatus === 'rejected' ? '' : item.previewUrl,
                scanStatus,
                error: scanFailureMessage(result.data?.scan_status ?? ''),
            } : item));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'The image could not be uploaded. Try again.';
            setUploadError(message);
            setPhotos((current) => current.map((item) => item.key === photoKey ? { ...item, scanStatus: 'failed', error: message } : item));
        } finally {
            setIsUploading(false);
        }
    };

    const removeLocalPhoto = (photoKey: string) => {
        setPhotos((current) => {
            const photo = current.find((item) => item.key === photoKey);
            if (photo?.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(photo.previewUrl);
                localPreviewUrls.current.delete(photo.previewUrl);
            }
            return current.filter((item) => item.key !== photoKey);
        });
    };

    const pendingScanCount = photos.filter((photo) => photo.scanStatus === 'quarantined' || photo.scanStatus === 'uploading').length;

    return (
        <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="work-photo-proof">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                    <Camera className="mt-0.5 size-4 text-[#0F2F58]" aria-hidden="true" />
                    <div>
                        <h5 className="text-xs font-bold text-slate-900">Photo proof</h5>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Attach current step photos. Files stay private until their safety scan passes.</p>
                    </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-slate-500">{photos.length}/{MAX_PHOTOS_PER_NODE}</span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="sr-only"
                aria-label="Choose work proof photos"
                onChange={handleFileSelection}
                disabled={disabled || isUploading || photos.length >= MAX_PHOTOS_PER_NODE}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading || photos.length >= MAX_PHOTOS_PER_NODE}
                className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-4 text-center text-xs font-bold text-[#0F2F58] hover:border-[#0D715F] hover:bg-emerald-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] disabled:cursor-not-allowed disabled:opacity-50"
            >
                <Upload className="size-5" aria-hidden="true" />
                <span>Choose or take a photo</span>
                <span className="text-[10px] font-medium text-slate-500">JPEG, PNG, or WebP · up to 10 MB each</span>
            </button>

            {photos.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Work proof photos">
                    {photos.map((photo) => (
                        <li key={photo.key} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            {photo.previewUrl !== '' ? (
                                <button
                                    type="button"
                                    className="block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"
                                    onClick={() => onPreviewPhoto(photo.previewUrl)}
                                    aria-label="Preview work proof photo"
                                >
                                    <img src={photo.previewUrl} alt="Work proof preview" className="size-full object-cover" />
                                </button>
                            ) : (
                                <div className="flex aspect-[4/3] items-center justify-center bg-slate-50 text-slate-400">
                                    <Camera className="size-5" aria-hidden="true" />
                                </div>
                            )}
                            <div className="flex min-h-10 items-center justify-between gap-1 px-2 py-1.5">
                                <span className="flex min-w-0 items-center gap-1 text-[10px] font-semibold text-slate-700">
                                    {photo.scanStatus === 'clean' ? <CheckCircle2 className="size-3 shrink-0 text-emerald-700" aria-hidden="true" /> : null}
                                    {photo.scanStatus === 'rejected' ? <AlertCircle className="size-3 shrink-0 text-rose-700" aria-hidden="true" /> : null}
                                    <span className="truncate">
                                        {photo.scanStatus === 'selected'
                                            ? 'Not uploaded'
                                            : photo.scanStatus === 'failed'
                                            ? 'Upload failed'
                                            : photo.scanStatus === 'uploading'
                                            ? 'Uploading'
                                            : photo.scanStatus === 'clean'
                                            ? 'Available'
                                            : photo.scanStatus === 'rejected'
                                            ? 'Rejected by safety scan'
                                            : 'Safety scan pending'}
                                    </span>
                                </span>
                                {photo.file && (photo.scanStatus === 'selected' || photo.scanStatus === 'failed') ? (
                                    <div className="flex shrink-0 items-center">
                                        <button
                                            type="button"
                                            onClick={() => void uploadPhoto(photo.key)}
                                            disabled={isUploading || disabled}
                                            className="rounded-md px-2 py-1 text-[10px] font-bold text-[#0D715F] hover:bg-emerald-50 disabled:opacity-50"
                                        >
                                            {photo.scanStatus === 'failed' ? 'Retry' : 'Upload'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeLocalPhoto(photo.key)}
                                            disabled={isUploading || disabled}
                                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0F2F58] disabled:opacity-50"
                                            aria-label="Remove selected photo"
                                        >
                                            <X className="size-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                ) : photo.scanStatus === 'rejected' ? (
                                    <button
                                        type="button"
                                        onClick={() => removeLocalPhoto(photo.key)}
                                        disabled={disabled}
                                        className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                                        aria-label="Remove rejected photo"
                                    >
                                        Remove
                                    </button>
                                ) : photo.scanStatus === 'uploading' ? (
                                    <Loader2 className="size-3.5 animate-spin text-slate-500" aria-label="Uploading" />
                                ) : null}
                            </div>
                            {photo.scanStatus === 'rejected' && photo.error ? <p className="border-t border-slate-100 px-2 py-2 text-[10px] leading-relaxed text-rose-800" role="status">{photo.error}</p> : null}
                        </li>
                    ))}
                </ul>
            )}

            {pendingScanCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950" role="status">
                    <p className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>{pendingScanCount} photo{pendingScanCount === 1 ? '' : 's'} waiting for a safety scan. Proof cannot advance until a photo is available.</span>
                    </p>
                    <button type="button" onClick={() => router.reload()} disabled={disabled || isUploading} className="min-h-9 shrink-0 rounded-full border border-amber-300 bg-white px-3 font-bold text-amber-950 disabled:opacity-50">Refresh scan status</button>
                </div>
            )}
            {uploadError && <p className="text-xs text-red-700" role="alert">{uploadError}</p>}
        </section>
    );
}
