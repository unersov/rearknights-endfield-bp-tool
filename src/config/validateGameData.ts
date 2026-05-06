import { FACILITIES } from './facilities';
import { ITEMS } from './items';
import { RECIPES } from './recipes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const collectDuplicateValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

export const validateGameData = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const itemList = Object.values(ITEMS);

  for (const id of collectDuplicateValues(itemList.map(item => item.id))) errors.push(`[Item] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(FACILITIES.map(facility => facility.id))) errors.push(`[Facility] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(RECIPES.map(r => r.id))) errors.push(`[Recipe] Duplicate id: ${id}`);

  for (const name of collectDuplicateValues(itemList.map(item => item.name).filter(Boolean))) warnings.push(`[Item] Duplicate name: ${name}`);
  for (const name of collectDuplicateValues(itemList.map(item => item.nameEn ?? '').filter(Boolean))) warnings.push(`[Item] Duplicate English name: ${name}`);

  const validItem = new Set(['natural_resource', 'gatherable', 'rare_material', 'aic_product', 'usable_item', 'functional_item', 'unknown']);
  const validStorage = new Set(['minerals', 'plants', 'products', 'gatherables', 'progression', 'usables', 'production', 'none', 'unknown']);
  const validRarity = new Set(['gray', 'green', 'blue', 'purple', 'gold', 'orange', 'unknown']);

  itemList.forEach(item => {
    if (!item.name) errors.push(`[Item:${item.id}] Missing name`);
    if (!item.nameEn) warnings.push(`[Item:${item.id}] Missing English name`);
    if (item.itemCategory && !validItem.has(item.itemCategory)) warnings.push(`[Item:${item.id}] Unknown itemCategory: ${item.itemCategory}`);
    if (item.storageCategory && !validStorage.has(item.storageCategory)) warnings.push(`[Item:${item.id}] Unknown storageCategory: ${item.storageCategory}`);
    if (item.rarity && !validRarity.has(item.rarity)) warnings.push(`[Item:${item.id}] Unknown rarity: ${item.rarity}`);
    if (item.state === 'solid' && (!item.storageCategory || item.storageCategory === 'unknown')) warnings.push(`[Item:${item.id}] Solid item has no storage category`);
    if (item.isBottle && item.state === 'liquid') warnings.push(`[Item:${item.id}] Bottle should not be liquid`);
    if (item.isSourceProduct && item.isFinalProduct) warnings.push(`[Item:${item.id}] isSourceProduct and isFinalProduct are both true`);
    if (item.powerGenerationRaw !== undefined && typeof item.powerGenerationRaw !== 'string') warnings.push(`[Item:${item.id}] powerGenerationRaw must be string`);
  });

  const facilityIdSet = new Set(FACILITIES.map(facility => facility.id));
  const itemIdSet = new Set(itemList.map(item => item.id));

  FACILITIES.forEach(facility => {
    const validatePort = (port: { x: number; y: number }, portType: 'input' | 'output', idx: number) => {
      if (port.x < 0 || port.y < 0 || port.x >= facility.width || port.y >= facility.height) {
        errors.push(`[Facility:${facility.id}] ${portType} port #${idx} out of bounds`);
      }
    };
    facility.inputs.forEach((port, idx) => validatePort(port, 'input', idx));
    facility.outputs.forEach((port, idx) => validatePort(port, 'output', idx));
  });

  RECIPES.forEach(recipe => {
    if (!facilityIdSet.has(recipe.machineId)) errors.push(`[Recipe:${recipe.id}] Unknown facility id: ${recipe.machineId}`);
    if (!(recipe.durationSeconds > 0)) errors.push(`[Recipe:${recipe.id}] durationSeconds must be > 0`);
    if (recipe.inputs.length === 0) errors.push(`[Recipe:${recipe.id}] inputs must have at least 1 item`);
    if (recipe.outputs.length === 0) errors.push(`[Recipe:${recipe.id}] outputs must have at least 1 item`);
    recipe.inputs.forEach((item, idx) => {
      if (!itemIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] input #${idx} unknown item id: ${item.materialId}`);
      if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] input #${idx} amount must be > 0`);
    });
    recipe.outputs.forEach((item, idx) => {
      if (!itemIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] output #${idx} unknown item id: ${item.materialId}`);
      if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] output #${idx} amount must be > 0`);
    });
  });

  return { valid: errors.length === 0, errors, warnings };
};
