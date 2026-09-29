import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';


import { AppLayout } from '../AppLayout';
import { StickyDock } from '../StickyDock';
import { StepWizardHeader } from '../StepWizardHeader';
import WorkPipelineCanvas from '../WorkPipelineCanvas';
import EditableStageRow from '../EditableStageRow';
import DealChainCarousel from '../DealChainCarousel';
import GlovoWaveModal from '../GlovoWaveModal';
import WorkCatalogModal from '../WorkCatalogModal';
import WorkNodeCustomizerModal from '../WorkNodeCustomizerModal';
import { SlotListingPickerModal } from '../../marketplace/SlotListingPickerModal';
import type { WorkStage, WorkTemplate, DealChainCombination, ActingContextData } from '../types';
import type { SlotCandidateListing } from '../../../marketplace/types';
afterEach(cleanup);
describe('Mobile UI Kernel — Foundation Primitives', () => {
    describe('AppLayout', () => {
        it('renders header, content, and dock slots in responsive container', () => {
            render(
                <AppLayout
                    header={<div data-testid="test-header">Header Content</div>}
                    dock={<div data-testid="test-dock">Dock Content</div>}
                >
                    <div data-testid="test-body">Body Content</div>
                </AppLayout>,
            );

            expect(screen.getByTestId('test-header')).toBeDefined();
            expect(screen.getByTestId('test-body')).toBeDefined();
            expect(screen.getByTestId('test-dock')).toBeDefined();
        });

        it('displays acting-for banner when acting context indicates delegated session', () => {
            const actingContext: ActingContextData = {
                actorUserId: 'usr_rosa_1',
                ownerUserId: 'usr_mang_jose_2',
                ownerName: "Mang Jose's Vulcanizing",
                consentGrantId: 'grant_123',
                isActingOnBehalf: true,
            };

            render(
                <AppLayout actingContext={actingContext}>
                    <div>Content</div>
                </AppLayout>,
            );

            expect(screen.getByText(/Acting on behalf of:/i)).toBeDefined();
            expect(screen.getByText(/Mang Jose's Vulcanizing/i)).toBeDefined();
        });
    });

    describe('StickyDock', () => {
        it('renders primary button, Glovo progress dots, and mode switcher', () => {
            const onPrimary = vi.fn();
            const onToggleMode = vi.fn();

            render(
                <StickyDock
                    primaryAction={<span>Continue →</span>}
                    onPrimaryAction={onPrimary}
                    steps={{
                        total: 3,
                        activeIndex: 0,
                    }}
                    modeSwitcher={{
                        isAdvanced: false,
                        onToggle: onToggleMode,
                    }}
                />,
            );

            const primaryBtn = screen.getByRole('button', { name: /Continue →/i });
            expect(primaryBtn).toBeDefined();
            fireEvent.click(primaryBtn);
            expect(onPrimary).toHaveBeenCalledTimes(1);

            const modeBtn = screen.getByRole('button', { name: /all-in-one/i });
            expect(modeBtn).toBeDefined();
            fireEvent.click(modeBtn);
            expect(onToggleMode).toHaveBeenCalledTimes(1);
        });
    });

    describe('StepWizardHeader', () => {
        it('renders title, draft status pill, and circular back button', () => {
            const onBack = vi.fn();
            const onSave = vi.fn();

            render(
                <StepWizardHeader
                    title="Service Listing"
                    draftVersion="v1"
                    onBack={onBack}
                    onSaveDraft={onSave}
                />,
            );

            expect(screen.getByText('Service Listing')).toBeDefined();
            expect(screen.getByText('Draft · v1')).toBeDefined();

            const backBtn = screen.getByRole('button', { name: /back/i });
            fireEvent.click(backBtn);
            expect(onBack).toHaveBeenCalledTimes(1);

            const saveBtn = screen.getByRole('button', { name: /save/i });
            fireEvent.click(saveBtn);
            expect(onSave).toHaveBeenCalledTimes(1);
        });
    });

    describe('WorkPipelineCanvas', () => {
        const linearStages: WorkStage[] = [
            {
                id: '1',
                num: '1',
                title: 'Intake Triage',
                dur: '15m',
                desc: 'Breaker off',
                evidence: 'Photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            },
            {
                id: '2',
                num: '2',
                title: 'Coil Wash',
                dur: '20m',
                desc: 'Chemical foam',
                evidence: 'Photo',
                color: '#0F766E',
                bg: '#CCFBF1',
            },
            {
                id: '3',
                num: '3',
                title: 'Delta Test',
                dur: '15m',
                desc: 'Temp drop',
                evidence: 'OTP',
                color: '#475569',
                bg: '#F1F5F9',
            },
        ];

        it('renders linear stages with title, number badge, and durations', () => {
            const onStageClick = vi.fn();
            render(
                <WorkPipelineCanvas
                    stages={linearStages}
                    flowType="linear"
                    onStageClick={onStageClick}
                />,
            );

            expect(screen.getByText('Intake Triage')).toBeDefined();
            expect(screen.getByText('Coil Wash')).toBeDefined();
            expect(screen.getByText('Delta Test')).toBeDefined();
            expect(screen.getAllByText('15m').length).toBe(2);
            expect(screen.getByText('20m')).toBeDefined();

            fireEvent.click(screen.getByText('Intake Triage'));
            expect(onStageClick).toHaveBeenCalledWith(linearStages[0]);
        });

        it('renders parallel stream layout with 2A and 2B concurrent lanes', () => {
            const parallelStages: WorkStage[] = [
                {
                    id: '1',
                    num: '1',
                    title: 'Intake',
                    dur: '15m',
                    desc: 'Triage',
                    evidence: 'Photo',
                    color: '#0D715F',
                    bg: '#E8F7F1',
                },
                {
                    id: '2a',
                    num: '2A',
                    lane: 'top',
                    title: 'Indoor Coil',
                    dur: '25m',
                    desc: 'Evaporator',
                    evidence: 'Photo',
                    color: '#0284C7',
                    bg: '#E0F2FE',
                },
                {
                    id: '2b',
                    num: '2B',
                    lane: 'btm',
                    title: 'Outdoor Unit',
                    dur: '20m',
                    desc: 'Condenser',
                    evidence: 'Photo',
                    color: '#166534',
                    bg: '#DCFCE7',
                },
                {
                    id: '3',
                    num: '3',
                    title: 'Joint Test',
                    dur: '15m',
                    desc: 'Delta test',
                    evidence: 'OTP',
                    color: '#7E22CE',
                    bg: '#F3E8FF',
                },
            ];

            render(<WorkPipelineCanvas stages={parallelStages} flowType="parallel" />);

            expect(screen.getByText('Indoor Coil')).toBeDefined();
            expect(screen.getByText('Outdoor Unit')).toBeDefined();
            expect(screen.getByText('2A · PARALLEL')).toBeDefined();
            expect(screen.getByText('2B · PARALLEL')).toBeDefined();
        });
    });

    describe('EditableStageRow', () => {
        it('renders visible inputs with clock icon duration and camera evidence tag', () => {
            const stage: WorkStage = {
                id: 's1',
                num: '1',
                title: 'Coil Wash',
                dur: '20m',
                desc: 'Apply specialized chemical foam',
                evidence: 'Chemical foam coverage photo',
                color: '#0D715F',
                bg: '#E8F7F1',
            };

            const onChange = vi.fn();
            const onRemove = vi.fn();

            render(
                <EditableStageRow
                    stage={stage}
                    index={0}
                    onChange={onChange}
                    onRemove={onRemove}
                />,
            );

            expect(screen.getByDisplayValue('Coil Wash')).toBeDefined();
            expect(screen.getByDisplayValue('20')).toBeDefined();
            expect(screen.getByDisplayValue('Apply specialized chemical foam')).toBeDefined();
            expect(screen.getByDisplayValue('Chemical foam coverage photo')).toBeDefined();

            // Test title edit
            const titleInput = screen.getByDisplayValue('Coil Wash');
            fireEvent.change(titleInput, { target: { value: 'Deep Coil Foam Wash' } });
            expect(onChange).toHaveBeenCalledWith(0, { title: 'Deep Coil Foam Wash' });

            // Test remove click
            const removeBtn = screen.getByRole('button', { name: /remove stage/i });
            fireEvent.click(removeBtn);
            expect(onRemove).toHaveBeenCalledWith(0);
        });
    });

    describe('DealChainCarousel', () => {
        const combinations: DealChainCombination[] = [
            {
                id: 'c1',
                title: 'Turnkey Sourced Parts',
                icon: '📦',
                isDefault: true,
                nodes: [
                    {
                        role: 'STORE',
                        title: 'Open Slot',
                        sub: '₱180',
                        type: 'store',
                        bg: '#FEF3C7',
                        color: '#B45309',
                    },
                    {
                        role: 'COURIER',
                        title: 'Open Slot',
                        sub: '₱80',
                        type: 'delivery',
                        bg: '#E0F2FE',
                        color: '#0284C7',
                    },
                    {
                        role: 'YOU',
                        title: 'Your Labor',
                        sub: '₱450',
                        type: 'labor',
                        bg: '#E8F7F1',
                        color: '#0D715F',
                    },
                ],
                slots: [
                    {
                        type: 'store',
                        role: 'Hardware Store Depot',
                        name: 'Tagudin Hardware',
                        meta: '₱180.00 parts budget',
                    },
                    {
                        type: 'delivery',
                        role: 'Parts Courier Runner',
                        name: 'Danny Express',
                        meta: '₱80.00 route fee',
                    },
                ],
            },
            {
                id: 'c2',
                title: 'Post-Service Safety Audit',
                icon: '🛡️',
                isDefault: false,
                nodes: [
                    {
                        role: 'YOU',
                        title: 'Your Labor',
                        sub: '₱450',
                        type: 'labor',
                        bg: '#E8F7F1',
                        color: '#0D715F',
                    },
                    {
                        role: 'AUDIT',
                        title: 'Open Slot',
                        sub: '₱150',
                        type: 'audit',
                        bg: '#EDE9FE',
                        color: '#7C3AED',
                    },
                ],
                slots: [
                    {
                        type: 'audit',
                        role: 'Safety Auditor Slot',
                        name: 'Open Slot',
                        meta: '₱150.00 audit fee',
                    },
                ],
            },
        ];

        it('renders combination cards with compact DAG, slot binders, and pagination', () => {
            const onIndexChange = vi.fn();
            const onSlotChange = vi.fn();
            const onToggleDefault = vi.fn();

            render(
                <DealChainCarousel
                    combinations={combinations}
                    activeIndex={0}
                    onIndexChange={onIndexChange}
                    onSlotChangeClick={onSlotChange}
                    onToggleDefault={onToggleDefault}
                />,
            );

            expect(screen.getByText('Turnkey Sourced Parts')).toBeDefined();
            expect(screen.getByText('★ Default')).toBeDefined();
            expect(screen.getByText('Tagudin Hardware')).toBeDefined();
            expect(screen.getByText('₱180.00 parts budget')).toBeDefined();

            // Next button navigation
            const nextBtn = screen.getByRole('button', { name: /next/i });
            fireEvent.click(nextBtn);
            expect(onIndexChange).toHaveBeenCalledWith(1);

            // Slot change button
            const changeButtons = screen.getAllByRole('button', { name: /change ▾/i });
            fireEvent.click(changeButtons[0]);
            expect(onSlotChange).toHaveBeenCalledWith('c1', 'store');
        });

        it('keeps the next option selected while smooth-scroll events are in flight', async () => {
            const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(
                HTMLElement.prototype,
                'scrollIntoView',
            );
            const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
                HTMLElement.prototype,
                'offsetWidth',
            );
            let settleAnimation: number | undefined;

            vi.useFakeTimers();
            vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
                window.setTimeout(() => callback(performance.now()), 16),
            );
            vi.stubGlobal('cancelAnimationFrame', (timer: number) => window.clearTimeout(timer));

            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                configurable: true,
                get: () => 600,
            });
            Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
                configurable: true,
                value: function (this: HTMLElement): void {
                    const deck = this.parentElement;
                    if (!(deck instanceof HTMLElement) || !deck.classList.contains('snap-x')) {
                        return;
                    }

                    const slides = Array.from(deck.children) as HTMLElement[];
                    const targetIndex = slides.indexOf(this);
                    const createRect = (left: number): DOMRect =>
                        ({
                            x: left,
                            y: 0,
                            left,
                            top: 0,
                            right: left + 600,
                            bottom: 180,
                            width: 600,
                            height: 180,
                            toJSON: () => ({}),
                        }) as DOMRect;

                    Object.defineProperty(deck, 'getBoundingClientRect', {
                        configurable: true,
                        value: () => createRect(0),
                    });
                    slides.forEach((slide, index) => {
                        Object.defineProperty(slide, 'getBoundingClientRect', {
                            configurable: true,
                            value: () => createRect(index * 610 - deck.scrollLeft),
                        });
                    });

                    if (settleAnimation) {
                        window.clearTimeout(settleAnimation);
                        settleAnimation = undefined;
                    }

                    if (targetIndex === 0) {
                        deck.scrollLeft = 0;
                        return;
                    }

                    deck.scrollLeft = 2;
                    fireEvent.scroll(deck);
                    let animationStep = 0;
                    const animate = () => {
                        animationStep += 1;
                        deck.scrollLeft = animationStep < 6 ? animationStep * 100 : 610;
                        fireEvent.scroll(deck);
                        if (animationStep < 6) {
                            settleAnimation = window.setTimeout(animate, 50);
                        }
                    };
                    settleAnimation = window.setTimeout(animate, 50);
                },
            });

            const ControlledCarousel = () => {
                const [activeIndex, setActiveIndex] = useState(0);

                return (
                    <>
                        <output data-testid="active-option">Option {activeIndex + 1} of 2</output>
                        <DealChainCarousel
                            combinations={combinations}
                            activeIndex={activeIndex}
                            onIndexChange={setActiveIndex}
                            onSlotChangeClick={vi.fn()}
                        />
                    </>
                );
            };

            const { unmount } = render(<ControlledCarousel />);

            try {
                await act(async () => {
                    fireEvent.click(screen.getByRole('button', { name: /next/i }));
                    await vi.advanceTimersByTimeAsync(700);
                });

                expect(screen.getByTestId('active-option').textContent).toBe('Option 2 of 2');
            } finally {
                unmount();
                window.clearTimeout(settleAnimation);
                vi.useRealTimers();
                vi.unstubAllGlobals();
                if (scrollIntoViewDescriptor) {
                    Object.defineProperty(
                        HTMLElement.prototype,
                        'scrollIntoView',
                        scrollIntoViewDescriptor,
                    );
                } else {
                    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
                }
                if (offsetWidthDescriptor) {
                    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', offsetWidthDescriptor);
                } else {
                    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                        configurable: true,
                        get: () => 0,
                    });
                }
            }
        });
    });

    describe('GlovoWaveModal', () => {
        it('renders wave cap SVG, header title, search slot, and close button when open', () => {
            const onClose = vi.fn();

            render(
                <GlovoWaveModal
                    isOpen={true}
                    onClose={onClose}
                    title="Work Execution Catalog"
                    subtitle="Pick a standardized workflow template"
                    headerSlot={<input placeholder="Search workflows..." />}
                    bottomSlot={<button>Build Custom Workflow in Work Studio ↗</button>}
                >
                    <div>Modal Content</div>
                </GlovoWaveModal>,
            );

            expect(screen.getByText('Work Execution Catalog')).toBeDefined();
            expect(screen.getByText('Pick a standardized workflow template')).toBeDefined();
            expect(screen.getByPlaceholderText('Search workflows...')).toBeDefined();
            expect(screen.getByText('Modal Content')).toBeDefined();
            expect(screen.getByText('Build Custom Workflow in Work Studio ↗')).toBeDefined();

            const closeBtn = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('adapts the same popup primitive to mobile sheets and desktop modals', () => {
            const onClose = vi.fn();

            render(
                <GlovoWaveModal isOpen={true} onClose={onClose} title="Responsive Deal Chain">
                    <div>Responsive content</div>
                </GlovoWaveModal>,
            );

            const dialog = screen.getByRole('dialog', { name: 'Responsive Deal Chain' });
            const surface = dialog.querySelector('[data-modal-surface="true"]');

            expect(dialog.parentElement).toBe(document.body);
            expect(dialog.className).toContain('sm:items-center');
            expect(dialog.querySelector('.glovo-wave-cap')).toBeTruthy();
            expect(surface?.className).toContain('sm:max-w-2xl');
            expect(surface?.className).toContain('sm:rounded-2xl');
            expect(document.body.style.overflow).toBe('hidden');

            fireEvent.keyDown(document, { key: 'Escape' });
            expect(onClose).toHaveBeenCalledOnce();
        });

        it('does not render when isOpen is false', () => {
            render(
                <GlovoWaveModal isOpen={false} onClose={vi.fn()} title="Closed Modal">
                    <div>Hidden Content</div>
                </GlovoWaveModal>,
            );

            expect(screen.queryByText('Closed Modal')).toBeNull();
            expect(screen.queryByText('Hidden Content')).toBeNull();
        });
    });

    describe('WorkCatalogModal', () => {
        const mockTemplate: WorkTemplate = {
            id: 'tmpl-test',
            category: 'electrical',
            title: 'Test Electrical Protocol',
            shape: 'Linear',
            sla: '45m',
            flowType: 'linear',
            description: 'Standard electrical triage and test',
            stages: [
                {
                    id: 's1',
                    num: '1',
                    title: 'Intake Triage',
                    dur: '15m',
                    desc: 'Safety inspection',
                    evidence: 'Breaker photo',
                    color: '#0D715F',
                    bg: '#E8F7F1',
                },
            ],
        };

        it('calls onClose and onBuildCustom when clicking "Build Custom Workflow in Work Studio ↗"', () => {
            const onClose = vi.fn();
            const onBuildCustom = vi.fn();
            const onSelect = vi.fn();

            render(
                <WorkCatalogModal
                    open={true}
                    onClose={onClose}
                    templates={[mockTemplate]}
                    activeTemplateId="tmpl-test"
                    onSelect={onSelect}
                    onBuildCustom={onBuildCustom}
                />,
            );

            const buildCustomBtn = screen.getByRole('button', {
                name: /Build Custom Workflow in Work Studio ↗/i,
            });
            expect(buildCustomBtn).toBeDefined();

            fireEvent.click(buildCustomBtn);
            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onBuildCustom).toHaveBeenCalledTimes(1);
        });
    });

    describe('WorkNodeCustomizerModal', () => {
        const initialStages: WorkStage[] = [
            {
                id: 'stage-1',
                num: '1',
                title: 'Intake Triage & Breaker Lockout',
                dur: '15m',
                desc: 'Isolate main breaker',
                evidence: 'Breaker lock-out photo gate',
                color: '#0D715F',
                bg: '#E8F7F1',
                gateType: 'arrival',
            },
            {
                id: 'stage-2',
                num: '2',
                title: 'Chemical Foam Clean',
                dur: '30m',
                desc: 'Evaporator coil wash',
                evidence: 'Chemical foam coverage photo gate',
                color: '#0F766E',
                bg: '#CCFBF1',
                gateType: 'execution',
            },
            {
                id: 'stage-3',
                num: '3',
                title: 'Final OTP Release',
                dur: '15m',
                desc: 'Dual customer sign-off',
                evidence: 'Dual customer signature & OTP release',
                color: '#047857',
                bg: '#D1FAE5',
                gateType: 'signoff',
            },
        ];

        it('renders modal dialog with pipeline overview, stage list, and inspector when open', () => {
            const onClose = vi.fn();
            const onSave = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={onClose}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            expect(screen.getByText(/Work Studio · Execution Pipeline/i)).toBeDefined();
            expect(screen.getByText(/3 Verified Steps/i)).toBeDefined();
            expect(screen.getByDisplayValue('Intake Triage & Breaker Lockout')).toBeDefined();
            expect(screen.getByRole('button', { name: /Apply Workflow to Listing/i })).toBeDefined();
        });

        it('allows modifying stage title, duration preset, and evidence', () => {
            const onSave = vi.fn();
            const onClose = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={onClose}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            // Change title
            const titleInput = screen.getByDisplayValue('Intake Triage & Breaker Lockout');
            fireEvent.change(titleInput, { target: { value: 'Modified Intake Gate' } });

            // Click 45m duration preset
            const dur45Btn = screen.getByRole('button', { name: '45m' });
            fireEvent.click(dur45Btn);

            // Save workflow
            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            expect(onSave).toHaveBeenCalledTimes(1);
            const savedStages: WorkStage[] = onSave.mock.calls[0][0];
            expect(savedStages[0].title).toBe('Modified Intake Gate');
            expect(savedStages[0].dur).toBe('45m');
            expect(onClose).toHaveBeenCalledTimes(1);
        });
        it('clears an optional target duration', () => {
            const onSave = vi.fn();
            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            fireEvent.click(screen.getByRole('button', { name: 'No target' }));
            fireEvent.click(screen.getByRole('button', { name: /Apply Workflow to Listing/i }));

            const savedStages: WorkStage[] = onSave.mock.calls[0][0];
            expect(savedStages[0].dur).toBe('');
        });

        it('allows switching clearance mode', () => {
            const onSave = vi.fn();
            const onClose = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={onClose}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            // Select Customer Approval Required in the inspector
            const approvalCards = screen.getAllByText('Customer Approval Required');
            fireEvent.click(approvalCards[approvalCards.length - 1]);
            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            const savedStages: WorkStage[] = onSave.mock.calls[0][0];
            expect(savedStages[0].clearanceMode).toBe('customer_approval');
            expect(savedStages[0].gateType).toBe('signoff');
        });
        it('allows adding a new stage node', () => {
            const onSave = vi.fn();
            const onClose = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={onClose}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            const addBtn = screen.getByRole('button', { name: /\+ Add Stage Node/i });
            fireEvent.click(addBtn);

            expect(screen.getByText(/Steps \(4\)/i)).toBeDefined();
            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            const savedStages: WorkStage[] = onSave.mock.calls[0][0];
            expect(savedStages.length).toBe(4);
            expect(savedStages[3].num).toBe('4');
            expect(savedStages[3].dur).toBe('');
        });

        it('allows reordering stages and updates numbering', () => {
            const onSave = vi.fn();
            const onClose = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={onClose}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            // First stage down arrow
            const downButtons = screen.getAllByRole('button', { name: /Move stage down/i });
            fireEvent.click(downButtons[0]);

            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            const savedStages: WorkStage[] = onSave.mock.calls[0][0];
            expect(savedStages[0].title).toBe('Chemical Foam Clean');
            expect(savedStages[0].num).toBe('1');
            expect(savedStages[1].title).toBe('Intake Triage & Breaker Lockout');
            expect(savedStages[1].num).toBe('2');
        });

        it('calls onResetToTemplate when reset button is clicked', () => {
            const onReset = vi.fn();

            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={vi.fn()}
                    onResetToTemplate={onReset}
                />,
            );

            const resetBtn = screen.getByRole('button', { name: /Reset to Archetype/i });
            fireEvent.click(resetBtn);
            expect(onReset).toHaveBeenCalledTimes(1);
        });

        it('does not render when open is false', () => {
            render(
                <WorkNodeCustomizerModal
                    open={false}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={vi.fn()}
                />,
            );

            expect(screen.queryByText(/Work Studio · Execution Pipeline/i)).toBeNull();
        });

        it('renders Universal Step Library primitives and allows adding a primitive to the pipeline', () => {
            const onSave = vi.fn();
            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );

            // Open Step Library tab via the explicit button
            const libraryBtn = screen.getByRole('button', { name: 'From Step Library' });
            fireEvent.click(libraryBtn);
            // Check that Universal Primitives are rendered
            expect(screen.getByText('Universal Step Library')).toBeDefined();
            expect(screen.getByText('Site Arrival & Check-In')).toBeDefined();
            expect(screen.getByText('Custody Intake / Stall Pickup')).toBeDefined();
            expect(screen.getByText('Digital Artifact Delivery')).toBeDefined();

            // Click "+ Add Step" on Digital Artifact Delivery
            const addStepBtns = screen.getAllByRole('button', { name: /\+ Add Step/i });
            fireEvent.click(addStepBtns[5]); // Digital Artifact Delivery

            // Verify stage count grew to 4 and inspector switched to configure
            expect(screen.getByText(/Steps \(4\)/i)).toBeDefined();

            // Apply workflow
            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            expect(onSave).toHaveBeenCalledTimes(1);
            const saved: WorkStage[] = onSave.mock.calls[0][0];
            expect(saved.length).toBe(4);
            expect(saved[3].title).toBe('Digital Artifact Delivery');
            expect(saved[3].clearanceMode).toBe('customer_approval');
        });

        it('renders interactive Live Order Simulator with Worker and Customer views', () => {
            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={vi.fn()}
                />,
            );

            // Switch to simulator tab
            const simTab = screen.getByRole('button', { name: /Live Order Simulator/i });
            fireEvent.click(simTab);

            // Verify Worker View simulation
            expect(screen.getByText('Production Screen Preview')).toBeDefined();
            expect(screen.getByText('Worker Execution Inputs')).toBeDefined();
            expect(screen.getByText('Photo Proof Required')).toBeDefined();

            // Toggle to Customer View
            const customerBtn = screen.getByRole('button', { name: /Customer View/i });
            fireEvent.click(customerBtn);

            expect(screen.getByText('Customer Experience')).toBeDefined();
            expect(screen.getByText('Service Underway')).toBeDefined();
        });

        it('allows configuring clearance mode and multi-proofs', () => {
            const onSave = vi.fn();
            render(
                <WorkNodeCustomizerModal
                    open={true}
                    onClose={vi.fn()}
                    stages={initialStages}
                    onSave={onSave}
                />,
            );
            // Click Customer Approval Required in inspector
            const approvalCards = screen.getAllByText('Customer Approval Required');
            fireEvent.click(approvalCards[approvalCards.length - 1]);
            // Check Metric reading checkbox
            const metricCheckbox = screen.getByRole('checkbox', { name: /Metric \/ Measurement Reading/i });
            fireEvent.click(metricCheckbox);

            // Save
            const applyBtn = screen.getByRole('button', { name: /Apply Workflow to Listing/i });
            fireEvent.click(applyBtn);

            const saved: WorkStage[] = onSave.mock.calls[0][0];
            expect(saved[0].clearanceMode).toBe('customer_approval');
            expect(saved[0].requiredProofs).toContain('metric_reading');
        });
    });

    describe('SlotListingPickerModal — Role Normalization & State Sync Regression', () => {
        const mockCandidates: SlotCandidateListing[] = [
            {
                id: 'c1',
                title: 'Tagudin Express Motorcycle Delivery',
                provider_name: 'Danny Express Motorcycle Pool',
                area: 'Tagudin Townwide',
                price_minor: 8000,
                sla_text: 'On-demand ~20 mins transit',
                rating: 4.9,
                role: 'COURIER',
            },
            {
                id: 'c2',
                title: 'Barangay Centro Bicycle Runner',
                provider_name: 'Centro Eco Courier',
                area: 'Poblacion Centro',
                price_minor: 2500,
                sla_text: 'Eco transit ~15 mins',
                rating: 4.8,
                role: 'COURIER',
            },
            {
                id: 'c3',
                title: 'Split AC Capacitor Installation',
                provider_name: 'Kuya Ben Aircon Services',
                area: 'Tagudin Centro',
                price_minor: 25000,
                sla_text: 'Certified technician installation',
                rating: 4.9,
                role: 'LABOR',
            },
        ];

        it('normalizes lowercase "delivery" role to COURIER candidates instead of empty state', () => {
            render(
                <SlotListingPickerModal
                    open={true}
                    onClose={vi.fn()}
                    role="delivery"
                    candidates={mockCandidates}
                    onSelectCandidate={vi.fn()}
                />,
            );

            expect(screen.getByText('Tagudin Express Motorcycle Delivery')).toBeDefined();
            expect(screen.getByText('Barangay Centro Bicycle Runner')).toBeDefined();
        });

        it('resets selected candidate when role switches from COURIER to LABOR', () => {
            const onSelect = vi.fn();
            const { rerender } = render(
                <SlotListingPickerModal
                    open={true}
                    onClose={vi.fn()}
                    role="COURIER"
                    candidates={mockCandidates}
                    onSelectCandidate={onSelect}
                />,
            );

            // Select bicycle courier
            fireEvent.click(screen.getByText('Barangay Centro Bicycle Runner'));

            // Now switch role to LABOR
            rerender(
                <SlotListingPickerModal
                    open={true}
                    onClose={vi.fn()}
                    role="LABOR"
                    candidates={mockCandidates}
                    onSelectCandidate={onSelect}
                />,
            );

            // Confirm selection — must return a LABOR candidate, not the stale COURIER candidate
            fireEvent.click(screen.getByRole('button', { name: /Confirm Partner Selection/i }));
            expect(onSelect).toHaveBeenCalledTimes(1);
            expect(onSelect.mock.calls[0][0].role).toBe('LABOR');
        });
    });
});
