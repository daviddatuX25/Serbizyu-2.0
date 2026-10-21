import { ListChecks } from 'lucide-react';

type WorkChecklistStepsInputProps = {
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
};

export default function WorkChecklistStepsInput({ checked, disabled, onChange }: WorkChecklistStepsInputProps) {
    return (
        <section className="border-t border-slate-200 pt-4" data-testid="work-checklist-steps">
            <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-800">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.currentTarget.checked)}
                    disabled={disabled}
                    className="mt-0.5 size-4 rounded accent-[#0F2F58] disabled:opacity-50"
                />
                <span>
                    <span className="flex items-center gap-1.5 font-bold">
                        <ListChecks className="size-4 text-[#0F2F58]" aria-hidden="true" />
                        Checklist steps
                    </span>
                    <span className="mt-0.5 block text-slate-600">I completed the checklist required for this step.</span>
                </span>
            </label>
        </section>
    );
}
