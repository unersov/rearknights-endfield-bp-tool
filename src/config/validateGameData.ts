import { MACHINES } from './machines';
import { MATERIALS } from './materials';
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
  const materialList = Object.values(MATERIALS);

  for (const id of collectDuplicateValues(materialList.map(m => m.id))) errors.push(`[Material] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(MACHINES.map(m => m.id))) errors.push(`[Machine] Duplicate id: ${id}`);
  for (const id of collectDuplicateValues(RECIPES.map(r => r.id))) errors.push(`[Recipe] Duplicate id: ${id}`);

  for (const name of collectDuplicateValues(materialList.map(m => m.nameZh ?? m.name).filter(Boolean))) warnings.push(`[Material] Duplicate Chinese name: ${name}`);
  for (const name of collectDuplicateValues(materialList.map(m => m.nameEn ?? '').filter(Boolean))) warnings.push(`[Material] Duplicate English name: ${name}`);

  const validItem = new Set(['natural_resource', 'gatherable', 'rare_material', 'aic_product', 'usable_item', 'functional_item', 'unknown']);
  const validStorage = new Set(['minerals', 'plants', 'products', 'gatherables', 'progression', 'usables', 'production', 'none', 'unknown']);
  const validRarity = new Set(['gray', 'green', 'blue', 'purple', 'gold', 'orange', 'unknown']);

  materialList.forEach(m => {
    if (!m.nameZh && !m.name) errors.push(`[Material:${m.id}] Missing Chinese name`);
    if (!m.nameEn) warnings.push(`[Material:${m.id}] Missing English name`);
    if (m.itemCategory && !validItem.has(m.itemCategory)) warnings.push(`[Material:${m.id}] Unknown itemCategory: ${m.itemCategory}`);
    if (m.storageCategory && !validStorage.has(m.storageCategory)) warnings.push(`[Material:${m.id}] Unknown storageCategory: ${m.storageCategory}`);
    if (m.rarity && !validRarity.has(m.rarity)) warnings.push(`[Material:${m.id}] Unknown rarity: ${m.rarity}`);
    if (m.state === 'solid' && (!m.storageCategory || m.storageCategory === 'unknown')) warnings.push(`[Material:${m.id}] Solid material has no storage category`);
    if (m.isBottle && m.state === 'liquid') warnings.push(`[Material:${m.id}] Bottle should not be liquid`);
    if (m.isSourceProduct && m.isFinalProduct) warnings.push(`[Material:${m.id}] isSourceProduct and isFinalProduct are both true`);
    if (m.powerGenerationRaw !== undefined && typeof m.powerGenerationRaw !== 'string') warnings.push(`[Material:${m.id}] powerGenerationRaw must be string`);
  });

  const machineIdSet = new Set(MACHINES.map(m => m.id));
  const materialIdSet = new Set(materialList.map(m => m.id));

  MACHINES.forEach(machine => {
    const validatePort = (port: { x: number; y: number }, portType: 'input' | 'output', idx: number) => {
      if (port.x < 0 || port.y < 0 || port.x >= machine.width || port.y >= machine.height) {
        errors.push(`[Machine:${machine.id}] ${portType} port #${idx} out of bounds`);
      }
    };
    machine.inputs.forEach((port, idx) => validatePort(port, 'input', idx));
    machine.outputs.forEach((port, idx) => validatePort(port, 'output', idx));
  });

  RECIPES.forEach(recipe => {
    if (!machineIdSet.has(recipe.machineId)) errors.push(`[Recipe:${recipe.id}] Unknown machineId: ${recipe.machineId}`);
    if (!(recipe.durationSeconds > 0)) errors.push(`[Recipe:${recipe.id}] durationSeconds must be > 0`);
    if (recipe.inputs.length === 0) errors.push(`[Recipe:${recipe.id}] inputs must have at least 1 item`);
    if (recipe.outputs.length === 0) errors.push(`[Recipe:${recipe.id}] outputs must have at least 1 item`);
    recipe.inputs.forEach((item, idx) => {
      if (!materialIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] input #${idx} unknown materialId: ${item.materialId}`);
      if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] input #${idx} amount must be > 0`);
    });
    recipe.outputs.forEach((item, idx) => {
      if (!materialIdSet.has(item.materialId)) errors.push(`[Recipe:${recipe.id}] output #${idx} unknown materialId: ${item.materialId}`);
      if (!(item.amount > 0)) errors.push(`[Recipe:${recipe.id}] output #${idx} amount must be > 0`);
    });
  });

  return { valid: errors.length === 0, errors, warnings };
};
