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

export const getNonLiquidItems = (): Item[] =>
    Object.values(ITEMS).filter(item => item.state !== 'liquid');

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

export const getManualSelectableItemsForFacility = (facilityId: string): Item[] => {
    if (facilityId === 'fluid-tank') return getLiquidItems();
    if (facilityId === 'fluid-pump' || facilityId === 'acid-resistant-pump-mk-ii') return getRecipeOutputItemsForFacility(facilityId).filter(item => item.state === 'liquid');
    if (canFacilityRunMultipleRecipes(facilityId)) {
        const unique = new Map<string, Item>();
        getRecipesForFacility(facilityId).forEach(recipe => {
            [...recipe.inputs, ...recipe.outputs].forEach(entry => {
                const item = getItemByIdIncludingDynamic(entry.materialId);
                if (item?.state === 'liquid') unique.set(item.id, item);
            });
        });
        return [...unique.values()];
    }
    if (facilityId === 'automation-core' || facilityId === 'depot-unloader') {
        const unique = new Map<string, Item>();
        [...getNonLiquidItems(), ...getFilledBottleItems()].forEach(item => unique.set(item.id, item));
        return [...unique.values()];
    }
    return [];
};

export const canFacilityManuallySelectOutput = (facilityId: string) =>
    facilityId === 'automation-core' || facilityId === 'depot-unloader' || facilityId === 'fluid-tank' || facilityId === 'fluid-pump' || facilityId === 'acid-resistant-pump-mk-ii' || canFacilityRunMultipleRecipes(facilityId);

export const canFacilityManuallySelectRecipe = (facilityId: string) =>
    facilityId === 'seed-picking-unit';

const outputPriority = (item: Item, preferLiquid: boolean) => {
    const wasteRank: Record<string, number> = {
        xircon_effluent: preferLiquid ? 2 : 3,
        inert_xirconn_effluent: preferLiquid ? 3 : 4,
        sewage: preferLiquid ? 4 : 5,
    };
    if (item.id in wasteRank) return wasteRank[item.id];
    if (preferLiquid) return item.state === 'liquid' ? 1 : 6;
    return item.state !== 'liquid' ? 1 : 2;
};

export const getPreferredRecipeOutput = (recipe: Recipe): Item | undefined => {
    const preferLiquid = recipe.machineId === 'separating-unit';
    return recipe.outputs
        .map(output => getItemByIdIncludingDynamic(output.materialId))
        .filter((item): item is Item => Boolean(item))
        .sort((a, b) => outputPriority(a, preferLiquid) - outputPriority(b, preferLiquid))[0];
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

export const findSatisfiedRecipesByInputs = (facilityId: string, inputItemIds: string[]): Recipe[] => {
    if (inputItemIds.length === 0) return [];
    const inputSet = new Set(inputItemIds);

    return getRecipesForFacility(facilityId).filter(recipe => {
        if (recipe.inputs.length === 0 || recipe.outputs.length === 0) return false;
        if (recipe.inputs.some(input => !input.materialId)) return false;
        return recipe.inputs.every(input => inputSet.has(input.materialId as string));
    });
};

export const canFacilityRunMultipleRecipes = (facilityId: string) =>
    facilityId === 'reactor-crucible' || facilityId === 'expanded-crucible';
