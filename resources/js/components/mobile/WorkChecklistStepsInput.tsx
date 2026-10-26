import { ListChecks } from 'lucide-react';
import type { WorkChecklistItem } from './types';

type WorkChecklistStepsInputProps = {
    items: WorkChecklistItem[];
    responses: Record<string, boolean>;
    disabled: boolean;
    onChange: (responses: Record<string, boolean>) => void;
};

export default function WorkChecklistStepsInput({ items, responses, disabled, onChange }: WorkChecklistStepsInputProps) {
    return (
        <section className="space-y-3 border-t border-slate-200 pt-4" data-testid="work-checklist-steps">
            <div className="flex items-center gap-1.5 text-xs font-bold">
                <ListChecks className="size-4 text-[#0F2F58]" aria-hidden="true" />
                Checklist steps
            </div>
            <div className="space-y-3">
                {items.map((item) => (
                    <label key={item.id} className="flex min-h-11 items-start gap-3 text-sm leading-relaxed text-slate-800">
                        <input
                            type="checkbox"
                            checked={responses[item.id] ?? false}
                            onChange={(event) => onChange({ ...responses, [item.id]: event.currentTarget.checked })}
                            disabled={disabled}
                            className="mt-0.5 size-5 shrink-0 rounded accent-[#0F2F58] disabled:opacity-50"
                        />
                        <span>{item.label}{item.required ? <span className="ml-1 text-rose-700" aria-label="required">*</span> : null}</span>
                    </label>
                ))}
            </div>
        </section>
    );
}
