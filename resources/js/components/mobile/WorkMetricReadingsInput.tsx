import { useEffect, useMemo, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';

type MetricReadingDraft = { value: number; unit: string };

type WorkMetricReadingsInputProps = {
    metricUnit?: string | null;
    disabled: boolean;
    onChange: (readings: MetricReadingDraft[]) => void;
};

export default function WorkMetricReadingsInput({ metricUnit, disabled, onChange }: WorkMetricReadingsInputProps) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const readingUnits = useMemo(() => {
        const units = (metricUnit ?? '').split('/').map((unit) => unit.trim()).filter(Boolean);
        return units.length > 0 ? units : [''];
    }, [metricUnit]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [customUnit, setCustomUnit] = useState('');

    useEffect(() => {
        const readings = readingUnits.map((unit, index) => {
            const value = values[`${index}:${unit}`] ?? '';
            const parsedValue = Number(value);
            return {
                value: parsedValue,
                unit: unit || customUnit.trim(),
                valid: value.trim() !== '' && Number.isFinite(parsedValue) && (unit !== '' || customUnit.trim() !== ''),
            };
        });
        onChangeRef.current(readings.every((reading) => reading.valid)
            ? readings.map(({ value, unit }) => ({ value, unit }))
            : []);
    }, [customUnit, readingUnits, values]);

    return (
        <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="work-metric-readings">
            <div className="flex items-start gap-2.5">
                <Gauge className="mt-0.5 size-4 text-[#0F2F58]" aria-hidden="true" />
                <div>
                    <h5 className="text-xs font-bold text-slate-900">Measurements</h5>
                    <p className="mt-0.5 text-[11px] text-slate-600">Enter the readings specified by this Work step.</p>
                </div>
            </div>

            <div className="space-y-2">
                {readingUnits.map((unit, index) => (
                    <div key={`${index}:${unit}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                        <label className="space-y-1 text-xs font-semibold text-slate-700">
                            {unit || 'Reading'}
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                value={values[`${index}:${unit}`] ?? ''}
                                onChange={(event) => setValues((current) => ({
                                    ...current,
                                    [`${index}:${unit}`]: event.currentTarget.value,
                                }))}
                                disabled={disabled}
                                className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                            />
                        </label>
                        {unit !== '' ? (
                            <span className="pb-3 text-xs font-semibold text-slate-600">{unit}</span>
                        ) : (
                            <label className="space-y-1 text-xs font-semibold text-slate-700">
                                Unit
                                <input
                                    type="text"
                                    maxLength={32}
                                    value={customUnit}
                                    onChange={(event) => setCustomUnit(event.currentTarget.value)}
                                    disabled={disabled}
                                    className="min-h-11 w-24 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#0F2F58] focus:outline-none focus:ring-2 focus:ring-[#0F2F58]/20 disabled:bg-slate-50"
                                />
                            </label>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
