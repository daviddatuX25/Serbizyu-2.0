import { describe, it, expect } from 'vitest';
import {
    indexDealChainRecipes,
    getRecipesForCategory,
    isRecipeCompatible,
    CANONICAL_DEAL_CHAIN_RECIPES,
    type DealChainRecipeDefinition,
} from './dealChainRecipes';

describe('dealChainRecipes eligibility and truth', () => {
    const sampleRecipes: DealChainRecipeDefinition[] = [
        CANONICAL_DEAL_CHAIN_RECIPES.turnkey_parts,
        CANONICAL_DEAL_CHAIN_RECIPES.courier_delivery,
        CANONICAL_DEAL_CHAIN_RECIPES.product_install,
        CANONICAL_DEAL_CHAIN_RECIPES.safety_audit,
    ];

    it('indexDealChainRecipes returns empty object when passed empty array or undefined without falling back', () => {
        expect(indexDealChainRecipes([])).toEqual({});
        expect(indexDealChainRecipes(undefined)).toEqual({});
    });

    it('getRecipesForCategory returns empty array when recipes array is empty', () => {
        expect(getRecipesForCategory('local-food', 'product', 'A4', [])).toEqual([]);
        expect(getRecipesForCategory(null, null, null, [])).toEqual([]);
    });

    it('applies listingType and workShape even when categoryCode is missing or all', () => {
        // When category is missing, only recipes compatible with 'service' and 'A1' should be returned
        const serviceA1 = getRecipesForCategory(null, 'service', 'A1', sampleRecipes);
        expect(serviceA1.some((r) => r.recipeId === 'turnkey_parts')).toBe(true);
        expect(serviceA1.some((r) => r.recipeId === 'safety_audit')).toBe(true);
        expect(serviceA1.some((r) => r.recipeId === 'courier_delivery')).toBe(false);
        expect(serviceA1.some((r) => r.recipeId === 'product_install')).toBe(false);

        // When category is 'all', listingType filter must still be strictly applied
        const productA4 = getRecipesForCategory('all', 'product', 'A4', sampleRecipes);
        expect(productA4.some((r) => r.recipeId === 'courier_delivery')).toBe(true);
        expect(productA4.some((r) => r.recipeId === 'product_install')).toBe(true);
        expect(productA4.some((r) => r.recipeId === 'turnkey_parts')).toBe(false);
        expect(productA4.some((r) => r.recipeId === 'safety_audit')).toBe(false);
    });

    it('allows courier_delivery for physical product handoff (product + A4)', () => {
        expect(
            isRecipeCompatible(
                CANONICAL_DEAL_CHAIN_RECIPES.courier_delivery,
                'local-food',
                'product',
                'A4',
            ),
        ).toBe(true);

        expect(
            isRecipeCompatible(
                CANONICAL_DEAL_CHAIN_RECIPES.courier_delivery,
                'repairs',
                'product',
                'A4',
            ),
        ).toBe(true);
    });

    it('denies courier_delivery for service listings even if persisted metadata was broad', () => {
        const broadOldRecipe: DealChainRecipeDefinition = {
            ...CANONICAL_DEAL_CHAIN_RECIPES.courier_delivery,
            applicableListingTypes: ['service', 'product'],
            applicableWorkShapes: ['A1', 'A4'],
            applicableCategories: ['repairs', 'home-help', 'local-food'],
        };

        // Service listing type is denied
        expect(isRecipeCompatible(broadOldRecipe, 'repairs', 'service', 'A1')).toBe(false);
        expect(isRecipeCompatible(broadOldRecipe, null, 'service', null)).toBe(false);

        // Non-A4 work shape is denied
        expect(isRecipeCompatible(broadOldRecipe, 'local-food', 'product', 'A1')).toBe(false);

        // On-site / home-help categories are denied
        expect(isRecipeCompatible(broadOldRecipe, 'home-help', 'product', 'A4')).toBe(false);
    });
    it('preserves explicit primary anchors and canonical edge contracts through indexing', () => {
        const serverRecipe: DealChainRecipeDefinition = {
            ...CANONICAL_DEAL_CHAIN_RECIPES.turnkey_parts,
            nodes: CANONICAL_DEAL_CHAIN_RECIPES.turnkey_parts.nodes.map((node) => ({
                ...node,
                isPrimary: node.key === 'labor',
            })),
            dependencies: CANONICAL_DEAL_CHAIN_RECIPES.turnkey_parts.dependencies,
        };
        const indexed = indexDealChainRecipes([serverRecipe]).turnkey_parts;
        expect(indexed.nodes.find((node) => node.isPrimary)?.key).toBe('labor');
        expect(indexed.dependencies).toEqual(serverRecipe.dependencies);
        expect(Object.values(CANONICAL_DEAL_CHAIN_RECIPES).every((recipe) =>
            recipe.nodes.filter((node) => node.isPrimary === true).length === 1
            && (recipe.dependencies ?? []).every((edge) =>
                ['part_ready', 'delivery_signed', 'work_completed'].includes(edge.conditionCode)
                && edge.dependencyType === 'blocks'
                && recipe.nodes.some((node) => `node-${node.key}` === edge.predecessorId)
                && recipe.nodes.some((node) => `node-${node.key}` === edge.successorId),
            ),
        )).toBe(true);
    });
});
