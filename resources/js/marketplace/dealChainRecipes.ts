import type { AttachedDealChain } from './types';

export const DEAL_CHAIN_RECIPES: Record<string, AttachedDealChain> = {
    turnkey_parts: {
        recipeId: 'turnkey_parts',
        title: 'Turnkey Sourced Parts',
        extraFee: 215,
        nodes: [
            { role: 'STORE', title: 'Tagudin HW', sub: '₱180', type: 'store' },
            { role: 'COURIER', title: 'Danny Exp', sub: '₱35', type: 'delivery' },
            { role: 'LABOR', title: 'Kuya Ben AC', sub: 'On-Site', type: 'labor' },
        ],
    },
    courier_delivery: {
        recipeId: 'courier_delivery',
        title: 'Doorstep Courier Delivery',
        extraFee: 35,
        nodes: [
            { role: 'STALL', title: 'Market Stall', sub: 'Ready', type: 'store' },
            { role: 'COURIER', title: 'Danny Exp', sub: '₱35', type: 'delivery' },
            { role: 'CUSTOMER', title: 'Home Drop', sub: 'Delivered', type: 'labor' },
        ],
    },
    safety_audit: {
        recipeId: 'safety_audit',
        title: 'Post-Service Safety Audit',
        extraFee: 150,
        nodes: [
            { role: 'LABOR', title: 'Provider Labor', sub: 'Verified', type: 'labor' },
            { role: 'AUDITOR', title: 'Safety Check', sub: '₱150', type: 'audit' },
        ],
    },
};
