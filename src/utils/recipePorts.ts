import type { Item, PortKind, Recipe, RecipeItemAmount } from '../types';
import { getItemByIdIncludingDynamic, getRecipesForFacility } from './dynamicRecipes';

export interface RecipePortSlot {
    kind: PortKind;
    item?: Item;
}

const itemStateToPortKind = (item?: Item): PortKind => item?.state === 'liquid' ? 'pipe' : 'item';

const entryToSlot = (entry: RecipeItemAmount): RecipePortSlot => {
    const item = getItemByIdIncludingDynamic(entry.materialId);
    return { kind: itemStateToPortKind(item), item };
};

const entriesToTypedSlots = (entries: RecipeItemAmount[]): RecipePortSlot[] => {
    const itemSlots = entries.map(entryToSlot).filter(slot => slot.kind === 'item');
    const pipeSlots = entries.map(entryToSlot).filter(slot => slot.kind === 'pipe');
    return [...itemSlots, ...pipeSlots];
};

const getMaxSlotsByKind = (recipes: Recipe[], side: 'inputs' | 'outputs') => recipes.reduce(
    (max, recipe) => {
        const counts = recipe[side].reduce(
            (acc, entry) => {
                const item = getItemByIdIncludingDynamic(entry.materialId);
                acc[itemStateToPortKind(item)] += 1;
                return acc;
            },
            { item: 0, pipe: 0 }
        );
        return {
            item: Math.max(max.item, counts.item),
            pipe: Math.max(max.pipe, counts.pipe),
        };
    },
    { item: 0, pipe: 0 }
);

export const getRecipePortSlotsForFacility = (
    facilityId: string,
    side: 'inputs' | 'outputs',
    currentRecipe?: Recipe
): RecipePortSlot[] => {
    if (facilityId === 'automation-core') return [];

    const recipes = getRecipesForFacility(facilityId);
    if (recipes.length === 0) return [];

    const max = getMaxSlotsByKind(recipes, side);
    const currentSlots = currentRecipe ? entriesToTypedSlots(currentRecipe[side]) : [];
    const currentCounts = currentSlots.reduce(
        (acc, slot) => {
            acc[slot.kind] += 1;
            return acc;
        },
        { item: 0, pipe: 0 }
    );

    return [
        ...currentSlots,
        ...Array.from({ length: Math.max(0, max.item - currentCounts.item) }, () => ({ kind: 'item' as const })),
        ...Array.from({ length: Math.max(0, max.pipe - currentCounts.pipe) }, () => ({ kind: 'pipe' as const })),
    ];
};

export const getRecipeItemsByKind = (recipe: Recipe | undefined, side: 'inputs' | 'outputs', kind: PortKind): Item[] => {
    if (!recipe) return [];
    return recipe[side]
        .map(entry => getItemByIdIncludingDynamic(entry.materialId))
        .filter((item): item is Item => Boolean(item))
        .filter(item => itemStateToPortKind(item) === kind);
};

export const getRecipeOutputsByKind = (recipe: Recipe | undefined, kind: PortKind): Item[] => {
    if (!recipe) return [];
    return recipe.outputs
        .map(output => getItemByIdIncludingDynamic(output.materialId))
        .filter((item): item is Item => Boolean(item))
        .filter(item => itemStateToPortKind(item) === kind);
};

export const getFirstRecipeOutputForConnectionKind = (recipe: Recipe | undefined, kind: 'belt' | 'pipe') =>
    getRecipeOutputsByKind(recipe, kind === 'pipe' ? 'pipe' : 'item')[0];
