import { ITEMS } from '../config/items';
import { RECIPES } from '../config/recipes';
import type { Item, Recipe, RecipeItemAmount } from '../types';

const BOTTLE_TOKEN = '*瓶子';
const LIQUID_TOKEN = '*液体';
const FILLED_BOTTLE_TOKEN = '*瓶子(*液体)';
const DYNAMIC_ID_SEPARATOR = '__';

const staticItemsById = new Map(Object.values(ITEMS).map(item => [item.id, item]));

const isBottleWildcard = (entry: RecipeItemAmount) => entry.isWildcard && entry.name === BOTTLE_TOKEN;
const isLiquidWildcard = (entry: RecipeItemAmount) => entry.isWildcard && entry.name === LIQUID_TOKEN;
const isFilledBottleWildcard = (entry: RecipeItemAmount) => entry.isWildcard && entry.name === FILLED_BOTTLE_TOKEN;
const hasWildcard = (recipe: Recipe) => [...recipe.inputs, ...recipe.outputs].some(entry => entry.isWildcard);

export const getBottleItems = (): Item[] =>
    Object.values(ITEMS).filter(item => item.isBottle || item.notes?.includes('瓶子'));

export const getLiquidItems = (): Item[] =>
    Object.values(ITEMS).filter(item => item.state === 'liquid');

export const getFilledBottleItemId = (bottleId: string, liquidId: string) =>
    `${bottleId}${DYNAMIC_ID_SEPARATOR}${liquidId}`;

export const parseFilledBottleItemId = (itemId: string) => {
    const [bottleItemId, liquidItemId, ...rest] = itemId.split(DYNAMIC_ID_SEPARATOR);
    if (!bottleItemId || !liquidItemId || rest.length > 0) return null;
    return { bottleItemId, liquidItemId };
};

export const createFilledBottleItem = (bottle: Item, liquid: Item): Item => ({
    ...bottle,
    id: getFilledBottleItemId(bottle.id, liquid.id),
    name: `${bottle.name}(${liquid.name})`,
    nameEn: bottle.nameEn && liquid.nameEn ? `${bottle.nameEn}(${liquid.nameEn})` : undefined,
    state: 'solid',
    isDynamicFilledBottle: true,
    bottleItemId: bottle.id,
    liquidItemId: liquid.id,
    notes: `动态瓶装液体：${bottle.name} + ${liquid.name}`,
});

export const getFilledBottleItemByName = (name?: string): Item | undefined => {
    if (!name) return undefined;
    const matched = name.match(/^(.+)\((.+)\)$/);
    if (!matched) return undefined;

    const [, bottleName, liquidName] = matched;
    const bottle = getBottleItems().find(item => item.name === bottleName);
    const liquid = getLiquidItems().find(item => item.name === liquidName);
    if (!bottle || !liquid) return undefined;

    return createFilledBottleItem(bottle, liquid);
};

export const getFilledBottleItems = (): Item[] => {
    const bottles = getBottleItems();
    const liquids = getLiquidItems();
    return bottles.flatMap(bottle => liquids.map(liquid => createFilledBottleItem(bottle, liquid)));
};

export const getItemByIdIncludingDynamic = (itemId?: string): Item | undefined => {
    if (!itemId) return undefined;
    const staticItem = staticItemsById.get(itemId);
    if (staticItem) return staticItem;

    const parsed = parseFilledBottleItemId(itemId);
    if (!parsed) return undefined;

    const bottle = staticItemsById.get(parsed.bottleItemId);
    const liquid = staticItemsById.get(parsed.liquidItemId);
    if (!bottle || !liquid) return undefined;

    return createFilledBottleItem(bottle, liquid);
};

const normalizeDynamicEntry = (entry: RecipeItemAmount): RecipeItemAmount => {
    if (entry.materialId) return entry;
    const filledBottle = getFilledBottleItemByName(entry.name);
    return filledBottle ? { ...entry, materialId: filledBottle.id, name: filledBottle.name } : entry;
};

const normalizeDynamicRecipeRefs = (recipe: Recipe): Recipe => ({
    ...recipe,
    inputs: recipe.inputs.map(normalizeDynamicEntry),
    outputs: recipe.outputs.map(normalizeDynamicEntry),
});

const makeAmount = (item: Item, amount = 1): RecipeItemAmount => ({
    materialId: item.id,
    name: item.name,
    amount,
});

const expandFillingRecipe = (recipe: Recipe): Recipe[] => {
    if (!recipe.inputs.some(isBottleWildcard) || !recipe.inputs.some(isLiquidWildcard) || !recipe.outputs.some(isFilledBottleWildcard)) {
        return [];
    }

    return getBottleItems().flatMap(bottle => getLiquidItems().map(liquid => {
        const filledBottle = createFilledBottleItem(bottle, liquid);
        return {
            ...recipe,
            id: `${recipe.id}${DYNAMIC_ID_SEPARATOR}${bottle.id}${DYNAMIC_ID_SEPARATOR}${liquid.id}`,
            name: `${bottle.name} + ${liquid.name} → ${filledBottle.name}`,
            inputs: [makeAmount(bottle), makeAmount(liquid)],
            outputs: [makeAmount(filledBottle)],
        };
    }));
};

const expandSeparatingRecipe = (recipe: Recipe): Recipe[] => {
    if (!recipe.inputs.some(isFilledBottleWildcard) || !recipe.outputs.some(isBottleWildcard) || !recipe.outputs.some(isLiquidWildcard)) {
        return [];
    }

    return getBottleItems().flatMap(bottle => getLiquidItems().map(liquid => {
        const filledBottle = createFilledBottleItem(bottle, liquid);
        return {
            ...recipe,
            id: `${recipe.id}${DYNAMIC_ID_SEPARATOR}${bottle.id}${DYNAMIC_ID_SEPARATOR}${liquid.id}`,
            name: `${filledBottle.name} → ${bottle.name} + ${liquid.name}`,
            inputs: [makeAmount(filledBottle)],
            outputs: [makeAmount(bottle), makeAmount(liquid)],
        };
    }));
};

export const getDynamicBottleLiquidRecipes = (): Recipe[] => {
    const generated = RECIPES.flatMap(recipe => [
        ...expandFillingRecipe(recipe),
        ...expandSeparatingRecipe(recipe),
    ]);

    const unique = new Map<string, Recipe>();
    generated.forEach(recipe => unique.set(recipe.id, recipe));
    return [...unique.values()];
};

export const getAllRecipesIncludingDynamic = (): Recipe[] => {
    const staticRecipes = RECIPES.filter(recipe => !hasWildcard(recipe)).map(normalizeDynamicRecipeRefs);
    const all = [...staticRecipes, ...getDynamicBottleLiquidRecipes()];
    const unique = new Map<string, Recipe>();
    all.forEach(recipe => unique.set(recipe.id, recipe));
    return [...unique.values()];
};

export const getRecipesForFacility = (facilityId: string): Recipe[] =>
    getAllRecipesIncludingDynamic().filter(recipe => recipe.machineId === facilityId);

export const getRecipeOutputItemsForFacility = (facilityId: string): Item[] => {
    const unique = new Map<string, Item>();
    getRecipesForFacility(facilityId).forEach(recipe => {
        recipe.outputs.forEach(output => {
            const item = getItemByIdIncludingDynamic(output.materialId);
            if (item) unique.set(item.id, item);
        });
    });
    return [...unique.values()];
};

const normalizeInputIds = (ids: string[]) => ids.slice().sort().join('|');

export const findMatchingRecipeByInputs = (facilityId: string, inputItemIds: string[]): Recipe | undefined => {
    if (inputItemIds.length === 0) return undefined;
    const inputKey = normalizeInputIds(inputItemIds);

    return getRecipesForFacility(facilityId).find(recipe => {
        if (recipe.inputs.length !== inputItemIds.length || recipe.outputs.length === 0) return false;
        if (recipe.inputs.some(input => !input.materialId)) return false;
        return normalizeInputIds(recipe.inputs.map(input => input.materialId as string)) === inputKey;
    });
};
