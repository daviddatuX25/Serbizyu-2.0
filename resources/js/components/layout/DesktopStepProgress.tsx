interface StepItem {
    id: number;
    title: string;
    description: string;
}

interface DesktopStepProgressProps {
    steps: StepItem[];
    currentStep: number;
    onStepClick?: (stepId: number) => void;
}

export function DesktopStepProgress({
    steps,
    currentStep,
    onStepClick,
}: DesktopStepProgressProps) {
    return (
        <nav aria-label="Step Progress" className="hidden w-full lg:block mb-6">
            <ol className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {steps.map((step, idx) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;
                    const isClickable = onStepClick && (isCompleted || isCurrent);

                    return (
                        <li
                            key={step.id}
                            className={`flex flex-1 items-center ${idx < steps.length - 1 ? 'pr-4' : ''}`}
                        >
                            <button
                                type="button"
                                disabled={!isClickable}
                                onClick={() => onStepClick?.(step.id)}
                                className={`flex items-center gap-3 text-left transition-all ${
                                    isClickable ? 'cursor-pointer' : 'cursor-default'
                                }`}
                            >
                                {/* Circle Badge */}
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                                        isCompleted
                                            ? 'bg-emerald-600 text-white'
                                            : isCurrent
                                              ? 'bg-[#0F2F58] text-white shadow-sm ring-4 ring-blue-50'
                                              : 'border border-slate-300 bg-slate-100 text-slate-500'
                                    }`}
                                >
                                    {isCompleted ? '✓' : step.id}
                                </div>

                                {/* Step Title & Subtitle */}
                                <div className="flex flex-col">
                                    <span
                                        className={`text-xs font-bold leading-tight ${
                                            isCurrent
                                                ? 'text-[#0F2F58]'
                                                : isCompleted
                                                  ? 'text-slate-800'
                                                  : 'text-slate-400'
                                        }`}
                                    >
                                        {step.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {step.description}
                                    </span>
                                </div>
                            </button>

                            {/* Connecting Line between Steps */}
                            {idx < steps.length - 1 && (
                                <div
                                    className={`mx-4 h-0.5 flex-1 transition-colors ${
                                        currentStep > step.id ? 'bg-emerald-600' : 'bg-slate-200'
                                    }`}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
