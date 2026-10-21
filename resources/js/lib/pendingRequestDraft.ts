import type { BuilderMode } from './builderGuidance';

export const REQUEST_DRAFT_STORAGE_KEY = 'serbizyu.pending-request.v1';

export interface RequestPipelineStage {
    id: string;
    step: number;
    title: string;
    dur: number;
    desc: string;
    evidence: string;
}

export interface RequestBuilderDraft {
    version: 1;
    step: number;
    builderMode: BuilderMode;
    title: string;
    category: string;
    description: string;
    requirements: string[];
    attachPipeline: boolean;
    selectedTemplateId?: string;
    pipelineStages: RequestPipelineStage[];
    urgency: 'today' | 'this_week' | 'flexible' | 'specific';
    scheduledDate?: string;
    scheduledTimeWindow?: string;
    area: string;
    addressHidden: boolean;
    budgetMode: 'estimate' | 'exact' | 'undisclosed';
    budgetAmount: number;
    tenderMode: 'open_tender' | 'sealed_tender' | 'direct_invite';
    paymentLane: 'external_cash' | 'bilateral_escrow';
    preferredFulfillment: 'direct' | 'courier' | 'all';
}

interface PendingRequestEnvelope {
    version: 1;
    draft: RequestBuilderDraft;
}

function isPendingRequestEnvelope(value: unknown): value is PendingRequestEnvelope {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const env = value as Record<string, unknown>;
    if (env.version !== 1 || typeof env.draft !== 'object' || env.draft === null) {
        return false;
    }
    const draft = env.draft as Record<string, unknown>;
    return typeof draft.title === 'string' && typeof draft.builderMode === 'string';
}

export function savePendingRequestDraft(draft: RequestBuilderDraft): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        window.sessionStorage.setItem(
            REQUEST_DRAFT_STORAGE_KEY,
            JSON.stringify({ version: 1, draft } satisfies PendingRequestEnvelope),
        );
        return true;
    } catch {
        return false;
    }
}

export function readPendingRequestDraft(): RequestBuilderDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = window.sessionStorage.getItem(REQUEST_DRAFT_STORAGE_KEY);
        if (stored === null) {
            return null;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!isPendingRequestEnvelope(parsed)) {
            window.sessionStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
            return null;
        }

        return parsed.draft;
    } catch {
        return null;
    }
}

export function clearPendingRequestDraft(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.removeItem(REQUEST_DRAFT_STORAGE_KEY);
    } catch {
        // Storage restricted
    }
}
