import { useEffect, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';
import type { WorkMetricRequirement } from './types';

export type MetricReadingDraft = { id: string; value: number; unit: string };
type WorkMetricReadingsInputProps = {
    requirements: WorkMetricRequirement[];
    disabled: boolean;
    onChange: (readings: MetricReadingDraft[]) => void;
};

export default function WorkMetricReadingsInput({ requirements, disabled, onChange }: WorkMetricReadingsInputProps) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const readings = requirements.flatMap((requirement) => {
            const raw = values[requirement.id] ?? '';
            const value = Number(raw);
            return raw.trim() !== '' && Number.isFinite(value)
                ? [{ id: requirement.id, value, unit: requirement.unit }]
                : [];
        });
        onChangeRef.current(readings);
    }, [requirements, values]);

    return (
        <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="work-metric-readings">
            <div className="flex items-start gap-2.5">
                <Gauge className="mt-0.5 size-4 text-[#0F2F58]" aria-hidden="true" />
                <div>
                    <h5 className="text-xs font-bold text-slate-900">Measurements</h5>
                    <p className="mt-0.5 text-[11px] text-slate-600">Enter each named measurement specified by this Work step.</p>
                </div>
            </div>
            <div className="space-y-3">
                {requirements.map((requirement) => (
                    <label key={requirement.id} className="block space-y-1 text-xs font-semibold text-slate-700">
                        <span>{requirement.name}{requirement.required ? <span className="ml-1 text-rose-700" aria-label="required">*</span> : null}</span>
                        {requirement.target !== undefined && requirement.target !== null ? <span className="ml-2 font-normal text-slate-600">Target: {requirement.target} {requirement.unit}</span> : null}
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={requirement.min ?? undefined}
                                max={requirement.max ?? undefined}
                                inputMode="decimal"
                                step="any"
                                value={values[requirement.id] ?? ''}
                                onChange={(event) => setValues((current) => ({ ...current, [requirement.id]: event.currentTarget.value }))}
                                disabled={disabled}
                                aria-label={`${requirement.name} (${requirement.unit})`}
                                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                            />
                            <span className="min-w-12 text-xs font-semibold text-slate-600">{requirement.unit}</span>
                        </div>
                    </label>
                ))}
            </div>
        </section>
    );
}
