import type { BasketItem, SavedDealChainPreview } from './types';

export function normalizeSavedDealChainPreview(
    raw: unknown,
    listingVersionId: string | null | undefined,
): SavedDealChainPreview | null {
    if (!raw || typeof raw !== 'object' || !listingVersionId) return null;
    const value = raw as Record<string, unknown>;
    if (value.planVersion !== 1 || typeof value.id !== 'string' || typeof value.title !== 'string'
        || !Array.isArray(value.nodes) || !Array.isArray(value.dependencies)) return null;
    const sourceNodes = value.nodes.filter((node): node is Record<string, unknown> => typeof node === 'object' && node !== null && !Array.isArray(node));
    const nodeIds = new Set(sourceNodes.map((node) => node.id));
    if (sourceNodes.length !== value.nodes.length
        || sourceNodes.some((node) => typeof node.id !== 'string' || !node.id || typeof node.isPrimary !== 'boolean'
            || !['store', 'parts', 'product', 'delivery', 'courier', 'audit', 'labor', 'service', 'installation', 'hauling', 'diagnostic', 'tools', 'recycle'].includes(String(node.type)))
        || nodeIds.size !== sourceNodes.length
        || sourceNodes.filter((node) => node.isPrimary === true).length !== 1
        || value.dependencies.some((edge) => !edge || typeof edge !== 'object'
            || ((edge as Record<string, unknown>).status !== 'removed' && (
                !nodeIds.has((edge as Record<string, unknown>).predecessorId)
                || !nodeIds.has((edge as Record<string, unknown>).successorId)
                || (edge as Record<string, unknown>).dependencyType !== 'blocks'
                || ((edge as Record<string, unknown>).status !== undefined && (edge as Record<string, unknown>).status !== 'active')
                || !['part_ready', 'delivery_signed', 'work_completed'].includes(String((edge as Record<string, unknown>).conditionCode)))))) return null;
    const nodes = sourceNodes.map((node) => {
        const rawType = String(node.type);
        const type = ['store', 'parts', 'product'].includes(rawType) ? 'store'
            : ['delivery', 'courier'].includes(rawType) ? 'delivery'
                : rawType === 'audit' ? 'audit'
                    : ['recycle', 'hauling'].includes(rawType) ? 'recycle' : 'labor';
        const requiresChoice = node.isOpenSlot === true
            || node.assignmentMode === 'buyer_choice' || node.assignmentMode === 'open_pool';
        return {
            key: String(node.id),
            id: String(node.id),
            role: typeof node.role === 'string' ? node.role : 'Partner',
            title: typeof node.title === 'string' ? node.title : 'Partner role',
            sub: requiresChoice ? 'Choose a provider' : 'Provider agreement required',
            type: type as 'store' | 'delivery' | 'labor' | 'audit' | 'recycle',
            listingId: !requiresChoice && typeof node.listingId === 'string' ? node.listingId : undefined,
            listingVersionId: !requiresChoice && typeof (node.listingVersionId ?? node.listing_version_id) === 'string'
                ? String(node.listingVersionId ?? node.listing_version_id)
                : undefined,
            isPrimary: node.isPrimary === true,
        };
    });
    if (nodes.length === 0) return null;
    return {
        combinationId: value.id,
        listingVersionId,
        title: value.title,
        nodes,
        dependencies: value.dependencies
            .filter((edge) => edge.status !== 'removed')
            .map((edge) => ({
                predecessorId: String(edge.predecessorId),
                successorId: String(edge.successorId),
                conditionCode: String(edge.conditionCode),
                dependencyType: 'blocks',
                status: 'active',
            })),
    };
}

export function hasCoordination(item: BasketItem): boolean {
    return Boolean(item.savedDealChain || item.deal_chain_combination_id || item.dealChain);
}

export function serializeDealChainStageItem(item: BasketItem) {
    const saved = item.savedDealChain;
    const savedSelected = Boolean(item.deal_chain_combination_id);
    const exactSavedPreview = savedSelected && saved
        && saved.combinationId === item.deal_chain_combination_id
        && saved.listingVersionId === item.listing_version_id;
    return {
        id: item.listing_id,
        listing_version_id: item.listing_version_id,
        variant_id: item.variant_id,
        package_id: item.package_id,
        deal_chain_combination_id: item.deal_chain_combination_id ?? null,
        quantity: item.quantity,
        addon_ids: item.addon_ids ?? [],
        deal_chain: savedSelected ? null : item.dealChain?.recipeId || null,
        slot_overrides: exactSavedPreview
            ? saved.nodes.filter((node) => !node.isPrimary && node.listingId).reduce<Record<string, { listing_id: string; listing_version_id?: string }>>(
                (overrides, node) => {
                    overrides[node.key] = {
                        listing_id: node.listingId!,
                        ...(node.listingVersionId ? { listing_version_id: node.listingVersionId } : {}),
                    };
                    return overrides;
                }, {},
            )
            : !savedSelected && item.dealChain?.nodes
                ? Object.fromEntries(item.dealChain.nodes.filter((node) => node.listingId).map((node) => [node.key, {
                    listing_id: node.listingId!,
                    ...(node.listingVersionId ? { listing_version_id: node.listingVersionId } : {}),
                }]))
                : null,
    };
}
export function hasValidSavedDealChainPreview(item: BasketItem): boolean {
    const preview = item.savedDealChain;
    if (!preview
        || preview.combinationId !== item.deal_chain_combination_id
        || preview.listingVersionId !== item.listing_version_id
        || !item.listing_id
        || !Array.isArray(preview.nodes)
        || preview.nodes.length === 0
        || !Array.isArray(preview.dependencies)
        || preview.nodes.filter((node) => node.isPrimary === true).length !== 1) return false;
    const ids = preview.nodes.map((node) => node.id);
    return ids.every((id): id is string => typeof id === 'string' && id.length > 0)
        && new Set(ids).size === ids.length
        && preview.nodes.every((node) => ['store', 'delivery', 'labor', 'audit', 'recycle'].includes(node.type));
}

const PICKS_STORAGE_SCHEMA_VERSION = '2';
const LEGACY_LISTING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readPicksBasket(storage: Storage): BasketItem[] {
    const serialized = storage.getItem('serbizyu.picks');
    if (!serialized) return [];

    const decoded: unknown = JSON.parse(serialized);
    if (!Array.isArray(decoded)) return [];
    const entries = decoded.filter((entry): entry is BasketItem =>
        typeof entry === 'object' && entry !== null && 'id' in entry && typeof entry.id === 'string',
    );

    if (storage.getItem('serbizyu.picks.schema') === PICKS_STORAGE_SCHEMA_VERSION) {
        return entries;
    }

    const migrated = entries.map((entry) => {
        if (typeof entry.listing_id === 'string' || !LEGACY_LISTING_UUID.test(entry.id)) {
            return entry;
        }

        return { ...entry, listing_id: entry.id };
    });
    savePicksBasket(storage, migrated);

    return migrated;
}

export function savePicksBasket(storage: Storage, items: BasketItem[]): void {
    storage.setItem('serbizyu.picks', JSON.stringify(items));
    storage.setItem('serbizyu.picks.schema', PICKS_STORAGE_SCHEMA_VERSION);
}

/** Resolve a Picks item to a booking endpoint without interpreting its display key as a listing id. */
export function listingBookingUrl(item: BasketItem, origin: string): string | null {
    if (!item.listing_id) return null;

    if (item.listing_type === 'product' && !item.variant_id && !item.package_id) {
        return `/listings/${encodeURIComponent(item.listing_id)}`;
    }

    const url = new URL(`/listings/${encodeURIComponent(item.listing_id)}/book`, origin);
    if (item.variant_id) url.searchParams.set('variant_id', item.variant_id);
    if (item.package_id) url.searchParams.set('package_id', item.package_id);
    url.searchParams.set('quantity', String(item.quantity));
    if (item.listing_version_id) url.searchParams.set('listing_version_id', item.listing_version_id);
    for (const addonId of item.addon_ids ?? []) {
        url.searchParams.append('addon_ids[]', addonId);
    }
    if (item.deal_chain_combination_id) {
        url.searchParams.set('deal_chain_combination_id', item.deal_chain_combination_id);
    }

    return `${url.pathname}${url.search}`;
}
