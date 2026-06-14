import { FACILITIES } from '../config/facilities';
import type { Connection, Item, PlacedMachine, Recipe } from '../types';
import { getAllRecipesIncludingDynamic, getItemByIdIncludingDynamic, getPreferredRecipeOutput, parseFilledBottleItemId } from '../utils/dynamicRecipes';
import type { AutoPlannerSettings } from '../store/autoPlannerSettingsStore';
import { createMainWarehouseSnapshot, isWarehouseAvailable, type MainWarehouseSnapshot } from './mainWarehouse';

export interface AutoPlannerTarget {
    itemId: string;
    ratePerMinute: number;
}

export interface ProductionNode {
    id: string;
    itemId: string;
    recipe: Recipe;
    demandRate: number;
    facilityCount: number;
    depth: number;
    inputRates: Array<{ itemId: string; ratePerMinute: number }>;
}

export interface ProductionGraph {
    targets: AutoPlannerTarget[];
    nodes: ProductionNode[];
    sourceDemands: Map<string, number>;
    cycleSourceDemands: Map<string, number>;
    producedRates: Map<string, number>;
    facilityUsage: Map<string, number>;
    warehouse: MainWarehouseSnapshot;
    warnings: string[];
}

export interface PlantCycleRecipes {
    requestedItemId: string;
    plantItemId: string;
    seedItemId: string;
    plantingRecipe: Recipe;
    seedRecipe: Recipe;
}

const recipes = getAllRecipesIncludingDynamic();

const itemLabel = (itemId: string) => {
    const item = getItemByIdIncludingDynamic(itemId);
    return item?.name || item?.nameEn || itemId;
};

const recipeOutputRate = (recipe: Recipe, itemId: string) => {
    const output = recipe.outputs.find(candidate => candidate.materialId === itemId);
    if (!output || recipe.durationSeconds <= 0) return 0;
    return output.amount * 60 / recipe.durationSeconds;
};

const recipeDependsOnItem = (recipe: Recipe, itemId: string) =>
    recipe.inputs.some(input => {
        if (input.materialId === itemId) return true;
        if (!input.materialId) return false;
        const parsed = parseFilledBottleItemId(input.materialId);
        return parsed?.bottleItemId === itemId || parsed?.liquidItemId === itemId;
    });

const getRecipeCandidatesForItem = (itemId: string) =>
    recipes
        .filter(recipe => recipe.machineId !== 'separating-unit')
        .filter(recipe => recipe.outputs.some(output => output.materialId === itemId))
        .sort((a, b) => {
            const aDependsOnTarget = recipeDependsOnItem(a, itemId) ? 1 : 0;
            const bDependsOnTarget = recipeDependsOnItem(b, itemId) ? 1 : 0;
            if (aDependsOnTarget !== bDependsOnTarget) return aDependsOnTarget - bDependsOnTarget;

            const aMissingInputs = a.inputs.filter(input => !input.materialId).length;
            const bMissingInputs = b.inputs.filter(input => !input.materialId).length;
            if (aMissingInputs !== bMissingInputs) return aMissingInputs - bMissingInputs;

            const aDynamicSeparating = a.machineId === 'separating-unit' && a.id.includes('__') ? 1 : 0;
            const bDynamicSeparating = b.machineId === 'separating-unit' && b.id.includes('__') ? 1 : 0;
            return aDynamicSeparating - bDynamicSeparating;
        });

const canTreatAsNaturalLoopSource = (item?: Item) =>
    Boolean(item?.itemCategory === 'natural_resource' && item.isRecyclable);

export const findPlantCycleRecipes = (itemId: string): PlantCycleRecipes | null => {
    const seedRecipe = recipes.find(recipe =>
        recipe.machineId === 'seed-picking-unit' &&
        recipe.inputs.length === 1 &&
        recipe.inputs[0].materialId &&
        recipe.outputs.some(output => output.materialId === itemId)
    );
    if (seedRecipe) {
        const plantItemId = seedRecipe.inputs[0].materialId as string;
        const plantingRecipe = recipes.find(recipe =>
            recipe.machineId === 'planting-unit' &&
            recipe.inputs.some(input => input.materialId === itemId) &&
            recipe.outputs.some(output => output.materialId === plantItemId)
        );
        return plantingRecipe ? { requestedItemId: itemId, plantItemId, seedItemId: itemId, plantingRecipe, seedRecipe } : null;
    }

    const plantingRecipe = recipes.find(recipe =>
        recipe.machineId === 'planting-unit' &&
        recipe.outputs.some(output => output.materialId === itemId) &&
        recipe.inputs.some(input => input.materialId)
    );
    const seedItemId = plantingRecipe?.inputs.find(input => {
        const inputItem = getItemByIdIncludingDynamic(input.materialId);
        return inputItem?.isRecyclable;
    })?.materialId;
    if (!plantingRecipe || !seedItemId) return null;

    const matchingSeedRecipe = recipes.find(recipe =>
        recipe.machineId === 'seed-picking-unit' &&
        recipe.inputs.some(input => input.materialId === itemId) &&
        recipe.outputs.some(output => output.materialId === seedItemId)
    );

    return matchingSeedRecipe
        ? { requestedItemId: itemId, plantItemId: itemId, seedItemId, plantingRecipe, seedRecipe: matchingSeedRecipe }
        : null;
};

export const resolveProductionGraph = (
    targets: AutoPlannerTarget[],
    settings: AutoPlannerSettings,
    machines: PlacedMachine[] = [],
    connections: Connection[] = []
): { ok: true; graph: ProductionGraph } | { ok: false; error: string } => {
    const warehouse = createMainWarehouseSnapshot(settings, machines, connections);
    const nodes: ProductionNode[] = [];
    const sourceDemands = new Map<string, number>();
    const cycleSourceDemands = new Map<string, number>();
    const producedRates = new Map<string, number>();
    const facilityUsage = new Map<string, number>();
    const nodeByItem = new Map<string, ProductionNode>();
    const warnings: string[] = [];

    const addSourceDemand = (itemId: string, rate: number) => {
        sourceDemands.set(itemId, (sourceDemands.get(itemId) || 0) + rate);
    };

    const addCycleSourceDemand = (itemId: string, rate: number) => {
        cycleSourceDemands.set(itemId, (cycleSourceDemands.get(itemId) || 0) + rate);
    };

    const resolveItem = (itemId: string, demandRate: number, depth: number, stack: string[]): string | null => {
        if (demandRate <= 0) return null;
        const item = getItemByIdIncludingDynamic(itemId);
        if (!item) return `自动规划失败：找不到物品 ${itemId}。`;

        if (isWarehouseAvailable(warehouse, itemId)) {
            addSourceDemand(itemId, demandRate);
            const limit = warehouse.sourceRates.get(itemId);
            if (limit !== undefined && demandRate > limit) {
                return `自动规划失败：${itemLabel(itemId)} 需要 ${demandRate.toFixed(2)}/分钟，但当前资源产量为 ${limit}/分钟。`;
            }
            return null;
        }

        if (canTreatAsNaturalLoopSource(item)) {
            const cycle = findPlantCycleRecipes(itemId);
            if (!cycle) {
                return `自动规划失败：${itemLabel(itemId)} 是可循环资源，但找不到匹配的采种机/种植机配方。`;
            }

            addCycleSourceDemand(itemId, demandRate);
            producedRates.set(itemId, (producedRates.get(itemId) || 0) + demandRate);
            facilityUsage.set('seed-picking-unit', (facilityUsage.get('seed-picking-unit') || 0) + 1);
            facilityUsage.set('planting-unit', (facilityUsage.get('planting-unit') || 0) + 1);

            const plantOutput = cycle.plantingRecipe.outputs.find(output => output.materialId === cycle.plantItemId);
            const plantOutputAmount = plantOutput?.amount || 1;
            const extraInputs = cycle.plantingRecipe.inputs.filter(input =>
                input.materialId &&
                input.materialId !== cycle.seedItemId &&
                input.materialId !== cycle.plantItemId
            );
            for (const input of extraInputs) {
                const error = resolveItem(input.materialId as string, demandRate * input.amount / plantOutputAmount, depth + 1, [...stack, itemId]);
                if (error) return error;
            }

            warnings.push(`${itemLabel(itemId)} 将通过采种机 + 种植机自循环启动，不作为默认仓库资源。`);
            return null;
        }

        if (stack.includes(itemId)) {
            return `自动规划失败：配方链出现循环：${[...stack, itemId].map(itemLabel).join(' -> ')}。`;
        }

        const candidates = getRecipeCandidatesForItem(itemId).filter(candidate => !recipeDependsOnItem(candidate, itemId));
        const recipe = candidates[0];
        if (!recipe && getRecipeCandidatesForItem(itemId).length > 0) {
            return `自动规划失败：${itemLabel(itemId)} 的候选配方会依赖自身或动态装瓶拆瓶循环，无法作为生产起点。`;
        }
        if (!recipe) {
            return `自动规划失败：${itemLabel(itemId)} 没有可用来源或生产配方。`;
        }

        const facility = FACILITIES.find(candidate => candidate.id === recipe.machineId);
        if (!facility) {
            return `自动规划失败：配方 ${recipe.name} 使用的设施 ${recipe.machineId} 不存在。`;
        }

        const outputRate = recipeOutputRate(recipe, itemId);
        if (outputRate <= 0) {
            return `自动规划失败：配方 ${recipe.name} 无法计算 ${itemLabel(itemId)} 的产出速度。`;
        }

        const recipeOutput = recipe.outputs.find(output => output.materialId === itemId);
        const outputAmount = recipeOutput?.amount || 1;
        const missingMaterialInput = recipe.inputs.find(input => !input.materialId);
        if (missingMaterialInput) {
            return `自动规划失败：${itemLabel(itemId)} 的配方“${recipe.name}”存在未映射原料“${missingMaterialInput.name || '未知原料'}”，无法继续展开生产链。`;
        }
        const inputRates = recipe.inputs
            .filter(input => input.materialId)
            .map(input => ({
                itemId: input.materialId as string,
                ratePerMinute: demandRate * input.amount / outputAmount,
            }));

        const existingNode = nodeByItem.get(itemId);
        if (existingNode && existingNode.recipe.id === recipe.id) {
            const previousCount = existingNode.facilityCount;
            existingNode.demandRate += demandRate;
            existingNode.facilityCount = Math.max(1, Math.ceil(existingNode.demandRate / outputRate));
            existingNode.inputRates = recipe.inputs
                .filter(input => input.materialId)
                .map(input => ({
                    itemId: input.materialId as string,
                    ratePerMinute: existingNode.demandRate * input.amount / outputAmount,
                }));
            facilityUsage.set(recipe.machineId, (facilityUsage.get(recipe.machineId) || 0) + existingNode.facilityCount - previousCount);
            producedRates.set(itemId, (producedRates.get(itemId) || 0) + demandRate);

            for (const input of inputRates) {
                const error = resolveItem(input.itemId, input.ratePerMinute, depth + 1, [...stack, itemId]);
                if (error) return error;
            }
            return null;
        }

        const facilityCount = Math.max(1, Math.ceil(demandRate / outputRate));
        facilityUsage.set(recipe.machineId, (facilityUsage.get(recipe.machineId) || 0) + facilityCount);
        producedRates.set(itemId, (producedRates.get(itemId) || 0) + demandRate);

        const nodeId = `${recipe.id}:${itemId}:${nodes.length}`;
        const node: ProductionNode = {
            id: nodeId,
            itemId,
            recipe,
            demandRate,
            facilityCount,
            depth,
            inputRates,
        };
        nodes.push(node);
        nodeByItem.set(itemId, node);

        for (const input of inputRates) {
            const error = resolveItem(input.itemId, input.ratePerMinute, depth + 1, [...stack, itemId]);
            if (error) return error;
        }

        return null;
    };

    for (const target of targets) {
        const error = resolveItem(target.itemId, target.ratePerMinute || 1, 0, []);
        if (error) return { ok: false, error };
    }

    for (const [facilityId, used] of facilityUsage) {
        const configuredLimit = settings.facilityLimits[facilityId as keyof typeof settings.facilityLimits];
        if (configuredLimit !== undefined && used > configuredLimit) {
            const facility = FACILITIES.find(candidate => candidate.id === facilityId);
            return {
                ok: false,
                error: `自动规划失败：${facility?.name || facilityId} 需要 ${used} 个，但当前限制为 ${configuredLimit} 个。`,
            };
        }
    }

    const preferredOutputWarnings = nodes
        .filter(node => getPreferredRecipeOutput(node.recipe)?.id !== node.itemId)
        .map(node => `${node.recipe.name} 有多个产物，本次按 ${itemLabel(node.itemId)} 作为目标产物连接。`);

    return {
        ok: true,
        graph: {
            targets,
            nodes,
            sourceDemands,
            cycleSourceDemands,
            producedRates,
            facilityUsage,
            warehouse,
            warnings: [...new Set([...warnings, ...preferredOutputWarnings])],
        },
    };
};

export const getItemLabel = itemLabel;
