import { AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import type { WorkNodeEvidenceProjection } from '../../types';

type WorkNodeEvidenceReviewProps = {
    evidence: WorkNodeEvidenceProjection | null | undefined;
    onPreviewPhoto: (url: string) => void;
};

export default function WorkNodeEvidenceReview({ evidence, onPreviewPhoto }: WorkNodeEvidenceReviewProps) {
    if (!evidence) {
        return (
            <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
                No proof has been submitted for this step.
            </p>
        );
    }

    return (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3" data-testid="work-node-evidence-review">
            {evidence.photos.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Submitted work photos">
                    {evidence.photos.map((photo) => (
                        <li key={photo.id}>
                            <button
                                type="button"
                                onClick={() => onPreviewPhoto(photo.url)}
                                className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58]"
                                aria-label="Inspect submitted work photo"
                            >
                                <img src={photo.url} alt="Submitted work proof" className="size-full object-cover" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : evidence.pending_photo_count > 0 ? (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950" role="status">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    Photo proof is under safety review and cannot be opened yet.
                </p>
            ) : null}

            {evidence.location && (
                <div className="flex items-start gap-2 text-xs text-slate-800">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#0F2F58]" aria-hidden="true" />
                    <div>
                        <p className="font-semibold">{evidence.location.latitude.toFixed(5)}, {evidence.location.longitude.toFixed(5)}</p>
                        <p className="text-[11px] text-slate-600">
                            {evidence.location.source === 'gps' ? 'Device-reported location' : 'Provider-entered location'} · not independently verified
                        </p>
                        {evidence.location.landmark && (
                            <p className="text-[11px] text-slate-600">{evidence.location.landmark}</p>
                        )}
                    </div>
                </div>
            )}

            {evidence.metric_readings.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Submitted measurements">
                    {evidence.metric_readings.map((reading, index) => (
                        <li key={`${reading.unit}-${index}`} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-800">
                            <strong>{reading.value}</strong> {reading.unit}
                        </li>
                    ))}
                </ul>
            )}

            {evidence.checklist_completed && (
                <p className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="size-4" aria-hidden="true" /> Checklist completed
                </p>
            )}

            {evidence.notes && (
                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800">{evidence.notes}</p>
            )}
        </div>
    );
}
