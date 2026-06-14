import type { Item, Recipe } from '../types';
import { getItemByIdIncludingDynamic, getRecipesForFacility } from './dynamicRecipes';

export const REACTOR_CRUCIBLE_IDS = new Set(['reactor-crucible', 'expanded-crucible']);

export const getReactorSlotCount = (facilityId: string) =>
    facilityId === 'expanded-crucible' ? 7 : 5;

export const getReactorRecipeLimit = (facilityId: string) =>
    facilityId === 'expanded-crucible' ? 3 : 2;

const canRecipeRun = (recipe: Recipe, knownItemIds: Set<string>) =>
    recipe.inputs.length > 0 &&
    recipe.outputs.length > 0 &&
    recipe.inputs.every(input => input.materialId && knownItemIds.has(input.materialId));

export interface ReactorCrucibleAnalysis {
    knownItems: Item[];
    liquidOutputs: Item[];
    solidOutputs: Item[];
    runnableRecipes: Recipe[];
}

export const analyzeReactorCrucible = (facilityId: string, slotItemIds: string[] = []): ReactorCrucibleAnalysis => {
    const knownItemIds = new Set(slotItemIds.filter(Boolean));
    const recipes = getRecipesForFacility(facilityId).filter(recipe =>
        recipe.inputs.every(input => Boolean(input.materialId)) &&
        recipe.outputs.every(output => Boolean(output.materialId))
    );
    const usedRecipeIds = new Set<string>();
    const runnableRecipes: Recipe[] = [];

    let changed = true;
    while (changed) {
        changed = false;
        for (const recipe of recipes) {
            if (usedRecipeIds.has(recipe.id)) continue;
            if (!canRecipeRun(recipe, knownItemIds)) continue;

            usedRecipeIds.add(recipe.id);
            runnableRecipes.push(recipe);
            recipe.outputs.forEach(output => {
                if (output.materialId && !knownItemIds.has(output.materialId)) {
                    knownItemIds.add(output.materialId);
                    changed = true;
                }
            });
        }
    }

    const knownItems = [...knownItemIds]
        .map(itemId => getItemByIdIncludingDynamic(itemId))
        .filter((item): item is Item => Boolean(item))
        .sort((a, b) => (a.state === b.state ? 0 : a.state === 'liquid' ? -1 : 1) || a.name.localeCompare(b.name));

    return {
        knownItems,
        liquidOutputs: knownItems.filter(item => item.state === 'liquid'),
        solidOutputs: knownItems.filter(item => item.state !== 'liquid'),
        runnableRecipes,
    };
};
