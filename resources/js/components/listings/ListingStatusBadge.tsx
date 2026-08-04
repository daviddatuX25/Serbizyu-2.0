import type { BadgeTone } from '../ui';
import { Badge } from '../ui';
import type { ListingLifecycle } from '../../types';

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending review',
    active: 'Active',
    paused: 'Paused',
    rejected: 'Rejected',
    unavailable: 'Unavailable',
    expired: 'Expired',
    archived: 'Archived',
};

function toneForStatus(status: string): BadgeTone {
    switch (status) {
        case 'active':
            return 'success';
        case 'pending_review':
        case 'paused':
            return 'warning';
        case 'rejected':
            return 'danger';
        case 'draft':
            return 'info';
        default:
            return 'neutral';
    }
}

export function normalizeListingStatus(status?: ListingLifecycle | null): string {
    return String(status ?? 'draft')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

export function listingStatusLabel(status?: ListingLifecycle | null): string {
    const key = normalizeListingStatus(status);

    return STATUS_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function ListingStatusBadge({
    status,
    version,
    className = '',
}: {
    status?: ListingLifecycle | null;
    version?: number | null;
    className?: string;
}) {
    const key = normalizeListingStatus(status);
    const label = listingStatusLabel(key);

    return (
        <Badge tone={toneForStatus(key)} className={className}>
            {version != null ? `${label} · v${version}` : label}
        </Badge>
    );
}
