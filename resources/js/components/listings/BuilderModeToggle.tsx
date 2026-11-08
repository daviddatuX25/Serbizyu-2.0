import { ToggleLeft, ToggleRight } from 'lucide-react';
import type { BuilderMode } from '../../lib/builderGuidance';

interface BuilderModeToggleProps {
    mode: BuilderMode;
    onModeChange: (mode: BuilderMode) => void;
}

export default function BuilderModeToggle({ mode, onModeChange }: BuilderModeToggleProps) {
    const isStandard = mode === 'standard';

    return (
        <button
            type="button"
            role="switch"
            aria-label="Standard builder mode"
            aria-checked={isStandard}
            title={isStandard ? 'Switch to guided mode' : 'Switch to standard mode'}
            onClick={() => onModeChange(isStandard ? 'guided' : 'standard')}
            data-testid="builder-mode-switcher"
            className="col-start-2 row-start-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 justify-self-end rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-[#0F2F58] transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F58] sm:ml-auto"
        >
            {isStandard ? <ToggleRight aria-hidden="true" className="size-5" /> : <ToggleLeft aria-hidden="true" className="size-5" />}
            <span>{isStandard ? 'Standard' : 'Guided'}</span>
        </button>
    );
}
